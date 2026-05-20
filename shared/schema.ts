import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'text' | 'image' | 'gif' | 'voice'
  content: text("content").notNull(), // text content or image/gif/voice URL
  username: text("username").notNull(),
  room: text("room").notNull().default("main"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  username: text("username").primaryKey(),
  pfp: text("pfp"),
  bio: text("bio").default(""),
  messageCount: integer("message_count").default(0),
  rngCount: integer("rng_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bannedUsers = pgTable("banned_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  room: text("room").notNull(),
  bannedBy: text("banned_by").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moderationActions = pgTable("moderation_actions", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  action: text("action").notNull(), // 'strike' | 'mute' | 'ban' | 'permaban'
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at"), // null = permanent
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
export const insertBannedUserSchema = createInsertSchema(bannedUsers).omit({ id: true, createdAt: true });

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type BannedUser = typeof bannedUsers.$inferSelect;
export type InsertBannedUser = z.infer<typeof insertBannedUserSchema>;
export type ModerationAction = typeof moderationActions.$inferSelect;
