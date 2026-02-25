import { db } from "./db";
import { messages, type InsertMessage, type Message } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
