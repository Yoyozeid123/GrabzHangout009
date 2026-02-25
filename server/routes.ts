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

const upload = multer({ dest: UPLOAD_DIR });

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

  app.post(api.uploads.create.path, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    res.status(201).json({ filename: req.file.filename });
  });

  app.get("/api/giphy/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: "Query required" });
    }

    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Giphy API key not configured" });
    }

    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch GIFs" });
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

  return httpServer;
}
