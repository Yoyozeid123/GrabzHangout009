import { db } from "./db";
import { messages, users, type InsertMessage, type Message, type User } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  getUser(username: string): Promise<User | undefined>;
  upsertUser(username: string, pfp?: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(): Promise<Message[]> {
    // Return last 50 messages
    const msgs = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(50);
    return msgs.reverse();
  }

  async createMessage(insertMsg: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(insertMsg).returning();
    return msg;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
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
}

export const storage = new DatabaseStorage();
