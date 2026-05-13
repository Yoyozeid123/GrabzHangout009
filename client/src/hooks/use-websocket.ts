import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type UserStatus = "online" | "afk" | "busy";

export interface DM { from: string; to?: string; content: string; self?: boolean; ts: number; }
export interface Challenge { from: string; game: string; }
export interface PinnedMsg { id: number; username: string; content: string; pinnedBy: string; }

export function useWebSocket(username: string | null, room: string = "main") {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [jumpscareTrigger, setJumpscareTrigger] = useState(0);
  const [gameData, setGameData] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [dms, setDms] = useState<DM[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<Challenge | null>(null);
  const [challengeAccepted, setChallengeAccepted] = useState<string | null>(null);
  const [pinnedMsg, setPinnedMsg] = useState<PinnedMsg | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!username) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/chat-ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", username, room }));
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
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
          // Append directly — no refetch
          queryClient.setQueryData(["/api/messages", room], (old: any[]) =>
            old ? [...old, data.message] : [data.message]
          );
        } else if (data.type === "deleteMessage") {
          queryClient.setQueryData(["/api/messages", room], (old: any[]) =>
            old ? old.filter((m: any) => m.id !== data.id) : []
          );
        } else if (data.type === "confetti") {
          setConfettiTrigger(prev => prev + 1);
        } else if (data.type === "jumpscare") {
          setJumpscareTrigger(prev => prev + 1);
        } else if (data.type === "game") {
          setGameData(data.data);
        } else if (data.type === "announcement") {
          setAnnouncement(data.message);
        } else if (data.type === "banned") {
          alert(data.message || "You have been banned from this room");
          localStorage.removeItem("chatUsername");
          window.location.reload();
        } else if (data.type === "statusUpdate") {
          setUserStatuses(prev => ({ ...prev, [data.username]: data.status }));
        } else if (data.type === "dm") {
          setDms(prev => [...prev, { from: data.from, to: data.to, content: data.content, self: data.self, ts: Date.now() }]);
        } else if (data.type === "challenge") {
          setIncomingChallenge({ from: data.from, game: data.game });
        } else if (data.type === "challenge-accept") {
          setChallengeAccepted(data.from);
        } else if (data.type === "challenge-decline") {
          setChallengeAccepted(null);
          setIncomingChallenge(null);
        } else if (data.type === "pinned") {
          setPinnedMsg(data.pin);
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    ws.onclose = () => {
      // Auto-reconnect after 3s
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [username, room, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && username) {
      wsRef.current.send(JSON.stringify({ type: "typing", username }));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN)
          wsRef.current.send(JSON.stringify({ type: "stopTyping", username }));
      }, 2000);
    }
  }, [username]);

  const broadcastConfetti = useCallback(() => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "confetti" }));
  }, []);

  const broadcastJumpscare = useCallback(() => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "jumpscare", username }));
  }, [username]);

  const broadcastGame = useCallback((data: any) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "game", data }));
  }, []);

  const sendStatus = useCallback((status: UserStatus) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "status", username, status }));
  }, [username]);

  const sendDM = useCallback((to: string, content: string) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "dm", username, to, content }));
  }, [username]);

  const sendChallenge = useCallback((to: string, game = "pong") => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "challenge", username, to, game }));
  }, [username]);

  const acceptChallenge = useCallback((to: string) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "challenge-accept", username, to }));
    setIncomingChallenge(null);
  }, [username]);

  const declineChallenge = useCallback((to: string) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "challenge-decline", username, to }));
    setIncomingChallenge(null);
  }, [username]);

  return {
    onlineCount, onlineUsers, typingUsers,
    sendTyping, broadcastConfetti, broadcastJumpscare, broadcastGame,
    confettiTrigger, jumpscareTrigger, gameData,
    announcement, setAnnouncement,
    userStatuses, sendStatus,
    dms, sendDM,
    incomingChallenge, challengeAccepted, setChallengeAccepted,
    sendChallenge, acceptChallenge, declineChallenge,
    pinnedMsg, setPinnedMsg,
  };
}
