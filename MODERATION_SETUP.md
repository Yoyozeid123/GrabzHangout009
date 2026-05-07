# Content Moderation & Delete Feature Setup (NO AWS REQUIRED!)

## What's New? 🎉

Your chat app now has:
1. **Simple keyword-based content filter** (blocks bad words - no AWS needed!)
2. **Delete buttons** for your own messages (hover to see them!)

## Features

### 🛡️ Content Moderation (Keyword Filter)
- Blocks messages containing inappropriate keywords
- Works instantly with no external services
- Completely free - no credit card needed
- You can customize the blocked words list

### 🗑️ Delete Messages
- Hover over your own messages to see the delete button
- Works for text, images, and GIFs
- Real-time deletion synced across all users

## Setup Instructions

### 1. Install Dependencies
```bash
cd GrabzHangout009/GrabzHangout009
npm install
```

### 2. Run the App
```bash
npm run dev
```

That's it! No AWS setup needed! 🎉

## How It Works

### Keyword Filter
The server checks text messages for these keywords:
- nsfw, porn, xxx, sex, nude, naked

If detected, the message is blocked with: "Content blocked: Inappropriate language detected"

### Customize Blocked Words
Edit `server/routes.ts` and modify this line:
```typescript
const nsfwKeywords = ['nsfw', 'porn', 'xxx', 'sex', 'nude', 'naked'];
```

Add or remove words as needed!

### Delete Flow
1. User clicks delete button (only visible on their own messages)
2. DELETE request sent to `/api/messages/:id`
3. Message removed from database
4. WebSocket broadcasts deletion to all users
5. UI updates in real-time

## Deploy to Render

Just push to GitHub:
```bash
git add .
git commit -m "Add content moderation and delete buttons"
git push origin main
```

**No environment variables needed!** Render will auto-deploy.

## Limitations

This simple filter:
- ✅ Blocks text with bad keywords
- ❌ Doesn't scan images/GIFs (would need AWS for that)
- ❌ Can be bypassed with creative spelling (like "s3x")

For your use case (blocking NSFW GIFs from friends), the **delete button** is probably more useful - just delete anything inappropriate when you see it!

## Files Modified

- `server/routes.ts` - Added keyword filter and delete endpoint
- `server/storage.ts` - Added deleteMessage method
- `shared/routes.ts` - Added delete route definition
- `client/src/pages/Home.tsx` - Added delete buttons
- `client/src/hooks/use-messages.ts` - Added useDeleteMessage hook
- `package.json` - No external dependencies needed!

Enjoy your safer chat - completely free! 🚀
