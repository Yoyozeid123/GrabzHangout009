import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket(username: string | null, room: string = "main") {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [jumpscareTrigger, setJumpscareTrigger] = useState(0);
  const [gameData, setGameData] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!username) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/chat-ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", username, room }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "userList") {
          setOnlineUsers(data.users);
          setOnlineCount(data.count);
        } else if (data.type === "typing") {
          setTypingUsers(data.users.filter((u: string) => u !== username));
        } else if (data.type === "newMessage") {
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        } else if (data.type === "confetti") {
          setConfettiTrigger(prev => prev + 1);
        } else if (data.type === "jumpscare") {
          setJumpscareTrigger(prev => prev + 1);
        } else if (data.type === "deleteMessage") {
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        } else if (data.type === "game") {
          setGameData(data.data);
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [username, room, queryClient]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && username) {
      wsRef.current.send(JSON.stringify({ type: "typing", username }));
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "stopTyping", username }));
        }
      }, 2000);
    }
  }, [username]);

  const broadcastConfetti = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "confetti" }));
    }
  }, []);

  const broadcastJumpscare = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "jumpscare" }));
    }
  }, []);

  return { onlineCount, onlineUsers, typingUsers, sendTyping, broadcastConfetti, broadcastJumpscare, confettiTrigger, jumpscareTrigger, gameData };
}
