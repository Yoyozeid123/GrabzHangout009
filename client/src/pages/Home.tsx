import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Send, TerminalSquare, Users, Smile, Trash2 } from "lucide-react";
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

export default function Home() {
  const [text, setText] = useState("");
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("chatUsername")
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: messages = [], isLoading } = useMessages();
  const sendMessage = useSendMessage();
  const uploadImage = useUploadImage();
  const deleteMessage = useDeleteMessage();
  const { onlineCount, onlineUsers, typingUsers, sendTyping } = useWebSocket(username);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    const name = usernameInput.trim();
    setUsername(name);
    localStorage.setItem("chatUsername", name);
  };

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
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center selection:bg-[#ff6f61] selection:text-black"
      style={{ backgroundImage: `url(${bgGif})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 scanlines z-50 pointer-events-none mix-blend-overlay"></div>

      <img 
        src={leftFrog} 
        className="absolute top-4 left-4 w-20 md:w-32 z-10" 
        alt="Dancing Frog Left" 
      />
      <img 
        src={rightFrog} 
        className="absolute top-4 right-4 w-20 md:w-32 z-10" 
        alt="Dancing Frog Right" 
      />

      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      <div className="w-full max-w-6xl mx-auto h-screen flex flex-col md:flex-row gap-4 p-4 md:p-8 z-20">
        
        {/* User List Sidebar */}
        <div className={`${showUserList ? 'block' : 'hidden'} md:block w-full md:w-64 bg-black/85 border-4 border-[#00ff00] box-shadow-retro flex-shrink-0`}>
          <div className="bg-[#00ff00] text-black px-3 py-1 flex items-center gap-2 font-bold">
            <Users className="w-5 h-5" />
            <span>ONLINE ({onlineCount})</span>
          </div>
          <div className="p-3 space-y-2 max-h-[300px] md:max-h-full overflow-y-auto retro-scrollbar">
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
          <header className="flex flex-col items-center justify-center mb-4 md:mb-8">
            <img 
              src={flames} 
              alt="Grabzhangout009" 
              className="h-16 md:h-28 object-contain drop-shadow-[0_0_10px_#ff6f61]" 
            />
            <div className="mt-2 text-xl md:text-2xl text-shadow-neon bg-black/60 px-4 py-1 border border-[#00ff00] flex items-center gap-3">
              <span className="blinking-cursor">EST. 1999 :: {onlineCount} USERS ONLINE</span>
              <button 
                onClick={() => setShowUserList(!showUserList)}
                className="md:hidden text-[#00ff00] hover:text-[#ff6f61]"
              >
                <Users className="w-6 h-6" />
              </button>
            </div>
          </header>

          <marquee className="text-[#00ff00] text-xl border-y-2 border-dashed border-[#00ff00] py-2 mb-4 bg-black/80">
            *** WELCOME TO GRABZHANGOUT009 *** THE COOLEST CHATROOM ON THE WORLD WIDE WEB *** UPLOAD YOUR DANKEST MEMES *** NO LURKING ALLOWED ***
          </marquee>

          <div className="flex-1 flex flex-col bg-black/85 border-4 border-[#00ff00] box-shadow-retro mb-4 min-h-0">
            
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
                  <div key={msg.id || idx} className="text-xl break-words group relative">
                    <span className="text-[#ff6f61] mr-2">
                      [{msg.createdAt ? format(new Date(msg.createdAt), "HH:mm:ss") : "00:00:00"}]
                    </span>
                    <span className="text-[#00aa00] mr-2 font-bold">&lt;{msg.username || "Guest"}&gt;</span>
                    
                    {msg.type === "image" || msg.type === "gif" ? (
                      <div className="mt-2 mb-2 inline-block relative">
                        <img 
                          src={msg.content} 
                          alt={msg.type === "gif" ? "GIF" : "User uploaded meme"} 
                          className="max-w-xs md:max-w-md border-2 border-[#00ff00] p-1 bg-black box-shadow-retro"
                        />
                        {msg.username === username && (
                          <button
                            onClick={() => deleteMessage.mutate(msg.id)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#00ff00]">{msg.content}</span>
                    )}
                    
                    {msg.type === "text" && msg.username === username && (
                      <button
                        onClick={() => deleteMessage.mutate(msg.id)}
                        className="ml-2 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    )}
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

            <RetroButton 
              type="button" 
              variant="secondary"
              onClick={() => setShowGifPicker(true)}
              className="w-12 md:w-16 flex items-center justify-center text-[#ff6f61]"
              title="Send GIF"
            >
              <Smile className="w-6 h-6" />
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
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadImage.isPending}
              className="w-12 md:w-16 flex items-center justify-center text-[#ff6f61]"
              title="Upload Meme"
            >
              <ImageIcon className="w-6 h-6" />
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
