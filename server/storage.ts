import { db } from "./db";
import { messages, type InsertMessage, type Message } from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
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
}

export const storage = new DatabaseStorage();
