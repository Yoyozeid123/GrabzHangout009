import { db } from "./db";
import { messages, users, bannedUsers, type InsertMessage, type Message, type User, type BannedUser } from "@shared/schema";
import { desc, eq, lt, sql, and } from "drizzle-orm";

export interface IStorage {
  getMessages(room?: string): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  deleteOldMessages(): Promise<number>;
  getUser(username: string): Promise<User | undefined>;
  upsertUser(username: string, pfp?: string): Promise<User>;
  banUser(username: string, room: string, bannedBy: string): Promise<BannedUser>;
  isBanned(username: string, room: string): Promise<boolean>;
  unbanUser(username: string, room: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(room: string = "main"): Promise<Message[]> {
    // Return last 50 messages for the room
    const msgs = await db.select().from(messages)
      .where(eq(messages.room, room))
      .orderBy(desc(messages.createdAt))
      .limit(50);
    return msgs.reverse();
  }

  async createMessage(insertMsg: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(insertMsg).returning();
    return msg;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async deleteOldMessages(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.delete(messages).where(lt(messages.createdAt, oneDayAgo));
    return result.rowCount || 0;
  }

  async getUser(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(username: string, pfp?: string): Promise<User> {
    const [user] = await db.insert(users)
      .values({ username, pfp })
      .onConflictDoUpdate({ target: users.username, set: { pfp } })
      .returning();
    return user;
  }

  async banUser(username: string, room: string, bannedBy: string): Promise<BannedUser> {
    const [ban] = await db.insert(bannedUsers)
      .values({ username, room, bannedBy })
      .returning();
    return ban;
  }

  async isBanned(username: string, room: string): Promise<boolean> {
    const [ban] = await db.select().from(bannedUsers)
      .where(and(eq(bannedUsers.username, username), eq(bannedUsers.room, room)));
    return !!ban;
  }

  async unbanUser(username: string, room: string): Promise<void> {
    await db.delete(bannedUsers)
      .where(and(eq(bannedUsers.username, username), eq(bannedUsers.room, room)));
  }
}

export const storage = new DatabaseStorage();
