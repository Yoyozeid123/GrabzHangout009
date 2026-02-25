import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'text' | 'image' | 'gif' | 'voice'
  content: text("content").notNull(), // text content or image/gif/voice URL
  username: text("username").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  username: text("username").primaryKey(),
  pfp: text("pfp"), // profile picture URL
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
