import React, { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Send, TerminalSquare, Users, Smile, Trash2, Mic, MicOff, Settings, LogOut, Upload, Download, Gamepad2, Reply, X, Pin, MessageSquare, Maximize, Minimize, Swords, Trophy, Palette } from "lucide-react";
import { useMessages, useSendMessage, useUploadImage, useDeleteMessage } from "@/hooks/use-messages";
import { useWebSocket, type UserStatus } from "@/hooks/use-websocket";
import { RetroButton } from "@/components/RetroButton";
import { RetroInput } from "@/components/RetroInput";
import { GifPicker } from "@/components/GifPicker";

// Static Assets mapped via Vite aliases
import bgGif from "@assets/BG_1771938204124.gif";
import leftFrog from "@assets/frog-left_1771938204138.gif";
import rightFrog from "@assets/frog-right_1771938204140.gif";
import flames from "@assets/Grabzhangout009-flames_1771938204143.gif";

// Retro sound effects via Web Audio API
function playBeep(freq = 880, duration = 0.08, vol = 0.15) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function JumpscareVideo({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(err => {
        console.error("Video play error:", err);
        onClose();
      });
    }

    const timer = setTimeout(onClose, 5000);
    return () => {
      clearTimeout(timer);
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <video
        ref={videoRef}
        src="/360p-watermark.mp4"
        className="w-full h-full object-cover"
        playsInline
        onEnded={onClose}
        onError={onClose}
      />
    </div>
  );
}

function AdminAnnouncePanel() {
  const [answer, setAnswer] = React.useState("");
  const [unlocked, setUnlocked] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const check = () => {
    if (answer.trim().toUpperCase() === "APE INC") setUnlocked(true);
    else { alert("❌ WRONG ANSWER LMAOOO"); setAnswer(""); }
  };

  if (!unlocked) return (
    <div className="space-y-2">
      <RetroInput value={answer} onChange={e => setAnswer(e.target.value)} placeholder="> YOUR ANSWER..." onKeyDown={e => e.key === "Enter" && check()} />
      <RetroButton className="w-full" onClick={check}>VERIFY 🐒</RetroButton>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-green-400 text-xs">✅ VERIFIED. YOU MAY SPEAK.</p>
      <textarea
        className="w-full bg-black border-2 border-[#ff6f61] text-[#00ff00] p-2 text-sm resize-none"
        rows={2}
        placeholder="Type announcement..."
        value={msg}
        onChange={e => setMsg(e.target.value)}
      />
      <RetroButton
        className="w-full bg-[#ff6f61] text-black"
        onClick={async () => {
          if (!msg.trim()) return;
          await fetch("/api/announce", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg.trim(), adminKey: "APE INC" }),
          });
          setMsg("");
        }}
      >
        SEND TO ALL
      </RetroButton>
    </div>
  );
}

