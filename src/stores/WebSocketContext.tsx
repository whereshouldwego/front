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
  username?: string;
}

interface PresenceMessage {
  type: 'join' | 'leave' | 'cursor';
  userId: number | string;
  roomCode: string;
  username?: string;
  lat?: number;
  lng?: number;
}

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  sendCursorPosition: (position: MapCenter) => void;
  lastMessage: MessageEvent | null;
  readyState: number;
  otherUsersPositions: Map<string, CursorPositionLatLng>;
  presentUsers: { id: string; name: string }[];
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
  const [userNameById, setUserNameById] = useState<Map<string, string>>(new Map());
  const [allConnectedUsers, setAllConnectedUsers] = useState<Set<string>>(new Set());
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
      // 접속 시 본인을 연결된 사용자 목록에 추가
      const selfId = String(parsedUserId);
      if (selfId) {
        setAllConnectedUsers(prev => new Set([...prev, selfId]));
        setUserNameById(prev => {
          const next = new Map(prev);
          const nickname = localStorage.getItem('userNickname') || '';
          if (nickname) next.set(selfId, nickname);
          return next;
        });
        
        // 접속 알림 메시지를 즉시 전송하여 다른 사용자들이 인식할 수 있도록 함
        const joinPayload: BackendCursorMessage = {
          userId: parsedUserId,
          roomCode: roomCode!,
          lat: 0, // 임시 좌표
          lng: 0, // 임시 좌표  
          username: nickname || undefined,
        };
        
        // 약간 지연 후 전송 (WebSocket 연결 안정화)
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(joinPayload));
          }
        }, 100);
      }
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
      try {
        const data: BackendCursorMessage = JSON.parse(event.data);
        const userId = String(data.userId);
        const isSelf = userId === String(parsedUserId);
        
        // 모든 사용자를 연결된 사용자 목록에 추가 (커서 메시지를 받으면 해당 사용자가 활성 상태)
        setAllConnectedUsers(prev => new Set([...prev, userId]));
        
        // 사용자명 업데이트
        if (data.username) {
          setUserNameById((prev) => {
            const next = new Map(prev);
            next.set(userId, data.username!);
            return next;
          });
        }
        
        // 커서 위치 업데이트 (본인 제외)
        if (
          typeof data.lat === 'number' &&
          typeof data.lng === 'number' &&
          data.userId != null &&
          !isSelf
        ) {
          // Batch updates to reduce re-renders
          if (!pendingPositionsRef.current) pendingPositionsRef.current = new Map(otherUsersPositions);
          pendingPositionsRef.current.set(userId, { lat: data.lat, lng: data.lng });
          
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
      // 연결 해제 시 정리
      setAllConnectedUsers(new Set());
      setOtherUsersPositions(new Map());
      setUserNameById(new Map());
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
      username: localStorage.getItem('userNickname') || undefined,
    };
    socket.send(JSON.stringify(payload));
  };

  const presentUsers = useMemo(() => {
    // 연결된 모든 사용자 + 커서 위치가 있는 사용자들을 합친 목록
    const allUserIds = new Set<string>([...allConnectedUsers, ...otherUsersPositions.keys()]);
    const selfId = String(parsedUserId);
    if (selfId) allUserIds.add(selfId);
    
    return Array.from(allUserIds).map((id) => {
      const isSelf = String(selfId) === String(id);
      const name = userNameById.get(id) || (isSelf ? (localStorage.getItem('userNickname') || '나') : id.slice(0, 4));
      return { id, name };
    });
  }, [allConnectedUsers, otherUsersPositions, userNameById, parsedUserId]);

  const contextValue: WebSocketContextType = {
    sendMessage,
    sendCursorPosition,
    lastMessage,
    readyState,
    otherUsersPositions,
    presentUsers,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
