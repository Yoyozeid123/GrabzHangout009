# IP-Based Ban System

## Overview
The ban system now tracks and blocks users by both username AND IP address. When a user is banned, their IP address is captured and stored, preventing them from rejoining even if they change their username.

## Changes Made

### 1. Database Schema (`shared/schema.ts`)
- Added `ipAddress` field to `bannedUsers` table

### 2. Storage Layer (`server/storage.ts`)
- Updated `banUser()` to accept and store IP addresses
- Updated `isBanned()` to check both username and IP address
- Ban check now blocks if EITHER username OR IP matches

### 3. WebSocket Connection (`server/routes.ts`)
- Captures client IP from connection headers (`x-forwarded-for` or `remoteAddress`)
- Stores IP with each connected user
- Checks IP ban status on join attempts
- Captures and stores IP when banning users

### 4. Migration
- SQL migration file: `migrations/add_ip_to_banned_users.sql`
- Apply script: `apply-ip-ban-migration.sh`

## How It Works

1. **Connection**: When a user connects via WebSocket, their IP is extracted from request headers
2. **Join Check**: Before allowing room join, system checks if username OR IP is banned
3. **Banning**: When admin bans a user, their current IP is captured and stored
4. **Blocking**: Any future connection from that IP (regardless of username) is blocked

## Deployment

### Apply Migration
```bash
# Set your database URL
export DATABASE_URL="your_database_url"

# Run migration
./apply-ip-ban-migration.sh
```

### Or use drizzle-kit push
```bash
npm run db:push
```

This will automatically sync the schema changes.

## IP Detection Priority
1. `x-forwarded-for` header (for proxied/load-balanced connections)
2. `remoteAddress` from socket (direct connections)
3. Falls back to 'unknown' if neither available

## Notes
- Existing bans without IP addresses will still work (username-only bans)
- New bans will capture IP addresses automatically
- IP bans are room-specific (same as username bans)
- Works with reverse proxies and load balancers via `x-forwarded-for` header
