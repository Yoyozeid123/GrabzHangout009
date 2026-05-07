import { db } from "./db";
import { moderationActions, bannedUsers } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

const BAD_WORDS = [
  'fuck','shit','ass','bitch','cunt','dick','pussy','cock','nigger','nigga',
  'faggot','fag','whore','slut','bastard','damn','hell','piss','retard','rape'
];

const NSFW_GIF_KEYWORDS = [
  'porn','nsfw','xxx','nude','naked','sex','hentai','boobs','penis','vagina'
];

// In-memory spam tracker: username -> timestamps of recent messages
const spamTracker = new Map<string, number[]>();

export function containsBadWords(text: string): boolean {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
}

export function isNsfwGifQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return NSFW_GIF_KEYWORDS.some(w => lower.includes(w));
}

export function checkSpam(username: string): boolean {
  const now = Date.now();
  const times = (spamTracker.get(username) || []).filter(t => now - t < 5000);
  times.push(now);
  spamTracker.set(username, times);
  return times.length >= 5;
}

export async function getStrikeCount(username: string): Promise<number> {
  const strikes = await db.select().from(moderationActions)
    .where(and(eq(moderationActions.username, username), eq(moderationActions.action, 'strike')));
  return strikes.length;
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

// Returns the action taken, or null if message is clean
export async function moderateMessage(username: string, content: string): Promise<
  null | { action: 'mute'; reason: string } | { action: 'ban'; reason: string } | { action: 'permaban'; reason: string }
> {
  // Check spam
  if (checkSpam(username)) {
    const expiresAt = new Date(Date.now() + 60 * 1000); // 1 minute
    await db.insert(moderationActions).values({ username, action: 'mute', reason: 'Spamming', expiresAt });
    return { action: 'mute', reason: 'Spamming — muted for 1 minute' };
  }

  // Check bad words
  if (containsBadWords(content)) {
    const strikes = await getStrikeCount(username);
    await db.insert(moderationActions).values({ username, action: 'strike', reason: 'Inappropriate language' });

    if (strikes + 1 >= 3) {
      await db.insert(moderationActions).values({ username, action: 'permaban', reason: '3 strikes — permanent ban', expiresAt: null });
      return { action: 'permaban', reason: 'You have been permanently banned for repeated violations' };
    } else {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
      await db.insert(moderationActions).values({ username, action: 'ban', reason: 'Inappropriate language', expiresAt });
      return { action: 'ban', reason: `Strike ${strikes + 1}/3 — banned for 24 hours for inappropriate language` };
    }
  }

  return null;
}
