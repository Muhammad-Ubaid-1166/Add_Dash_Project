import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';

export const useWebSocket = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const isManualCloseRef = useRef(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const wsUrl = `ws://127.0.0.1:8000/ws/alerts/${cleanToken}`;
    let ws = null;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => console.log("✅ WebSocket Connected!");

      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const data = JSON.parse(event.data);

          // FIX: only add + increment if this ID is not already in state
          setNotifications(prev => {
            if (prev.some(n => n.id === data.id)) return prev; // duplicate, skip
            setUnreadCount(c => c + 1); // only increment for truly new alerts
            return [data, ...prev];
          });

        } catch (err) {
          console.error("WS Parse Error:", err);
        }
      };

      ws.onerror = () => console.error("❌ WebSocket Error Event");

      ws.onclose = (event) => {
        if (event.code !== 1006 || isManualCloseRef.current) {
          console.warn(`⚠️ WS Closed. Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
        }
        isManualCloseRef.current = false;
      };

    } catch (err) {
      console.error("Failed to connect to WebSocket:", err);
    }

    return () => {
      isManualCloseRef.current = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [token]);

  const markAsRead = () => setUnreadCount(0);

  return { notifications, unreadCount, markAsRead };
};