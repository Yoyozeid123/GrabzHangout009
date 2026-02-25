import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage_multer = multer({ 
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
const upload = storage_multer.single("file");
const uploadVoice = storage_multer.single("voice");

const onlineUsers = new Map<WebSocket, string>();
const typingUsers = new Set<string>();

// Simple NSFW keyword filter (no AWS needed)
const nsfwKeywords = ['nsfw', 'porn', 'xxx', 'sex', 'nude', 'naked'];

function containsNsfwKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return nsfwKeywords.some(keyword => lower.includes(keyword));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // WebSocket setup
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/chat-ws'
  });

  wss.on("connection", (ws) => {
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "join" && msg.username) {
          onlineUsers.set(ws, msg.username);
          broadcast({ 
            type: "userList", 
            users: Array.from(onlineUsers.values()),
            count: onlineUsers.size 
          });
        } else if (msg.type === "typing" && msg.username) {
          typingUsers.add(msg.username);
          broadcast({ type: "typing", users: Array.from(typingUsers) });
          
          setTimeout(() => {
            typingUsers.delete(msg.username);
            broadcast({ type: "typing", users: Array.from(typingUsers) });
          }, 3000);
        } else if (msg.type === "stopTyping" && msg.username) {
          typingUsers.delete(msg.username);
          broadcast({ type: "typing", users: Array.from(typingUsers) });
        } else if (msg.type === "confetti") {
          broadcast({ type: "confetti" });
        } else if (msg.type === "jumpscare") {
          broadcast({ type: "jumpscare" });
        } else if (msg.type === "game") {
          broadcast({ type: "game", data: msg.data });
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });

    ws.on("close", () => {
      const username = onlineUsers.get(ws);
      onlineUsers.delete(ws);
      if (username) {
        typingUsers.delete(username);
      }
      broadcast({ 
        type: "userList", 
        users: Array.from(onlineUsers.values()),
        count: onlineUsers.size 
      });
    });
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get(api.messages.list.path, async (req, res) => {
    const msgs = await storage.getMessages();
    res.json(msgs);
  });

  app.post(api.messages.create.path, async (req, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      
      if (input.type === "text" && containsNsfwKeywords(input.content)) {
        return res.status(400).json({ message: "Content blocked: Inappropriate language detected" });
      }
      
      const msg = await storage.createMessage(input);
      broadcast({ type: "newMessage", message: msg });
      res.status(201).json(msg);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.uploads.create.path, storage_multer.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    res.status(201).json({ filename: req.file.filename });
  });

  app.post("/api/upload-voice", storage_multer.single("voice"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No voice file uploaded" });
    }
    
    res.status(201).json({ filename: req.file.filename });
  });

  app.post("/api/upload-pfp", storage_multer.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: "Username required" });
    }
    
    const pfpUrl = `/uploads/${req.file.filename}`;
    await storage.upsertUser(username, pfpUrl);
    
    res.status(201).json({ pfp: pfpUrl });
  });

  app.get("/api/users/:username", async (req, res) => {
    const user = await storage.getUser(req.params.username);
    res.json(user || { username: req.params.username, pfp: null });
  });

  app.get("/api/giphy/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: "Query required" });
    }

    const apiKey = process.env.TENOR_API_KEY || "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";
    
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=20&media_filter=gif`
      );
      const data = await response.json();
      
      // Convert Tenor format to match Giphy format
      const converted = {
        data: (data.results || []).map((gif: any) => ({
          images: {
            fixed_height: {
              url: gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || ""
            }
          }
        }))
      };
      res.json(converted);
    } catch (error) {
      console.error("Tenor API error:", error);
      res.status(500).json({ message: "Failed to fetch GIFs", data: [] });
    }
  });

  app.delete(api.messages.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMessage(id);
      broadcast({ type: "deleteMessage", id });
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.get("/api/messages/export", async (req, res) => {
    const msgs = await storage.getMessages();
    const text = msgs.map(m => 
      `[${m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A'}] ${m.username}: ${m.type === 'text' ? m.content : `[${m.type.toUpperCase()}] ${m.content}`}`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="chat-history-${new Date().toISOString().split('T')[0]}.txt"`);
    res.send(text);
  });

  app.post("/api/game-broadcast", (req, res) => {
    broadcast({ type: "game", data: req.body });
    res.json({ success: true });
  });

  // Auto-delete old messages every hour
  setInterval(async () => {
    const deleted = await storage.deleteOldMessages();
    if (deleted > 0) {
      console.log(`Auto-deleted ${deleted} messages older than 24 hours`);
    }
  }, 60 * 60 * 1000); // Run every hour

  return httpServer;
}
