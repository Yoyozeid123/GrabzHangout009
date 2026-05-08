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
import { moderateMessage, isMuted, isGloballyBanned, isNsfwGifQuery } from "./moderation";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

const onlineUsers = new Map<WebSocket, { username: string; room: string; ip: string }>();
const rooms = new Map<string, { password?: string; created: Date; owner: string }>();
const MAX_ROOMS = 30;
const pinnedMessages = new Map<string, { id: number; username: string; content: string; pinnedBy: string }>();
const userStatuses = new Map<string, "online" | "afk" | "busy">();

// Initialize main room
rooms.set("main", { password: "GRABZZZ", created: new Date(), owner: "Yofez009" });
const typingUsers = new Map<string, Set<string>>(); // room -> Set<username>

// Cleanup uploads older than 24h every hour
setInterval(() => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const file of files) {
      const fp = path.join(UPLOAD_DIR, file);
      const stat = fs.statSync(fp);
      if (stat.mtimeMs < cutoff) fs.unlinkSync(fp);
    }
  } catch {}
}, 60 * 60 * 1000);

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

  wss.on("connection", (ws, req) => {
    let currentRoom = "main";
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "join" && msg.username) {
          currentRoom = msg.room || "main";

          // IP lock for admin account
          const ADMIN_IP = "83.233.185.102";
          if (msg.username.toLowerCase() === "yofez009" && clientIp !== ADMIN_IP) {
            ws.send(JSON.stringify({ type: "banned", message: "❌ Access denied: this account is IP-locked." }));
            ws.close();
            return;
          }
          
          // Check if user is banned before allowing join
          storage.isBanned(msg.username, currentRoom, clientIp).then(isBanned => {
            if (isBanned) {
              ws.send(JSON.stringify({ type: "banned", message: "You are banned from this room" }));
              ws.close();
              return;
            }
            
            onlineUsers.set(ws, { username: msg.username, room: currentRoom, ip: clientIp });
            broadcastToRoom(currentRoom, { 
              type: "userList", 
              users: getUsersInRoom(currentRoom),
              count: getUsersInRoom(currentRoom).length
            });
          });
        } else if (msg.type === "typing" && msg.username) {
          if (!typingUsers.has(currentRoom)) typingUsers.set(currentRoom, new Set());
          typingUsers.get(currentRoom)!.add(msg.username);
          broadcastToRoom(currentRoom, { type: "typing", users: Array.from(typingUsers.get(currentRoom)!) });
          
          setTimeout(() => {
            typingUsers.get(currentRoom)?.delete(msg.username);
            broadcastToRoom(currentRoom, { type: "typing", users: Array.from(typingUsers.get(currentRoom) || []) });
          }, 3000);
        } else if (msg.type === "stopTyping" && msg.username) {
          typingUsers.get(currentRoom)?.delete(msg.username);
          broadcastToRoom(currentRoom, { type: "typing", users: Array.from(typingUsers.get(currentRoom) || []) });
        } else if (msg.type === "confetti") {
          broadcastToRoom(currentRoom, { type: "confetti" });
        } else if (msg.type === "jumpscare") {
          if (msg.username?.toLowerCase() === "yofez009") {
            broadcastToRoom(currentRoom, { type: "jumpscare" });
          }
        } else if (msg.type === "game") {
          broadcastToRoom(currentRoom, { type: "game", data: msg.data });
        } else if (msg.type === "status" && msg.username) {
          userStatuses.set(msg.username, msg.status);
          broadcastToRoom(currentRoom, { type: "statusUpdate", username: msg.username, status: msg.status });
        } else if (msg.type === "dm" && msg.to && msg.username && msg.content) {
          // Send DM only to target user (all their connections)
          wss.clients.forEach(client => {
            const ud = onlineUsers.get(client);
            if (client.readyState === WebSocket.OPEN && ud?.username === msg.to) {
              client.send(JSON.stringify({ type: "dm", from: msg.username, content: msg.content }));
            }
          });
          // Echo back to sender
          ws.send(JSON.stringify({ type: "dm", from: msg.username, to: msg.to, content: msg.content, self: true }));
        } else if (msg.type === "challenge" && msg.to && msg.username) {
          wss.clients.forEach(client => {
            const ud = onlineUsers.get(client);
            if (client.readyState === WebSocket.OPEN && ud?.username === msg.to) {
              client.send(JSON.stringify({ type: "challenge", from: msg.username, game: msg.game || "pong" }));
            }
          });
        } else if (msg.type === "challenge-accept" && msg.to && msg.username) {
          wss.clients.forEach(client => {
            const ud = onlineUsers.get(client);
            if (client.readyState === WebSocket.OPEN && ud?.username === msg.to) {
              client.send(JSON.stringify({ type: "challenge-accept", from: msg.username }));
            }
          });
        } else if (msg.type === "challenge-decline" && msg.to && msg.username) {
          wss.clients.forEach(client => {
            const ud = onlineUsers.get(client);
            if (client.readyState === WebSocket.OPEN && ud?.username === msg.to) {
              client.send(JSON.stringify({ type: "challenge-decline", from: msg.username }));
            }
          });
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    });

    ws.on("close", () => {
      const userData = onlineUsers.get(ws);
      onlineUsers.delete(ws);
      if (userData) {
        typingUsers.delete(userData.username);
        const usersInRoom = getUsersInRoom(userData.room);
        broadcastToRoom(userData.room, { 
          type: "userList", 
          users: usersInRoom,
          count: usersInRoom.length
        });
        
        // Auto-delete empty rooms (except main)
        if (usersInRoom.length === 0 && userData.room !== "main") {
          rooms.delete(userData.room);
          console.log(`Auto-deleted empty room: ${userData.room}`);
        }
      }
    });
  });

  function getUsersInRoom(room: string): string[] {
    return Array.from(onlineUsers.values())
      .filter(u => u.room === room)
      .map(u => u.username);
  }

  function broadcastToRoom(room: string, data: any) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      const userData = onlineUsers.get(client);
      if (client.readyState === WebSocket.OPEN && userData?.room === room) {
        client.send(message);
      }
    });
  }

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
    const room = (req.query.room as string) || "main";
    const msgs = await storage.getMessages(room);
    res.json(msgs);
  });

  app.post(api.messages.create.path, async (req, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      
      if (input.type === "text" && containsNsfwKeywords(input.content)) {
        return res.status(400).json({ message: "Content blocked: Inappropriate language detected" });
      }
      
      // AI moderation — skip for admin
      if (input.type === "text" && input.username.toLowerCase() !== "yofez009") {
        const banned = await isGloballyBanned(input.username);
        if (banned.banned) {
          return res.status(403).json({ message: banned.permanent ? "You are permanently banned" : "You are temporarily banned" });
        }
        const muted = await isMuted(input.username);
        if (muted) {
          return res.status(403).json({ message: "You are muted for spamming" });
        }
        const modResult = await moderateMessage(input.username, input.content);
        if (modResult) {
          if (modResult.action === 'ban' || modResult.action === 'permaban') {
            wss.clients.forEach((client) => {
              const userData = onlineUsers.get(client);
              if (userData?.username === input.username) {
                client.send(JSON.stringify({ type: "banned", message: modResult.reason }));
                client.close();
                onlineUsers.delete(client);
              }
            });
          }
          return res.status(403).json({ message: modResult.reason });
        }
      }

      const msg = await storage.createMessage(input);
      broadcastToRoom(input.room || "main", { type: "newMessage", message: msg });
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

    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "grabzhangout_pfps",
        public_id: `pfp_${username}`,
        overwrite: true,
        transformation: [{ width: 128, height: 128, crop: "fill" }],
      });
      // Clean up temp file
      fs.unlink(req.file.path, () => {});
      const pfpUrl = result.secure_url;
      await storage.upsertUser(username, pfpUrl);
      res.status(201).json({ pfp: pfpUrl });
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
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

    if (isNsfwGifQuery(query)) {
      return res.status(400).json({ message: "Inappropriate GIF search blocked", data: [] });
    }

    const apiKey = process.env.TENOR_API_KEY || "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";
    
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=20&media_filter=gif`
      );
      const data = await response.json();
      
      // Convert Tenor format to match Giphy format
      const converted = {
        data: (data.results || []).map((gif: any, index: number) => ({
          id: gif.id || index,
          title: gif.content_description || "",
          images: {
            fixed_height: {
              url: gif.media_formats?.gif?.url || ""
            },
            fixed_height_small: {
              url: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || ""
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

  app.get("/api/rooms", (req, res) => {
    const roomList = Array.from(rooms.entries()).map(([name, data]) => ({
      name,
      hasPassword: !!data.password,
      userCount: getUsersInRoom(name).length,
      owner: data.owner
    }));
    res.json(roomList);
  });

  app.post("/api/rooms", (req, res) => {
    const { name, password, owner } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Room name required" });
    }
    if (rooms.has(name)) {
      return res.status(400).json({ message: "Room already exists" });
    }
    if (rooms.size >= MAX_ROOMS) {
      return res.status(400).json({ message: `Max ${MAX_ROOMS} rooms reached` });
    }
    rooms.set(name, { password, created: new Date(), owner: owner || "unknown" });
    res.json({ success: true, name });
  });

  app.post("/api/rooms/verify", (req, res) => {
    const { name, password } = req.body;
    const room = rooms.get(name);
    
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    
    if (room.password && room.password !== password) {
      return res.status(401).json({ message: "Wrong password" });
    }
    
    res.json({ success: true });
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

  app.post("/api/announce", (req, res) => {
    const { message, adminKey } = req.body;
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress;
    const ADMIN_IP = "83.233.185.102";
    // Must be admin IP AND correct key
    if (clientIp !== ADMIN_IP || (adminKey !== process.env.ADMIN_KEY && adminKey !== "GRABZZZ_ADMIN")) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    broadcast({ type: "announcement", message });
    res.json({ success: true });
  });

  // Pinned messages
  app.get("/api/rooms/:room/pin", (req, res) => {
    const pin = pinnedMessages.get(req.params.room);
    res.json(pin || null);
  });

  app.post("/api/rooms/:room/pin", (req, res) => {
    const { msgId, username, content, pinnedBy } = req.body;
    if (!msgId || !pinnedBy) return res.status(400).json({ message: "Missing fields" });
    pinnedMessages.set(req.params.room, { id: msgId, username, content, pinnedBy });
    broadcastToRoom(req.params.room, { type: "pinned", pin: pinnedMessages.get(req.params.room) });
    res.json({ success: true });
  });

  app.delete("/api/rooms/:room/pin", (req, res) => {
    pinnedMessages.delete(req.params.room);
    broadcastToRoom(req.params.room, { type: "pinned", pin: null });
    res.json({ success: true });
  });

  // User bio
  app.post("/api/users/:username/bio", async (req, res) => {
    const { bio } = req.body;
    if (typeof bio !== "string") return res.status(400).json({ message: "Bio required" });
    await storage.updateBio(req.params.username, bio.slice(0, 200));
    res.json({ success: true });
  });

  app.post("/api/game-broadcast", (req, res) => {
    broadcast({ type: "game", data: req.body });
    res.json({ success: true });
  });

  app.post("/api/jumpscare-global", (req, res) => {
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress;
    const { adminKey } = req.body;
    if (clientIp !== "83.233.185.102" || adminKey !== "GRABZZZ_ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    broadcast({ type: "jumpscare" });
    res.json({ success: true });
  });

  // Ban user from room
  app.post("/api/ban-user", async (req, res) => {
    try {
      const { username, room, bannedBy } = req.body;
      
      if (!username || !room || !bannedBy) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Find the user's IP address
      let userIp: string | undefined;
      wss.clients.forEach((client) => {
        const userData = onlineUsers.get(client);
        if (userData?.username === username && userData?.room === room) {
          userIp = userData.ip;
        }
      });

      await storage.banUser(username, room, bannedBy, userIp);
      
      // Kick the user from WebSocket
      wss.clients.forEach((client) => {
        const userData = onlineUsers.get(client);
        if (userData?.username === username && userData?.room === room) {
          client.send(JSON.stringify({ type: "banned", message: "You have been banned from this room" }));
          client.close();
          onlineUsers.delete(client);
        }
      });

      broadcastToRoom(room, { 
        type: "userList", 
        users: getUsersInRoom(room),
        count: getUsersInRoom(room).length
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to ban user" });
    }
  });

  // Check if user is banned
  app.get("/api/check-ban/:username/:room", async (req, res) => {
    const { username, room } = req.params;
    const isBanned = await storage.isBanned(username, room);
    res.json({ banned: isBanned });
  });

  // Unban user (admin only)
  app.post("/api/unban-user", async (req, res) => {
    try {
      const { username, room } = req.body;
      await storage.unbanUser(username, room);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to unban user" });
    }
  });

  // List all bans (admin only)
  app.get("/api/bans", async (req, res) => {
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress;
    if (clientIp !== "83.233.185.102") return res.status(403).json({ message: "Unauthorized" });
    const bans = await storage.getBans();
    res.json(bans);
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
