import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Send, TerminalSquare, Users, Smile, Trash2, Mic, MicOff, Settings, LogOut, Upload, Download } from "lucide-react";
import { useMessages, useSendMessage, useUploadImage, useDeleteMessage } from "@/hooks/use-messages";
import { useWebSocket } from "@/hooks/use-websocket";
import { RetroButton } from "@/components/RetroButton";
import { RetroInput } from "@/components/RetroInput";
import { GifPicker } from "@/components/GifPicker";

// Static Assets mapped via Vite aliases
import bgGif from "@assets/BG_1771938204124.gif";
import leftFrog from "@assets/frog-left_1771938204138.gif";
import rightFrog from "@assets/frog-right_1771938204140.gif";
import flames from "@assets/Grabzhangout009-flames_1771938204143.gif";

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

export default function Home() {
  const [text, setText] = useState("");
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("chatUsername")
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showJumpscare, setShowJumpscare] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const warningVideoRef = useRef<HTMLVideoElement>(null);

  // Clear old pfps on version change
  useEffect(() => {
    const currentVersion = "v1.0.0"; // Update this when you deploy
    const savedVersion = localStorage.getItem("appVersion");
    
    if (savedVersion !== currentVersion) {
      // Clear all pfp data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("pfp_")) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem("appVersion", currentVersion);
      console.log("Cleared old profile pictures due to version update");
    }
  }, []);
  
  const { data: messages = [], isLoading } = useMessages(roomName);
  const sendMessage = useSendMessage();
  const uploadImage = useUploadImage();
  const deleteMessage = useDeleteMessage();
  const { onlineCount, onlineUsers, typingUsers, sendTyping, broadcastConfetti, broadcastJumpscare, broadcastGame, confettiTrigger, jumpscareTrigger, gameData: wsGameData } = useWebSocket(username, roomName);

  const isAdmin = username?.toLowerCase() === "yofez009";
  const isRoomOwner = username === roomOwner;

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

  useEffect(() => {
    const fetchPfps = async () => {
      const uniqueUsers = [...new Set(messages.map(m => m.username))];
      for (const user of uniqueUsers) {
        if (!userPfps[user]) {
          const res = await fetch(`/api/users/${user}`);
          const data = await res.json();
          if (data.pfp) {
            setUserPfps(prev => ({ ...prev, [user]: data.pfp }));
          }
        }
      }
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
    }
    
    setUsername(name);
    localStorage.setItem("chatUsername", name);
  };

  const handleJoinRoom = async (room: string, password?: string, owner?: string) => {
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

    sendMessage.mutate({ type: "text", content: text.trim(), username }, {
      onSuccess: () => setText("")
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    sendTyping();
  };

  const handleGifSelect = (gifUrl: string) => {
    if (!username) return;
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

      {showProfile && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-black border-4 border-[#00ff00] box-shadow-retro p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-[#00ff00] text-shadow-neon">PROFILE SETTINGS</h2>
              <button onClick={() => setShowProfile(false)} className="text-[#ff6f61] text-2xl">✕</button>
            </div>

            <div className="space-y-4">
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

              {/* Sign Out */}
              <RetroButton onClick={handleSignOut} variant="secondary" className="w-full text-[#ff6f61]">
                <LogOut className="w-4 h-4 inline mr-2" />
                SIGN OUT
              </RetroButton>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto h-screen flex flex-col md:flex-row gap-4 p-2 md:p-4 z-20">
        
        {/* User List Sidebar */}
        <div className={`${showUserList ? 'block' : 'hidden'} md:block w-full md:w-64 bg-black/85 border-4 border-[#00ff00] box-shadow-retro flex-shrink-0 md:max-h-[400px]`}>
          <div className="bg-[#00ff00] text-black px-3 py-1 flex items-center gap-2 font-bold">
            <Users className="w-5 h-5" />
            <span>ONLINE ({onlineCount})</span>
          </div>
          <div className="p-3 space-y-2 max-h-[200px] md:max-h-[350px] overflow-y-auto retro-scrollbar">
            {onlineUsers.map((user, idx) => (
              <div key={idx} className="text-[#00ff00] flex items-center gap-2">
                <span className="text-[#ff6f61]">●</span>
                <span className={user === username ? "font-bold" : ""}>{user}</span>
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
                className="md:hidden text-[#00ff00] hover:text-[#ff6f61]"
                title="Users"
              >
                <Users className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownloadHistory}
                className="text-[#00ff00] hover:text-[#ff6f61]"
                title="Download Chat History"
              >
                <Download className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowProfile(true)}
                className="text-[#00ff00] hover:text-[#ff6f61]"
                title="Profile Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          <marquee className="text-[#00ff00] text-xl border-y-2 border-dashed border-[#00ff00] py-1 mb-2 bg-black/80">
            *** ROOM: {roomName.toUpperCase()} *** WELCOME TO GRABZHANGOUT009 *** THE COOLEST CHATROOM ON THE WORLD WIDE WEB *** UPLOAD YOUR DANKEST MEMES *** NO LURKING ALLOWED ***
          </marquee>

          <div className="flex-1 flex flex-col bg-black/85 border-4 border-[#00ff00] box-shadow-retro mb-2 min-h-0">
            
            <div className="bg-[#00ff00] text-black px-3 py-1 flex items-center gap-2 font-bold text-lg">
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
                  <div key={msg.id || idx} className="text-xl break-words group relative flex items-start gap-2">
                    {userPfps[msg.username] && (
                      <img 
                        src={userPfps[msg.username]} 
                        alt={msg.username}
                        className="w-8 h-8 rounded-full border-2 border-[#00ff00] flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div>
                        <span className="text-[#ff6f61] mr-2">
                          [{msg.createdAt ? format(new Date(msg.createdAt), "HH:mm:ss") : "00:00:00"}]
                        </span>
                        <span className="text-[#00aa00] mr-2 font-bold">&lt;{msg.username || "Guest"}&gt;</span>
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
                          <audio src={msg.content} controls className="max-w-xs" />
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

            {(isAdmin || isRoomOwner) && (
              <RetroButton 
                type="button" 
                onClick={triggerConfetti}
                className="w-12 md:w-16 flex items-center justify-center text-yellow-400"
                title="Confetti"
              >
                🎉
              </RetroButton>
            )}

            {isAdmin && (
              <>
                <RetroButton 
                  type="button" 
                  onClick={triggerJumpscare}
                  className="w-12 md:w-16 flex items-center justify-center text-red-500"
                  title="Jumpscare (Room)"
                >
                  👻
                </RetroButton>
                <RetroButton 
                  type="button" 
                  onClick={() => {
                    fetch('/api/jumpscare-global', { method: 'POST' });
                  }}
                  className="w-12 md:w-16 flex items-center justify-center text-red-500 animate-pulse"
                  title="Global Jumpscare (All Rooms)"
                >
                  💀
                </RetroButton>
              </>
            )}

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
    </div>
  );
}
