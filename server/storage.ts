import { db } from "./db";
import { messages, users, bannedUsers, type InsertMessage, type Message, type User, type BannedUser } from "@shared/schema";
import { desc, eq, lt, sql, and, gt } from "drizzle-orm";

export interface IStorage {
  getMessages(room?: string): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  deleteOldMessages(): Promise<number>;
  getUser(username: string): Promise<User | undefined>;
  upsertUser(username: string, pfp?: string): Promise<User>;
  updateBio(username: string, bio: string): Promise<void>;
  incrementMessageCount(username: string): Promise<void>;
  incrementRngCount(username: string): Promise<void>;
  getLeaderboard(): Promise<User[]>;
  banUser(username: string, room: string, bannedBy: string, ipAddress?: string): Promise<BannedUser>;
  isBanned(username: string, room: string, ipAddress?: string): Promise<boolean>;
  unbanUser(username: string, room: string): Promise<void>;
  getBans(): Promise<BannedUser[]>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(room: string = "main"): Promise<Message[]> {
    const msgs = await db.select().from(messages)
      .where(eq(messages.room, room))
      .orderBy(desc(messages.createdAt))
      .limit(20);
    return msgs.reverse();
  }

  async createMessage(insertMsg: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(insertMsg).returning();
    await this.incrementMessageCount(insertMsg.username);
    // Keep only last 20 messages per room
    const old = await db.select({ id: messages.id }).from(messages)
      .where(eq(messages.room, insertMsg.room || "main"))
      .orderBy(desc(messages.createdAt))
      .offset(20);
    if (old.length > 0) {
      for (const o of old) await db.delete(messages).where(eq(messages.id, o.id));
    }
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
      .values({ username, pfp, bio: "", messageCount: 0 })
      .onConflictDoUpdate({ target: users.username, set: pfp ? { pfp } : {} })
      .returning();
    return user;
  }

  async updateBio(username: string, bio: string): Promise<void> {
    await db.insert(users)
      .values({ username, bio, messageCount: 0 })
      .onConflictDoUpdate({ target: users.username, set: { bio } });
  }

  async incrementMessageCount(username: string): Promise<void> {
    await db.insert(users)
      .values({ username, messageCount: 1 })
      .onConflictDoUpdate({ target: users.username, set: { messageCount: sql`${users.messageCount} + 1` } });
  }

  async incrementRngCount(username: string): Promise<void> {
    await db.insert(users)
      .values({ username, rngCount: 1 })
      .onConflictDoUpdate({ target: users.username, set: { rngCount: sql`${users.rngCount} + 1` } });
  }

  async getLeaderboard(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.messageCount)).limit(10);
  }

  async banUser(username: string, room: string, bannedBy: string, ipAddress?: string): Promise<BannedUser> {
    const [ban] = await db.insert(bannedUsers)
      .values({ username, room, bannedBy, ipAddress })
      .returning();
    return ban;
  }

  async isBanned(username: string, room: string, ipAddress?: string): Promise<boolean> {
    const conditions = [eq(bannedUsers.room, room)];
    if (ipAddress) {
      conditions.push(sql`(${bannedUsers.username} = ${username} OR ${bannedUsers.ipAddress} = ${ipAddress})`);
    } else {
      conditions.push(eq(bannedUsers.username, username));
    }
    const [ban] = await db.select().from(bannedUsers).where(and(...conditions));
    return !!ban;
  }

  async unbanUser(username: string, room: string): Promise<void> {
    await db.delete(bannedUsers)
      .where(and(eq(bannedUsers.username, username), eq(bannedUsers.room, room)));
  }

  async getBans(): Promise<BannedUser[]> {
    return db.select().from(bannedUsers).orderBy(desc(bannedUsers.createdAt));
  }
}

export const storage = new DatabaseStorage();
