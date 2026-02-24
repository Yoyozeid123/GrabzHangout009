import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Keep original extension if possible, but standard multer dest is fine
const upload = multer({ dest: UPLOAD_DIR });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Serve static uploads
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get(api.messages.list.path, async (req, res) => {
    const msgs = await storage.getMessages();
    res.json(msgs);
  });

  app.post(api.messages.create.path, async (req, res) => {
    try {
      const input = api.messages.create.input.parse(req.body);
      const msg = await storage.createMessage(input);
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

  app.post(api.uploads.create.path, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Using multer's default generated filename which has no extension
    // The browser will typically sniff the MIME type based on content or we can serve it generally
    res.status(201).json({ filename: req.file.filename });
  });

  return httpServer;
}
