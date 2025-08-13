import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MapCenter } from '../types';

function buildWebSocketUrl(roomCode: string): string {
  // Prefer explicit WS URL, fallback to API URL
  const base = (import.meta as any).env.VITE_WS_URL || (import.meta as any).env.VITE_API_URL || '';
  const normalized = String(base).replace(/\/$/, '');
  const wsBase = normalized.replace(/^http/i, 'ws');
  const token = localStorage.getItem('accessToken') || '';
  const tokenParam = token ? `&token=Bearer%20${encodeURIComponent(token)}` : '';
  return `${wsBase}/ws/cursor?roomCode=${encodeURIComponent(roomCode)}${tokenParam}`;
}

interface CursorPositionLatLng {
  lat: number;
  lng: number;
}

interface BackendCursorMessage {
  userId: number | string;
  roomCode: string;
  lat: number;
  lng: number;
}

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  sendCursorPosition: (position: MapCenter) => void;
  lastMessage: MessageEvent | null;
  readyState: number;
  otherUsersPositions: Map<string, CursorPositionLatLng>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
  roomCode?: string;
  disabled?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children, roomCode, disabled }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [readyState, setReadyState] = useState<number>(disabled || !roomCode ? WebSocket.CLOSED : WebSocket.CONNECTING);
  const [otherUsersPositions, setOtherUsersPositions] = useState<Map<string, CursorPositionLatLng>>(new Map());
  const pendingPositionsRef = useRef<Map<string, CursorPositionLatLng> | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  const userIdRaw = useMemo(() => localStorage.getItem('userId') || '', []);
  const parsedUserId: number | string = useMemo(() => {
    const n = Number(userIdRaw);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : userIdRaw || `user_${Math.random().toString(36).substring(2, 9)}`;
  }, [userIdRaw]);

  useEffect(() => {
    if (disabled || !roomCode) {
      // Disable any active socket when switching to disabled/no-room mode
      setSocket(null);
      setLastMessage(null);
      setReadyState(WebSocket.CLOSED);
      return;
    }

    const url = buildWebSocketUrl(roomCode);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setReadyState(ws.readyState);
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
      try {
        const data: BackendCursorMessage = JSON.parse(event.data);
        if (
          typeof data.lat === 'number' &&
          typeof data.lng === 'number' &&
          data.userId != null &&
          String(data.userId) !== String(parsedUserId)
        ) {
          // Batch updates to reduce re-renders
          if (!pendingPositionsRef.current) pendingPositionsRef.current = new Map(otherUsersPositions);
          pendingPositionsRef.current.set(String(data.userId), { lat: data.lat, lng: data.lng });
          if (flushTimerRef.current == null) {
            flushTimerRef.current = window.setTimeout(() => {
              if (pendingPositionsRef.current) {
                setOtherUsersPositions(new Map(pendingPositionsRef.current));
                pendingPositionsRef.current = null;
              }
              if (flushTimerRef.current != null) {
                window.clearTimeout(flushTimerRef.current);
                flushTimerRef.current = null;
              }
            }, 60);
          }
        }
      } catch (e) {
        // ignore non-cursor messages
      }
    };

    ws.onclose = () => {
      setReadyState(ws.readyState);
    };

    ws.onerror = () => {
      setReadyState(ws.readyState);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [roomCode, disabled]);

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const sendCursorPosition = (position: MapCenter) => {
    if (disabled || !roomCode) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const payload: BackendCursorMessage = {
      userId: parsedUserId,
      roomCode,
      lat: position.lat,
      lng: position.lng,
    };
    socket.send(JSON.stringify(payload));
  };

  const contextValue: WebSocketContextType = {
    sendMessage,
    sendCursorPosition,
    lastMessage,
    readyState,
    otherUsersPositions,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
