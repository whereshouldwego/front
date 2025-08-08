import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// TODO: 실제 웹소켓 서버 주소로 변경해야 합니다.
const WEBSOCKET_URL = 'ws://localhost:8080'; // 예시 URL

interface CursorPosition {
  x: number;
  y: number;
}

interface CursorMessage {
  type: 'cursorUpdate';
  userId: string;
  x: number;
  y: number;
}

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  lastMessage: MessageEvent | null;
  readyState: number;
  otherUsersCursors: Map<string, CursorPosition>;
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
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [otherUsersCursors, setOtherUsersCursors] = useState<Map<string, CursorPosition>>(new Map());

  useEffect(() => {
    // TODO: 인증 토큰이 있다면 URL에 추가하거나, 연결 후 메시지로 전송해야 합니다.
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setReadyState(ws.readyState);
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'cursorUpdate') {
          setOtherUsersCursors(prev => {
            const newMap = new Map(prev);
            newMap.set(data.userId, { x: data.x, y: data.y });
            return newMap;
          });
        }
        // TODO: 다른 메시지 타입 처리
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setReadyState(ws.readyState);
      // TODO: 필요시 재연결 로직 구현
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setReadyState(ws.readyState);
    };

    setSocket(ws);

    const userId = localStorage.getItem('userId') || `user_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('userId', userId);

    const handleMouseMove = (e: MouseEvent) => {
      if (ws.readyState === WebSocket.OPEN) {
        const message: CursorMessage = {
          type: 'cursorUpdate',
          userId: userId,
          x: e.clientX,
          y: e.clientY,
        };
        ws.send(JSON.stringify(message));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      ws.close();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.log('WebSocket is not connected.');
    }
  };

  const contextValue = {
    sendMessage,
    lastMessage,
    readyState,
    otherUsersCursors,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
