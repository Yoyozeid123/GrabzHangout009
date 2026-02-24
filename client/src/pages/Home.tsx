import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Send, TerminalSquare } from "lucide-react";
import { useMessages, useSendMessage, useUploadImage } from "@/hooks/use-messages";
import { RetroButton } from "@/components/RetroButton";
import { RetroInput } from "@/components/RetroInput";

// Static Assets mapped via Vite aliases
import bgGif from "@assets/BG_1771938204124.gif";
import leftFrog from "@assets/frog-left_1771938204138.gif";
import rightFrog from "@assets/frog-right_1771938204140.gif";
import flames from "@assets/Grabzhangout009-flames_1771938204143.gif";

export default function Home() {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: messages = [], isLoading } = useMessages();
  const sendMessage = useSendMessage();
  const uploadImage = useUploadImage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sendMessage.isPending) return;

    sendMessage.mutate({ type: "text", content: text.trim() }, {
      onSuccess: () => setText("")
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Upload -> then Send Message
    uploadImage.mutate(file, {
      onSuccess: (data) => {
        sendMessage.mutate({ 
          type: "image", 
          content: `/uploads/${data.filename}` 
        });
      }
    });
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden flex flex-col items-center selection:bg-[#ff6f61] selection:text-black"
      style={{ backgroundImage: `url(${bgGif})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}
    >
      {/* Global Scanlines Overlay */}
      <div className="absolute inset-0 scanlines z-50 pointer-events-none mix-blend-overlay"></div>

      {/* Decorative Frogs */}
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

      {/* Main Layout Container */}
      <div className="w-full max-w-4xl mx-auto h-screen flex flex-col p-4 md:p-8 z-20">
        
        {/* Header */}
        <header className="flex flex-col items-center justify-center mb-4 md:mb-8 mt-4">
          <img 
            src={flames} 
            alt="Grabzhangout009" 
            className="h-16 md:h-28 object-contain drop-shadow-[0_0_10px_#ff6f61]" 
          />
          <div className="mt-2 text-xl md:text-2xl text-shadow-neon bg-black/60 px-4 py-1 border border-[#00ff00]">
            <span className="blinking-cursor">EST. 1999 :: 0 USERS ONLINE</span>
          </div>
        </header>

        {/* Marquee Announcer */}
        <marquee className="text-[#00ff00] text-xl border-y-2 border-dashed border-[#00ff00] py-2 mb-4 bg-black/80">
          *** WELCOME TO GRABZHANGOUT009 *** THE COOLEST CHATROOM ON THE WORLD WIDE WEB *** UPLOAD YOUR DANKEST MEMES *** NO LURKING ALLOWED ***
        </marquee>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-black/85 border-4 border-[#00ff00] box-shadow-retro mb-4 min-h-0">
          
          {/* Chat Header Bar */}
          <div className="bg-[#00ff00] text-black px-3 py-1 flex items-center gap-2 font-bold text-lg">
            <TerminalSquare className="w-5 h-5" />
            <span>C:\CHAT\MAIN.EXE</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 retro-scrollbar space-y-3">
            {isLoading ? (
              <div className="text-[#00ff00] text-xl animate-pulse">LOADING_DATA...</div>
            ) : messages.length === 0 ? (
              <div className="text-[#00ff00] opacity-50 text-xl italic">
                {"> No messages yet. Be the first to post!"}
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={msg.id || idx} className="text-xl break-words">
                  <span className="text-[#ff6f61] mr-2">
                    [{msg.createdAt ? format(new Date(msg.createdAt), "HH:mm:ss") : "00:00:00"}]
                  </span>
                  <span className="text-[#00aa00] mr-2 font-bold">&lt;Guest&gt;</span>
                  
                  {msg.type === "image" ? (
                    <div className="mt-2 mb-2 inline-block">
                      <img 
                        src={msg.content} 
                        alt="User uploaded meme" 
                        className="max-w-xs md:max-w-md border-2 border-[#00ff00] p-1 bg-black box-shadow-retro"
                      />
                    </div>
                  ) : (
                    <span className="text-[#00ff00]">{msg.content}</span>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Form Area */}
        <form onSubmit={handleSendText} className="flex gap-2 md:gap-4 items-stretch h-14 md:h-16">
          <RetroInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="> TYPE MESSAGE HERE..."
            className="flex-1"
            disabled={sendMessage.isPending}
            autoFocus
          />
          
          <RetroButton 
            type="submit" 
            disabled={!text.trim() || sendMessage.isPending}
            className="w-24 md:w-32 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5 hidden md:block" />
            SEND
          </RetroButton>

          {/* Hidden File Input & Trigger Button */}
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
            className="w-16 md:w-auto flex items-center justify-center gap-2 px-2 md:px-4 text-[#ff6f61]"
            title="Upload Meme"
          >
            <ImageIcon className="w-6 h-6" />
            <span className="hidden md:inline">MEME</span>
          </RetroButton>
        </form>
        
        {/* Upload progress indicator */}
        {uploadImage.isPending && (
          <div className="mt-2 text-[#ff6f61] text-lg text-shadow-neon animate-pulse text-center">
            UPLOADING_FILE_TO_MAINFRAME... PLEASE_WAIT...
          </div>
        )}
      </div>
    </div>
  );
}
