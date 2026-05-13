import { db } from "./db";
import { moderationActions, bannedUsers } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

const NSFW_GIF_KEYWORDS: string[] = [];

// In-memory spam tracker: username -> timestamps of recent messages
const spamTracker = new Map<string, number[]>();

export function isNsfwGifQuery(query: string): boolean {
  return false;
}

export function checkSpam(username: string): boolean {
  const now = Date.now();
  const times = (spamTracker.get(username) || []).filter(t => now - t < 5000);
  times.push(now);
  spamTracker.set(username, times);
  return times.length >= 5;
}

export async function isMuted(username: string): Promise<boolean> {
  const now = new Date();
  const [mute] = await db.select().from(moderationActions)
    .where(and(eq(moderationActions.username, username), eq(moderationActions.action, 'mute')))
    .orderBy(desc(moderationActions.createdAt))
    .limit(1);
  if (!mute) return false;
  return mute.expiresAt ? mute.expiresAt > now : false;
}

export async function isGloballyBanned(username: string): Promise<{ banned: boolean; permanent: boolean }> {
  const now = new Date();
  const [ban] = await db.select().from(moderationActions)
    .where(and(eq(moderationActions.username, username), eq(moderationActions.action, 'permaban')))
    .limit(1);
  if (ban) return { banned: true, permanent: true };

  const [tempban] = await db.select().from(moderationActions)
    .where(and(eq(moderationActions.username, username), eq(moderationActions.action, 'ban')))
    .orderBy(desc(moderationActions.createdAt))
    .limit(1);
  if (tempban && tempban.expiresAt && tempban.expiresAt > now) return { banned: true, permanent: false };

  return { banned: false, permanent: false };
}

export async function moderateMessage(username: string, content: string): Promise<
  null | { action: 'mute'; reason: string } | { action: 'ban'; reason: string } | { action: 'permaban'; reason: string }
> {
  // Only check spam
  if (checkSpam(username)) {
    const expiresAt = new Date(Date.now() + 60 * 1000);
    await db.insert(moderationActions).values({ username, action: 'mute', reason: 'Spamming', expiresAt });
    return { action: 'mute', reason: 'Spamming — muted for 1 minute' };
  }
  return null;
}