function BanList() {
  const [bans, setBans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/bans?adminKey=APE%20INC");
    const data = await res.json();
    setBans(data);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const unban = async (username: string, room: string) => {
    await fetch("/api/unban-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, room }),
    });
    load();
  };

  if (loading) return <div className="text-[#00ff00] text-sm">Loading...</div>;
  if (!bans.length) return <div className="text-[#00ff00] opacity-50 text-sm">No bans.</div>;

  return (
    <div className="max-h-40 overflow-y-auto retro-scrollbar space-y-1">
      {bans.map((ban, i) => (
        <div key={i} className="flex items-center justify-between border border-red-500 px-2 py-1 text-sm">
          <span className="text-red-400">{ban.username} <span className="text-[#00ff00] opacity-60">#{ban.room}</span></span>
          <button onClick={() => unban(ban.username, ban.room)} className="text-[#00ff00] hover:text-white text-xs underline ml-2">UNBAN</button>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [username, setUsername] = useState<string | null>(() => {
    const saved = localStorage.getItem("chatUsername");
    // If admin account is saved, force re-login every session
    if (saved?.toLowerCase() === "yofez009") {
      localStorage.removeItem("chatUsername");
      return null;
    }
    return saved;
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showJumpscare, setShowJumpscare] = useState(false);
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userPfps, setUserPfps] = useState<Record<string, string>>({});
  const [showProfile, setShowProfile] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [introStage, setIntroStage] = useState<'warning' | 'zoom' | 'done'>('warning');
  const [showWelcome, setShowWelcome] = useState(false);
  const [roomName, setRoomName] = useState<string>("");
  const [roomOwner, setRoomOwner] = useState<string>("");
  const [roomInput, setRoomInput] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomPasswords, setRoomPasswords] = useState<Record<string, string>>({});
  const [showRoomSelect, setShowRoomSelect] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<{ id: number; username: string; content: string } | null>(null);
  const [reactions, setReactions] = useState<Record<number, Record<string, string[]>>>({});
  const [activeReactionMsg, setActiveReactionMsg] = useState<number | null>(null);
  const [announceText, setAnnounceText] = useState("");
  const [myStatus, setMyStatus] = useState<UserStatus>("online");
  const [showDMs, setShowDMs] = useState(false);
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [dmText, setDmText] = useState("");
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
  const [viewedUserData, setViewedUserData] = useState<any>(null);
  const [bioInput, setBioInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("chatTheme") || "green");

  const THEMES: Record<string, { primary: string; accent: string; bg: string; label: string; emoji: string }> = {
    green:    { primary: "#00ff41", accent: "#ff6f61", bg: "#0a0a0a", label: "Matrix",    emoji: "🟢" },
    purple:   { primary: "#c084fc", accent: "#f472b6", bg: "#0d0010", label: "Synthwave", emoji: "🟣" },
    amber:    { primary: "#fbbf24", accent: "#f97316", bg: "#0c0800", label: "Amber",     emoji: "🟡" },
    ice:      { primary: "#67e8f9", accent: "#818cf8", bg: "#00080f", label: "Ice",       emoji: "🔵" },
    blood:    { primary: "#f87171", accent: "#fb923c", bg: "#0f0000", label: "Blood",     emoji: "🔴" },
  };
  const T = THEMES[theme] || THEMES.green;

  const applyTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem("chatTheme", t);
    setShowThemePicker(false);
  };
  const REACTION_EMOJIS = ["🔥", "💀", "😂", "❤️", "👍", "😮"];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const warningVideoRef = useRef<HTMLVideoElement>(null);

  // Check for new deployment and show refresh banner
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  useEffect(() => {
    const currentVersion = "v1.0.3";
    const savedVersion = localStorage.getItem("appVersion");
    if (savedVersion && savedVersion !== currentVersion) {
      setShowUpdateBanner(true);
    }
    // Clear old pfps on version change
    if (savedVersion !== currentVersion) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("pfp_")) localStorage.removeItem(key);
      });
      localStorage.setItem("appVersion", currentVersion);
    }
  }, []);
  
  const { data: messages = [], isLoading } = useMessages(roomName);
  const sendMessage = useSendMessage(roomName);
  const uploadImage = useUploadImage();
  const deleteMessage = useDeleteMessage();
  const { onlineCount, onlineUsers, typingUsers, sendTyping, broadcastConfetti, broadcastJumpscare, broadcastGame, confettiTrigger, jumpscareTrigger, gameData: wsGameData, announcement, setAnnouncement, userStatuses, sendStatus, dms, sendDM, incomingChallenge, challengeAccepted, setChallengeAccepted, sendChallenge, acceptChallenge, declineChallenge, pinnedMsg, setPinnedMsg } = useWebSocket(username, roomName);

  const isAdmin = username?.toLowerCase() === "yofez009";
  const isRoomOwner = username === roomOwner;

  // Fetch pinned message when joining room
  useEffect(() => {
    if (!roomName) return;
    fetch(`/api/rooms/${roomName}/pin`).then(r => r.json()).then(pin => setPinnedMsg(pin));
  }, [roomName]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // View another user's profile
  const handleViewProfile = async (user: string) => {
    const res = await fetch(`/api/users/${user}`);
    const data = await res.json();
    setViewedUserData(data);
    setShowUserProfile(user);
  };

  useEffect(() => {
    if (confettiTrigger > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [confettiTrigger]);

  useEffect(() => {
    if (jumpscareTrigger > 0) {
      setShowJumpscare(true);
    }
  }, [jumpscareTrigger]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  // Mention notifications
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (!username || messages.length <= prevMsgCount.current) {
      prevMsgCount.current = messages.length;
      return;
    }
    const newMsgs = messages.slice(prevMsgCount.current);
    prevMsgCount.current = messages.length;
    for (const msg of newMsgs) {
      if (msg.username !== username && msg.content?.toLowerCase().includes(`@${username.toLowerCase()}`)) {
        playBeep(1320, 0.15, 0.3);
        if (Notification.permission === "granted") {
          new Notification(`📣 ${msg.username} mentioned you`, { body: msg.content.slice(0, 80) });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => {
            if (p === "granted") new Notification(`📣 ${msg.username} mentioned you`, { body: msg.content.slice(0, 80) });
          });
        }
      }
    }
  }, [messages, username]);

  useEffect(() => {
    const fetchPfps = async () => {
      const uniqueUsers = [...new Set(messages.map(m => m.username))].filter(u => !userPfps[u]);
      await Promise.all(uniqueUsers.map(async user => {
        const res = await fetch(`/api/users/${user}`);
        const data = await res.json();
        if (data.pfp) setUserPfps(prev => ({ ...prev, [user]: data.pfp }));
      }));
    };
    fetchPfps();
  }, [messages]);

  useEffect(() => {
    // Load own pfp from localStorage on mount
    if (username) {
      const savedPfp = localStorage.getItem(`pfp_${username}`);
      if (savedPfp) {
        setUserPfps(prev => ({ ...prev, [username]: savedPfp }));
      } else {
        // Fetch from server
        fetch(`/api/users/${username}`)
          .then(res => res.json())
          .then(data => {
            if (data.pfp) {
              setUserPfps(prev => ({ ...prev, [username]: data.pfp }));
              localStorage.setItem(`pfp_${username}`, data.pfp);
            }
          });
      }
    }
  }, [username]);

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    const name = usernameInput.trim();
    
    if (name.toLowerCase() === "yofez009") {
      if (passwordInput !== "Yofez!123") {
        alert("❌ Wrong password for Yofez009!");
        return;
      }
      const secret = prompt("🐒 yo what's the greatest company to ever exist on this planet fr fr no cap??");
      if (secret?.trim().toUpperCase() !== "APE INC") {
        alert("❌ WRONG ANSWER LMAOOO");
        return;
      }
    }
    
    setUsername(name);
    localStorage.setItem("chatUsername", name);
  };

  const handleJoinRoom = async (room: string, password?: string, owner?: string) => {
    // Check if user is banned first
    const banCheck = await fetch(`/api/check-ban/${username}/${room}`);
    const banData = await banCheck.json();
    
    if (banData.banned) {
      alert(`❌ You are banned from ${room}`);
      return;
    }

    // Verify password
    const res = await fetch('/api/rooms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: room, password })
    });
    
    if (!res.ok) {
      alert("❌ Wrong password or room not found!");
      return;
    }
    
    setRoomName(room);
    setRoomOwner(owner || "");
    setShowRoomSelect(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    
    const room = roomInput.trim();
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: room, password: roomPassword || undefined, owner: username })
    });
    
    if (!res.ok) {
      alert("❌ Room already exists!");
      return;
    }
    
    setRoomName(room);
    setRoomOwner(username || "");
    setShowRoomSelect(false);
    setShowCreateRoom(false);
  };

  useEffect(() => {
    if (showRoomSelect) {
      fetch('/api/rooms')
        .then(res => res.json())
        .then(data => setAvailableRooms(data))
        .catch(err => console.error("Failed to fetch rooms:", err));
    }
  }, [showRoomSelect]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sendMessage.isPending || !username) return;
    playBeep(660, 0.06);
    const content = replyTo ? `↩ @${replyTo.username}: "${replyTo.content.slice(0, 40)}"  ${text.trim()}` : text.trim();
    sendMessage.mutate({ type: "text", content, username }, {
      onSuccess: () => { setText(""); setReplyTo(null); }
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    sendTyping();
  };

  const handleBanUser = async (userToBan: string) => {
    if (!confirm(`Ban ${userToBan} from this room permanently?`)) return;
    
    try {
      const response = await fetch('/api/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: userToBan, 
          room: roomName, 
          bannedBy: username 
        })
      });
      
      if (response.ok) {
        alert(`${userToBan} has been banned from ${roomName}`);
      } else {
        alert('Failed to ban user');
      }
    } catch (error) {
      console.error('Ban error:', error);
      alert('Failed to ban user');
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    if (!username) return;
    playBeep(880, 0.06);
    sendMessage.mutate({ type: "gif", content: gifUrl, username });
  };

  const triggerConfetti = () => {
    broadcastConfetti();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const triggerJumpscare = () => {
    broadcastJumpscare();
    setShowJumpscare(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !username) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    uploadImage.mutate(file, {
      onSuccess: (data) => {
        sendMessage.mutate({ 
          type: "image", 
          content: `/uploads/${data.filename}`,
          username
        });
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('voice', audioBlob, 'voice.webm');

        const res = await fetch('/api/upload-voice', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          sendMessage.mutate({
            type: 'voice',
            content: `/uploads/${data.filename}`,
            username: username!
          });
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !username) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);

    const res = await fetch('/api/upload-pfp', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setUserPfps(prev => ({ ...prev, [username]: data.pfp }));
      localStorage.setItem(`pfp_${username}`, data.pfp);
      alert('✅ Profile picture updated!');
    }
  };

  const handleUsernameChange = () => {
    if (!newUsername.trim()) return;
    
    const name = newUsername.trim();
    
    if (name.toLowerCase() === "yofez009") {
      alert("❌ Cannot change to admin username!");
      return;
    }
    
    setUsername(name);
    localStorage.setItem("chatUsername", name);
    setShowProfile(false);
    setNewUsername("");
    alert('✅ Username changed! Refresh to see changes.');
  };

  const handleSignOut = () => {
    if (username) {
      localStorage.removeItem(`pfp_${username}`);
    }
    localStorage.removeItem("chatUsername");
    setUsername(null);
    setShowProfile(false);
  };

  const handleDownloadHistory = () => {
    window.location.href = '/api/messages/export';
  };

  const handleOpenLeaderboard = async () => {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    setLeaderboard(data);
    setShowLeaderboard(true);
  };

  const handleReact = (msgId: number, emoji: string) => {
    if (!username) return;
    playBeep(1100, 0.05);
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const users = msgReactions[emoji] ? [...msgReactions[emoji]] : [];
      const idx = users.indexOf(username);
      if (idx >= 0) users.splice(idx, 1); else users.push(username);
      if (users.length === 0) delete msgReactions[emoji]; else msgReactions[emoji] = users;
      return { ...prev, [msgId]: msgReactions };
    });
    setActiveReactionMsg(null);
  };

  const handlePinMessage = async (msg: any) => {
    if (!isAdmin && !isRoomOwner) return;
    await fetch(`/api/rooms/${roomName}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgId: msg.id, username: msg.username, content: msg.content, pinnedBy: username }),
    });
  };

  const handleUnpin = async () => {
    await fetch(`/api/rooms/${roomName}/pin`, { method: "DELETE" });
  };

  const handleSaveBio = async () => {
    if (!username) return;
    await fetch(`/api/users/${username}/bio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: bioInput }),
    });
    alert("✅ Bio saved!");
  };

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim() || !dmTarget) return;
    sendDM(dmTarget, dmText.trim());
    setDmText("");
  };

  const handleStatusChange = (status: UserStatus) => {
    setMyStatus(status);
    sendStatus(status);
  };

  const handleWarningEnd = () => {
    setIntroStage('zoom');
    setTimeout(() => {
      setIntroStage('done');
      setShowIntro(false);
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
    }, 4000);
  };

  useEffect(() => {
    if (username) {
      setShowIntro(true);
      setIntroStage('warning');
    }
  }, [username]);

  useEffect(() => {
    if (introStage === 'warning' && warningVideoRef.current) {
      warningVideoRef.current.play().catch(err => {
        console.error("Video autoplay failed:", err);
      });
    }
  }, [introStage]);

  if (showRoomSelect) {
    return (
      <div 
        className="min-h-screen w-full relative overflow-hidden flex items-center justify-center"
        style={{ backgroundImage: `url(${bgGif})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 scanlines z-50 pointer-events-none mix-blend-overlay"></div>
        
        <div className="z-20 bg-black/90 border-4 border-[#00ff00] box-shadow-retro p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <img 
              src={flames} 
              alt="Grabzhangout009" 
              className="h-20 object-contain drop-shadow-[0_0_10px_#ff6f61] mx-auto mb-4" 
            />
            <h1 className="text-2xl text-[#00ff00] text-shadow-neon mb-2">SELECT CHATROOM</h1>
            <p className="text-[#00ff00] opacity-70">Join or create a room</p>
          </div>

          {!showCreateRoom ? (
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto retro-scrollbar space-y-2">
                {availableRooms.map(room => (
                  <div key={room.name} className="bg-black border-2 border-[#00ff00] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#00ff00] font-bold">{room.name.toUpperCase()}</span>
                      <span className="text-[#00ff00] text-sm">👥 {room.userCount}</span>
                    </div>
                    {room.hasPassword && (
                      <RetroInput
                        type="password"
                        placeholder="> PASSWORD..."
                        value={roomPasswords[room.name] || ""}
                        onChange={(e) => setRoomPasswords(prev => ({ ...prev, [room.name]: e.target.value }))}
                        className="mb-2"
                      />
                    )}
                    <RetroButton 
                      onClick={() => handleJoinRoom(room.name, roomPasswords[room.name], room.owner)}
                      className="w-full"
                    >
                      JOIN {room.hasPassword ? '🔒' : ''}
                    </RetroButton>
                  </div>
                ))}
              </div>

              <div className="text-center text-[#00ff00] opacity-70">- OR -</div>

              <RetroButton 
                onClick={() => setShowCreateRoom(true)}
                variant="secondary"
                className="w-full"
              >
                CREATE NEW ROOM
              </RetroButton>
            </div>
          ) : (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <RetroInput
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="> ROOM NAME..."
                maxLength={30}
                autoFocus
              />
              <RetroInput
                value={roomPassword}
                type="password"
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="> PASSWORD (optional)..."
                maxLength={50}
              />
              <div className="flex gap-2">
                <RetroButton 
                  type="submit" 
                  disabled={!roomInput.trim()}
                  className="flex-1"
                >
                  CREATE ROOM
                </RetroButton>
                <RetroButton 
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  BACK
                </RetroButton>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!username) {
    return (
      <div 
        className="min-h-screen w-full relative overflow-hidden flex items-center justify-center"
        style={{ backgroundImage: `url(${bgGif})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 scanlines z-50 pointer-events-none mix-blend-overlay"></div>
        
        <div className="z-20 bg-black/90 border-4 border-[#00ff00] box-shadow-retro p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <img 
              src={flames} 
              alt="Grabzhangout009" 
              className="h-20 object-contain drop-shadow-[0_0_10px_#ff6f61] mx-auto mb-4" 
            />
            <h1 className="text-2xl text-[#00ff00] text-shadow-neon mb-2">ENTER USERNAME</h1>
            <p className="text-[#00ff00] opacity-70">Choose your identity for the chatroom</p>
          </div>
          
          <form onSubmit={handleSetUsername} className="space-y-4">
            <RetroInput
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="> TYPE USERNAME..."
              maxLength={20}
              autoFocus
            />
            {usernameInput.toLowerCase() === "yofez009" && (
              <RetroInput
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="> ENTER PASSWORD..."
                maxLength={50}
              />
            )}
            <RetroButton 
              type="submit" 
              disabled={!usernameInput.trim()}
              className="w-full"
            >
              ENTER CHATROOM
            </RetroButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen w-full relative overflow-hidden flex flex-col items-center selection:bg-[#ff6f61] selection:text-black ${!showIntro && introStage === 'done' ? 'animate-fade-in' : ''}`}
      style={{ backgroundImage: `url(${bgGif})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 scanlines z-50 pointer-events-none mix-blend-overlay"></div>

      {announcement && (
        <div className="fixed top-0 left-0 right-0 z-[500] bg-red-500 text-white text-center py-2 font-bold text-sm flex items-center justify-center gap-4">
          📢 {announcement}
          <button onClick={() => setAnnouncement(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {showUpdateBanner && !announcement && (
        <div className="fixed top-0 left-0 right-0 z-[500] bg-yellow-400 text-black text-center py-2 font-bold text-sm flex items-center justify-center gap-4">
          🔔 Site updated! Please refresh the page for the latest version.
          <button onClick={() => window.location.reload()} className="bg-black text-yellow-400 px-3 py-1 rounded text-xs font-bold">Refresh now</button>
          <button onClick={() => setShowUpdateBanner(false)} className="text-black underline text-xs">Dismiss</button>
        </div>
      )}

      {showIntro && introStage === 'warning' && (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
          <video
            ref={warningVideoRef}
            src="/WARNING.mp4"
            className="w-full h-full object-cover cursor-pointer"
            playsInline
            autoPlay
            muted
            onEnded={handleWarningEnd}
            onClick={(e) => {
              const video = e.currentTarget;
              if (video.paused) {
                video.play();
              } else {
                handleWarningEnd();
              }
            }}
            onError={() => {
              console.error("Video failed to load");
              handleWarningEnd();
            }}
          />
          <div className="absolute bottom-4 right-4 text-[#00ff00] text-xl bg-black/80 px-4 py-2 border-2 border-[#00ff00] animate-pulse pointer-events-none">
            CLICK TO SKIP →
          </div>
        </div>
      )}

      {showIntro && introStage === 'zoom' && (
        <div className="fixed inset-0 z-[300] bg-black overflow-hidden">
          <div 
            className="w-full h-full"
            style={{ 
              backgroundImage: `url(${bgGif})`, 
              backgroundSize: "cover", 
              backgroundPosition: "center",
              animation: "fadeInZoom 4s ease-out forwards"
            }}
          />
        </div>
      )}

      {showWelcome && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-fade-in-down">
          <div className="bg-black/90 border-4 border-[#00ff00] box-shadow-retro px-6 py-3">
            <p className="text-[#00ff00] text-2xl text-shadow-neon text-center">
              ✨ WELCOME TO ROOM: {roomName.toUpperCase()}, {username?.toUpperCase()}! ✨
            </p>
          </div>
        </div>
      )}

      {showConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span className="text-4xl">
                {['🎉', '✨', '🎊', '⭐', '💫'][Math.floor(Math.random() * 5)]}
              </span>
            </div>
          ))}
        </div>
      )}

      {showJumpscare && (
        <JumpscareVideo onClose={() => setShowJumpscare(false)} />
      )}

      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Incoming challenge popup */}
      {incomingChallenge && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-black border-4 border-[#ff6f61] box-shadow-retro p-4 text-center">
          <p className="text-[#ff6f61] text-xl mb-3"><Swords className="inline w-5 h-5 mr-1" />{incomingChallenge.from} challenges you to {incomingChallenge.game.toUpperCase()}!</p>
          <div className="flex gap-2 justify-center">
            <RetroButton onClick={() => acceptChallenge(incomingChallenge.from)}>ACCEPT ⚔️</RetroButton>
            <RetroButton variant="secondary" onClick={() => declineChallenge(incomingChallenge.from)}>DECLINE</RetroButton>
          </div>
        </div>
      )}

      {/* Challenge accepted notification */}
      {challengeAccepted && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-black border-4 border-[#00ff00] box-shadow-retro p-4 text-center">
          <p className="text-[#00ff00] text-xl mb-2">⚔️ {challengeAccepted} accepted your challenge!</p>
          <RetroButton onClick={() => setChallengeAccepted(null)}>OK</RetroButton>
        </div>
      )}

      {/* DM Panel */}
      {showDMs && (
        <div className="fixed inset-y-0 right-0 z-[150] w-full max-w-sm bg-black border-l-4 border-[#00ff00] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="bg-[#00ff00] text-black px-3 py-2 flex items-center justify-between font-bold">
            <span>💬 DIRECT MESSAGES</span>
            <button onClick={() => setShowDMs(false)}><X className="w-5 h-5" /></button>
          </div>
          {/* User list to DM */}
          {!dmTarget ? (
            <div className="flex-1 overflow-y-auto retro-scrollbar p-3 space-y-2">
              <p className="text-[#00ff00] opacity-70 text-sm mb-2">Select a user to message:</p>
              {onlineUsers.filter(u => u !== username).map(u => (
                <button key={u} onClick={() => setDmTarget(u)} className="w-full text-left text-[#00ff00] border border-[#00ff00] px-3 py-2 hover:bg-[#00ff00] hover:text-black transition-colors flex items-center gap-2">
                  <span className={`text-xs ${userStatuses[u] === 'busy' ? 'text-red-400' : userStatuses[u] === 'afk' ? 'text-yellow-400' : 'text-green-400'}`}>●</span>
                  {u}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#00ff00]">
                <button onClick={() => setDmTarget(null)} className="text-[#ff6f61]"><X className="w-4 h-4" /></button>
                <span className="text-[#00ff00] font-bold">@{dmTarget}</span>
              </div>
              <div className="flex-1 overflow-y-auto retro-scrollbar p-3 space-y-2">
                {dms.filter(d => d.from === dmTarget || (d.self && d.to === dmTarget)).map((d, i) => (
                  <div key={i} className={`text-sm ${d.self ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block px-2 py-1 border ${d.self ? 'border-[#ff6f61] text-[#ff6f61]' : 'border-[#00ff00] text-[#00ff00]'}`}>
                      {d.content}
                    </span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendDM} className="flex gap-2 p-2 border-t border-[#00ff00]">
                <RetroInput value={dmText} onChange={e => setDmText(e.target.value)} placeholder="> MESSAGE..." className="flex-1" />
                <RetroButton type="submit" disabled={!dmText.trim()}><Send className="w-4 h-4" /></RetroButton>
              </form>
            </div>
          )}
        </div>
      )}

      {/* User profile viewer */}
      {showUserProfile && viewedUserData && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowUserProfile(null)}>
          <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-[#00ff00]">{showUserProfile.toUpperCase()}</h2>
              <button onClick={() => setShowUserProfile(null)} className="text-[#ff6f61]"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-center mb-4">
              {viewedUserData.pfp ? (
                <img src={viewedUserData.pfp} className="w-20 h-20 rounded-full border-4 border-[#00ff00] mx-auto" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-[#00ff00] bg-black mx-auto flex items-center justify-center text-3xl">👤</div>
              )}
              <div className="mt-2">
                <span className={`text-sm ${userStatuses[showUserProfile] === 'busy' ? 'text-red-400' : userStatuses[showUserProfile] === 'afk' ? 'text-yellow-400' : 'text-green-400'}`}>
                  ● {(userStatuses[showUserProfile] || 'online').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-[#00ff00]">
              <div className="border border-[#00ff00] p-2">
                <p className="text-xs opacity-70 mb-1">BIO</p>
                <p>{viewedUserData.bio || "No bio set."}</p>
              </div>
              <div className="border border-[#00ff00] p-2 flex justify-between">
                <span className="text-xs opacity-70">MESSAGES SENT</span>
                <span className="font-bold">{viewedUserData.messageCount || 0}</span>
              </div>
              {showUserProfile !== username && (
                <div className="flex gap-2">
                  <RetroButton className="flex-1" onClick={() => { setDmTarget(showUserProfile); setShowDMs(true); setShowUserProfile(null); }}>
                    <MessageSquare className="w-4 h-4 inline mr-1" />DM
                  </RetroButton>
                  <RetroButton variant="secondary" className="flex-1" onClick={() => { sendChallenge(showUserProfile!); setShowUserProfile(null); }}>
                    <Swords className="w-4 h-4 inline mr-1" />CHALLENGE
                  </RetroButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-2 md:p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-4 md:p-6 max-w-md w-full max-h-[95vh] md:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-2xl text-[#00ff00] text-shadow-neon">PROFILE SETTINGS</h2>
              <button onClick={() => setShowProfile(false)} className="text-[#ff6f61] text-2xl">✕</button>
            </div>

            <div className="space-y-4 overflow-y-auto retro-scrollbar flex-1 pr-1">
              {/* Profile Picture */}
              <div className="text-center">
                {userPfps[username!] ? (
                  <img src={userPfps[username!]} alt="Profile" className="w-24 h-24 rounded-full border-4 border-[#00ff00] mx-auto mb-2" />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-[#00ff00] bg-black mx-auto mb-2 flex items-center justify-center text-4xl">
                    👤
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={pfpInputRef} 
                  onChange={handlePfpUpload}
                />
                <RetroButton onClick={() => pfpInputRef.current?.click()} className="w-full">
                  <Upload className="w-4 h-4 inline mr-2" />
                  CHANGE PROFILE PICTURE
                </RetroButton>
              </div>

              {/* Current Username */}
              <div>
                <label className="text-[#00ff00] block mb-2">CURRENT USERNAME:</label>
                <div className="bg-black border-2 border-[#00ff00] p-2 text-[#00ff00]">
                  {username}
                </div>
              </div>

              {/* Change Username */}
              <div>
                <label className="text-[#00ff00] block mb-2">NEW USERNAME:</label>
                <RetroInput
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="> TYPE NEW USERNAME..."
                  maxLength={20}
                />
                <RetroButton onClick={handleUsernameChange} disabled={!newUsername.trim()} className="w-full mt-2">
                  UPDATE USERNAME
                </RetroButton>
              </div>

              {/* Bio */}
              <div>
                <label className="text-[#00ff00] block mb-2">BIO (max 200 chars):</label>
                <textarea
                  className="w-full bg-black border-2 border-[#00ff00] text-[#00ff00] p-2 text-sm resize-none"
                  rows={2}
                  maxLength={200}
                  placeholder="Tell people about yourself..."
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                />
                <RetroButton onClick={handleSaveBio} className="w-full mt-1">SAVE BIO</RetroButton>
              </div>

              {/* Status */}
              <div>
                <label className="text-[#00ff00] block mb-2">STATUS:</label>
                <div className="flex gap-2">
                  {(["online","afk","busy"] as UserStatus[]).map(s => (
                    <RetroButton key={s} onClick={() => handleStatusChange(s)} className={`flex-1 text-xs ${myStatus === s ? 'bg-[#00ff00] text-black' : ''}`}>
                      {s === 'online' ? '🟢' : s === 'afk' ? '🌙' : '🔴'} {s.toUpperCase()}
                    </RetroButton>
                  ))}
                </div>
              </div>

              {/* Sign Out */}
              <RetroButton onClick={handleSignOut} variant="secondary" className="w-full text-[#ff6f61]">
                <LogOut className="w-4 h-4 inline mr-2" />
                SIGN OUT
              </RetroButton>

              {/* Admin Announce */}
              {isAdmin && (
                <div className="border-t-2 border-[#00ff00] pt-4">
                  <label className="text-[#ff6f61] block mb-2 font-bold">📢 GLOBAL ANNOUNCEMENT:</label>
                  <p className="text-[#00ff00] text-xs mb-2 opacity-70">🐒 yo what's the greatest company to ever exist on this planet fr fr no cap??</p>
                  <RetroInput
                    placeholder="> TYPE THE ANSWER..."
                    value={announceText.startsWith("__verified__") ? "" : ""}
                    onChange={() => {}}
                    className="hidden"
                  />
                  <AdminAnnouncePanel />

                  {/* Ban list */}
                  <div className="mt-4">
                    <label className="text-[#ff6f61] block mb-2 font-bold">🚫 BAN LIST:</label>
                    <BanList />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto h-screen flex flex-col md:flex-row gap-4 p-2 md:p-4 z-20 pb-20 md:pb-4">
        
        {/* User List Sidebar */}
        <div className={`${showUserList ? 'block' : 'hidden'} md:block w-full md:w-64 bg-black/85 border-4 box-shadow-retro flex-shrink-0 md:max-h-[400px]`} style={{ borderColor: T.primary }}>
          <div className="text-black px-3 py-1 flex items-center gap-2 font-bold" style={{ background: T.primary }}>
            <Users className="w-5 h-5 drop-shadow-[0_0_4px_#000]" />
            <span>ONLINE ({onlineCount})</span>
          </div>
          <div className="p-3 space-y-2 max-h-[200px] md:max-h-[350px] overflow-y-auto retro-scrollbar">
            {onlineUsers.map((user, idx) => (
              <div key={idx} className="text-[#00ff00] flex items-center justify-between gap-2 group">
                <button className="flex items-center gap-2 hover:text-[#ff6f61] transition-colors" onClick={() => handleViewProfile(user)}>
                  <span className={`text-xs ${userStatuses[user] === 'busy' ? 'text-red-400' : userStatuses[user] === 'afk' ? 'text-yellow-400' : 'text-[#ff6f61]'}`}>●</span>
                  <span className={user === username ? "font-bold" : ""}>{user}</span>
                </button>
                {(isAdmin || isRoomOwner) && user !== username && (
                  <button
                    onClick={() => handleBanUser(user)}
                    className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    title="Ban User"
                  >
                    BAN
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex flex-col items-center justify-center mb-2 md:mb-4">
            <div className="flex items-center gap-4">
              <img 
                src={leftFrog} 
                className="w-16 md:w-24" 
                alt="Dancing Frog" 
              />
              <img 
                src={flames} 
                alt="Grabzhangout009" 
                className="h-16 md:h-28 object-contain drop-shadow-[0_0_10px_#ff6f61]" 
              />
              <img 
                src={rightFrog} 
                className="w-16 md:w-24" 
                alt="Dancing Frog" 
              />
            </div>
            <div className="mt-2 text-xl md:text-2xl text-shadow-neon bg-black/60 px-4 py-1 border border-[#00ff00] flex items-center gap-3 self-start">
              <span className="blinking-cursor">EST. 1999 :: {onlineCount} USERS ONLINE</span>
              <button 
                onClick={() => setShowUserList(!showUserList)}
                className="md:hidden group relative text-[#00ff00] hover:text-[#ff6f61] transition-colors duration-150"
                title="Users"
              >
                <Users className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00] group-hover:drop-shadow-[0_0_8px_#ff6f61] transition-all duration-150" />
              </button>
              <button 
                onClick={() => setShowGamesMenu(true)}
                className="group relative text-[#00ff00] hover:text-[#ff6f61] transition-colors duration-150"
                title="Games"
              >
                <Gamepad2 className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00] group-hover:drop-shadow-[0_0_8px_#ff6f61] group-hover:scale-110 transition-all duration-150" />
              </button>
              <button 
                onClick={handleDownloadHistory}
                className="group relative text-[#00ff00] hover:text-[#ff6f61] transition-colors duration-150"
                title="Download Chat History"
              >
                <Download className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00] group-hover:drop-shadow-[0_0_8px_#ff6f61] transition-all duration-150" />
              </button>
              <button
                onClick={handleOpenLeaderboard}
                className="group relative hover:text-[#ff6f61] transition-colors duration-150"
                style={{ color: T.primary }}
                title="Leaderboard"
              >
                <Trophy className="w-6 h-6 group-hover:drop-shadow-[0_0_8px_#ff6f61] transition-all duration-150" />
              </button>
              <button
                onClick={() => setShowThemePicker(true)}
                className="group relative hover:text-[#ff6f61] transition-colors duration-150"
                style={{ color: T.primary }}
                title="Theme"
              >
                <Palette className="w-6 h-6 group-hover:drop-shadow-[0_0_8px_#ff6f61] transition-all duration-150" />
              </button>
              <button 
                onClick={() => setShowProfile(true)}
                className="group relative text-[#00ff00] hover:text-[#ff6f61] transition-colors duration-150"
                title="Profile Settings"
              >
                <Settings className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00] group-hover:drop-shadow-[0_0_8px_#ff6f61] group-hover:rotate-45 transition-all duration-300" />
              </button>
              <button
                onClick={() => setShowDMs(true)}
                className="group relative text-[#00ff00] hover:text-[#ff6f61] transition-colors duration-150"
                title="Direct Messages"
              >
                <MessageSquare className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00] group-hover:drop-shadow-[0_0_8px_#ff6f61] transition-all duration-150" />
              </button>
              {/* Fullscreen — mobile only */}
              <button
                onClick={toggleFullscreen}
                className="md:hidden group relative text-[#00ff00] hover:text-[#ff6f61] transition-colors duration-150"
                title="Fullscreen"
              >
                {isFullscreen
                  ? <Minimize className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00]" />
                  : <Maximize className="w-6 h-6 drop-shadow-[0_0_6px_#00ff00]" />}
              </button>
            </div>
          </header>

          <marquee className="text-[#00ff00] text-xl border-y-2 border-dashed border-[#00ff00] py-1 mb-2 bg-black/80">
            *** ROOM: {roomName.toUpperCase()} *** WELCOME TO GRABZHANGOUT009 *** THE COOLEST CHATROOM ON THE WORLD WIDE WEB *** UPLOAD YOUR DANKEST MEMES *** NO LURKING ALLOWED ***
          </marquee>

          {/* Pinned message */}
          {pinnedMsg && (
            <div className="flex items-center gap-2 bg-black border-2 border-yellow-400 px-3 py-1 mb-1 text-sm">
              <Pin className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-400 font-bold mr-1">@{pinnedMsg.username}:</span>
              <span className="text-[#00ff00] truncate">{pinnedMsg.content}</span>
              {(isAdmin || isRoomOwner) && (
                <button onClick={handleUnpin} className="ml-auto text-yellow-400 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col bg-black/85 border-4 box-shadow-retro mb-2 min-h-0" style={{ borderColor: T.primary }}>
            
            <div className="text-black px-3 py-1 flex items-center gap-2 font-bold text-lg" style={{ background: T.primary }}>
              <TerminalSquare className="w-5 h-5" />
              <span>C:\CHAT\MAIN.EXE</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 retro-scrollbar space-y-3">
              {isLoading ? (
                <div className="text-[#00ff00] text-xl animate-pulse">LOADING_DATA...</div>
              ) : messages.length === 0 ? (
                <div className="text-[#00ff00] opacity-50 text-xl italic">
                  {"> No messages yet. Be the first to post!"}
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} className="text-xl break-words group relative flex items-start gap-2 animate-msg-in">
                    {userPfps[msg.username] && (
                      <img 
                        src={userPfps[msg.username]} 
                        alt={msg.username}
                        className="w-8 h-8 rounded-full border-2 border-[#00ff00] flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#ff6f61] mr-2">
                          [{msg.createdAt ? format(new Date(msg.createdAt), "HH:mm:ss") : "00:00:00"}]
                        </span>
                        <span className="text-[#00aa00] mr-2 font-bold">&lt;{msg.username || "Guest"}&gt;</span>
                        {/* Reply button */}
                        <button
                          onClick={() => { playBeep(440, 0.05); setReplyTo({ id: msg.id, username: msg.username, content: msg.content }); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00ff00] hover:text-[#ff6f61] ml-1"
                          title="Reply"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        {/* Reaction trigger */}
                        <button
                          onClick={() => setActiveReactionMsg(activeReactionMsg === msg.id ? null : msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00ff00] hover:text-[#ff6f61]"
                          title="React"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        {/* Pin button — admin/owner only */}
                        {(isAdmin || isRoomOwner) && msg.type === "text" && (
                          <button
                            onClick={() => handlePinMessage(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-400 hover:text-yellow-300"
                            title="Pin Message"
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                        )}
                        {/* Username click → profile */}
                        <button
                          onClick={() => handleViewProfile(msg.username)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00aa00] hover:text-[#00ff00] text-sm"
                          title="View Profile"
                        >
                          👤
                        </button>
                      </div>
                    
                      {msg.type === "image" || msg.type === "gif" ? (
                        <div className="mt-2 mb-2 inline-block relative">
                          <img 
                            src={msg.content} 
                            alt={msg.type === "gif" ? "GIF" : "User uploaded meme"} 
                            className="max-w-xs md:max-w-md border-2 border-[#00ff00] p-1 bg-black box-shadow-retro"
                          />
                          {isAdmin && (
                            <button
                              onClick={() => deleteMessage.mutate(msg.id)}
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete (Admin Only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : msg.type === "voice" ? (
                        <div className="mt-2 flex items-center gap-2">
                          <audio 
                            src={msg.content} 
                            controls 
                            className="max-w-xs border-2 border-[#00ff00] bg-black p-2 box-shadow-retro"
                            style={{ filter: 'hue-rotate(90deg) saturate(2)' }}
                          />
                          {isAdmin && (
                            <button
                              onClick={() => deleteMessage.mutate(msg.id)}
                              className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete (Admin Only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#00ff00]">{msg.content}</span>
                      )}
                    
                      {msg.type === "text" && isAdmin && (
                        <button
                          onClick={() => deleteMessage.mutate(msg.id)}
                          className="ml-2 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete (Admin Only)"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      )}

                      {/* Reaction picker */}
                      {activeReactionMsg === msg.id && (
                        <div className="reaction-bar flex gap-1 mt-1 bg-black border-2 border-[#00ff00] p-1 w-fit">
                          {REACTION_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reactions display */}
                      {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(reactions[msg.id]).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              className={`text-sm border px-1 py-0.5 transition-colors ${users.includes(username || '') ? 'border-[#ff6f61] bg-[#ff6f61]/20' : 'border-[#00ff00] bg-black/40'}`}
                              title={users.join(", ")}
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="text-[#00ff00] opacity-70 italic animate-pulse">
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center gap-2 bg-black border-2 border-[#ff6f61] px-3 py-1 mb-1 text-sm">
              <Reply className="w-4 h-4 text-[#ff6f61] flex-shrink-0" />
              <span className="text-[#ff6f61] truncate">↩ @{replyTo.username}: "{replyTo.content.slice(0, 50)}"</span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-[#ff6f61] hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}

          <form onSubmit={handleSendText} className="flex gap-2 md:gap-4 items-stretch h-14 md:h-16">
            <RetroInput
              value={text}
              onChange={handleTextChange}
              placeholder="> TYPE MESSAGE HERE..."
              className="flex-1"
              disabled={sendMessage.isPending}
              autoFocus
            />
            
            <RetroButton 
              type="submit" 
              disabled={!text.trim() || sendMessage.isPending}
              className="w-20 md:w-24 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5 hidden md:block" />
              SEND
            </RetroButton>

            <RetroButton 
              type="button" 
              variant="secondary"
              onClick={() => setShowGifPicker(true)}
              className="w-12 md:w-16 flex items-center justify-center text-[#ff6f61]"
              title="Send GIF"
            >
              <Smile className="w-5 h-5" />
            </RetroButton>

            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              disabled={uploadImage.isPending}
            />
            <RetroButton 
              type="button" 
              variant="secondary"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 md:w-16 flex items-center justify-center ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#ff6f61]'}`}
              title={isRecording ? "Stop Recording" : "Record Voice"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </RetroButton>

            <RetroButton 
              type="button" 
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadImage.isPending}
              className="w-12 md:w-16 flex items-center justify-center text-[#ff6f61]"
              title="Upload Meme"
            >
              <Upload className="w-5 h-5" />
            </RetroButton>
          </form>
          
          {uploadImage.isPending && (
            <div className="mt-2 text-[#ff6f61] text-lg text-shadow-neon animate-pulse text-center">
              UPLOADING_FILE_TO_MAINFRAME... PLEASE_WAIT...
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={() => setShowLeaderboard(false)}>
          <div className="bg-black border-4 box-shadow-retro p-6 max-w-sm w-full mx-4" style={{ borderColor: T.primary }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: T.primary }}>
                <Trophy className="w-6 h-6" /> LEADERBOARD
              </h2>
              <button onClick={() => setShowLeaderboard(false)} style={{ color: T.accent }}>✕</button>
            </div>
            {leaderboard.length === 0 ? (
              <p style={{ color: T.primary }} className="opacity-60">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((u, i) => (
                  <div key={u.username} className="flex items-center justify-between border px-3 py-2" style={{ borderColor: T.primary }}>
                    <span style={{ color: T.accent }} className="font-bold w-6">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                    <span style={{ color: T.primary }} className="flex-1 ml-2">{u.username}</span>
                    <span style={{ color: T.primary }} className="font-bold">{u.messageCount} msgs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Theme Picker Modal */}
      {showThemePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={() => setShowThemePicker(false)}>
          <div className="bg-[#0a0a0a] border-2 p-6 max-w-xs w-full mx-4 rounded-sm shadow-2xl" style={{ borderColor: T.primary }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold tracking-widest" style={{ color: T.primary }}>THEME</h2>
              <button onClick={() => setShowThemePicker(false)} className="opacity-50 hover:opacity-100" style={{ color: T.primary }}>✕</button>
            </div>
            <div className="space-y-2">
              {Object.entries(THEMES).map(([key, val]) => (
                <button key={key} onClick={() => applyTheme(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-sm border transition-all duration-150 text-left"
                  style={{
                    borderColor: theme === key ? val.primary : 'transparent',
                    background: theme === key ? val.primary + '18' : val.bg,
                    color: val.primary,
                    boxShadow: theme === key ? `0 0 12px ${val.primary}44` : 'none',
                  }}>
                  <span className="text-xl">{val.emoji}</span>
                  <span className="font-bold tracking-wider text-sm">{val.label.toUpperCase()}</span>
                  <div className="ml-auto flex gap-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: val.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: val.accent }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Games Menu Modal */}
      {showGamesMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={() => setShowGamesMenu(false)}>
          <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto retro-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl text-[#00ff00] text-shadow-neon flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 drop-shadow-[0_0_8px_#00ff00]" />
                GAMES ARCADE
              </h2>
              <button 
                onClick={() => setShowGamesMenu(false)}
                className="text-[#ff6f61] hover:text-[#00ff00] text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Add more games here */}
              <div className="text-center text-[#00ff00] opacity-50 py-8 border-2 border-dashed border-[#00ff00]">
                <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50 drop-shadow-[0_0_6px_#00ff00]" />
                <p>MORE GAMES COMING SOON...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-black border-t-4 border-[#00ff00] flex items-center justify-around px-2 py-2">
        <button onClick={() => setShowUserList(!showUserList)} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          <Users className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />
          <span className="text-xs mt-0.5">USERS</span>
        </button>
        <button onClick={() => setShowGamesMenu(true)} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          <Gamepad2 className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />
          <span className="text-xs mt-0.5">GAMES</span>
        </button>
        <button onClick={() => setShowDMs(true)} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          <MessageSquare className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />
          <span className="text-xs mt-0.5">DMS</span>
        </button>
        <button onClick={() => setShowGifPicker(true)} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          <Smile className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />
          <span className="text-xs mt-0.5">GIF</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          <Upload className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />
          <span className="text-xs mt-0.5">UPLOAD</span>
        </button>
        <button onClick={() => setShowProfile(true)} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          <Settings className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />
          <span className="text-xs mt-0.5">PROFILE</span>
        </button>
        <button onClick={handleOpenLeaderboard} className="flex flex-col items-center hover:text-[#ff6f61] transition-colors" style={{ color: T.primary }}>
          <Trophy className="w-6 h-6" />
          <span className="text-xs mt-0.5">TOP</span>
        </button>
        <button onClick={() => setShowThemePicker(true)} className="flex flex-col items-center hover:text-[#ff6f61] transition-colors" style={{ color: T.primary }}>
          <Palette className="w-6 h-6" />
          <span className="text-xs mt-0.5">THEME</span>
        </button>
        <button onClick={toggleFullscreen} className="flex flex-col items-center text-[#00ff00] hover:text-[#ff6f61] transition-colors">
          {isFullscreen ? <Minimize className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" /> : <Maximize className="w-6 h-6 drop-shadow-[0_0_4px_#00ff00]" />}
          <span className="text-xs mt-0.5">{isFullscreen ? 'EXIT' : 'FULL'}</span>
        </button>
      </div>
    </div>
  );
}
