# GrabzHangout009 - Complete Summary 🎮

## What We Built
A fully-featured retro 90s-style multiplayer chat website with rooms, games, and admin powers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Core Features

### 🎨 Retro 90s Aesthetic
- Neon green (#00ff00) and coral red (#ff6f61) colors
- Scanline effects, CRT styling
- Pixelated fonts and retro animations
- Background GIF with animated frogs and flames
- Animated frog favicon

### 💬 Chat System
- Real-time WebSocket messaging
- Text, images, GIFs (Tenor API), voice messages
- Auto-delete messages older than 24 hours
- Download chat history (💾)
- Typing indicators
- Profile pictures (localStorage + server sync)
- Styled voice message players with retro theme

### 🚪 Room System
- **Room Selection Screen** - Choose or create rooms on entry
- **Main Room** - Password: "Grabzfeetfeet" (never auto-deletes)
- **Custom Rooms** - Create with optional passwords
- **Room Ownership** - Creator becomes room admin
- **Auto-Delete** - Empty rooms (except main) delete automatically
- **Room Isolation** - Separate messages, users per room

### 👤 User System
- Username selection with profile pictures
- Admin account: "Yofez009" / "Yofez!123"
- Online user list (per room)
- Sign out functionality

### 🎬 Intro Sequence
- WARNING.mp4 video (click to skip)
- Zoom animation
- Fade-in to chatroom
- Welcome message with room name

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Admin & Permissions

### **Yofez009 (Super Admin)**
- ✅ Confetti (🎉)
- ✅ Room jumpscare (👻)
- ✅ Global jumpscare (💀) - scares ALL rooms
- ✅ Delete any message

### **Room Owners** (Room Creators)
- ✅ Confetti (🎉)
- ❌ No jumpscare powers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Technical Stack

### **Frontend**
- React + TypeScript
- TanStack Query
- Wouter (routing)
- Tailwind CSS
- WebSocket for real-time

### **Backend**
- Express.js
- Drizzle ORM + PostgreSQL
- WebSocket (ws library)
- Multer (file uploads)
- Room-based broadcasting

### **Key Files**
- client/src/pages/Home.tsx - Main chat UI
- client/src/hooks/use-websocket.ts - WebSocket with rooms
- server/routes.ts - API + WebSocket + room management
- server/storage.ts - Database operations
- shared/schema.ts - Messages + users tables with room field

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Database Schema

### **Messages Table**
- id, type, content, username, room, createdAt

### **Users Table**
- username, pfp, createdAt

### **Rooms (In-Memory)**
- name, password, owner, created date
- Auto-delete when empty (except main)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## API Endpoints
- GET /api/messages?room= - Get messages for room
- POST /api/messages - Send message
- DELETE /api/messages/:id - Delete message (admin)
- GET /api/rooms - List all rooms with user counts
- POST /api/rooms - Create new room
- POST /api/rooms/verify - Verify room password
- POST /api/jumpscare-global - Global jumpscare (Yofez009 only)
- GET /api/giphy/search - Search GIFs (Tenor)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## WebSocket Events
- join - Join room with username + room name
- typing / stopTyping - Typing indicators
- confetti - Confetti animation
- jumpscare - Jumpscare video
- newMessage / deleteMessage - Message updates
- userList - Online users in room

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Content Moderation
- Keyword filter (no AWS)
- Admin can delete any message
- Blocked words list in server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Deployment
- **Hosting**: Render
- **Size**: ~387 MB total (369 MB node_modules, 652 KB assets, 15 MB code)
- **Deployed Size**: ~2-5 MB (after build)
- **Videos**: WARNING.mp4 (447 KB), 360p-watermark.mp4 (194 KB)
- **Title**: Grabzhangout009
- **Favicon**: Animated frog GIF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Recent Changes (Session 2)

### UI Improvements
- ✅ Increased chat container height (reduced margins/padding)
- ✅ Changed website title to "Grabzhangout009"
- ✅ Changed favicon to animated frog GIF
- ✅ Styled voice messages with retro theme (green border, black bg, box shadow)

### Removed Features
- ❌ Snake game (completely removed due to control issues)
- ❌ Ban system (removed due to database deployment issues)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## What's Working
✅ Room system with passwords and ownership  
✅ Real-time chat with all features  
✅ Profile pictures with localStorage caching  
✅ Intro sequence with video  
✅ Admin and room owner permissions
✅ Optimized chat layout for more visible messages
✅ Retro-styled voice messages
✅ Animated frog favicon

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Next Steps

### 🎮 Stickfighter Game (In Progress)
- Platform fighter (like Smash Bros)
- Online multiplayer + AI bots
- Waiting for assets:
  - Stick figure sprites (idle, walk, jump, attack)
  - Weapon sprites
  - Stage background (optional)
  - Player colors

### Future Features (Ideas)
- Ban system (add back later with proper database migration)
- More games
- Custom emojis
- Sound effects
