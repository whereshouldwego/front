import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// TODO: 실제 웹소켓 서버 주소로 변경해야 합니다.
const WEBSOCKET_URL = 'ws://localhost:8080'; // 예시 URL

interface WebSocketContextType {
  sendMessage: (message: any) => void;
  lastMessage: MessageEvent | null;
  readyState: number;
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

  useEffect(() => {
    // TODO: 인증 토큰이 있다면 URL에 추가하거나, 연결 후 메시지로 전송해야 합니다.
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setReadyState(ws.readyState);
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
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

    return () => {
      ws.close();
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
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
