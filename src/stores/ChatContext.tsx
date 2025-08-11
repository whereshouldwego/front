/**
 * ChatContext.tsx
 * 
 * 기존 파일: src/app/ChatComponent.js
 * 변환 내용:
 * - 채팅 메시지 상태를 전역적으로 관리
 * - 메시지 전송 및 수신 기능
 * - React Context API 사용
 */


import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ChatMessage, ChatRequest } from '../types';
import { chatAPI, isApiSuccess, isApiError } from '../lib/api';

interface ChatContextType {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: '안녕하세요! 맛돌이입니다. 어떤 음식을 찾고 계신가요?',
      timestamp: new Date().toISOString(),
      roomCode: '1234567890',
      userId: 1234567890,
      createdAt: new Date().toISOString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      roomCode: '1234567890',
      userId: 1234567890,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      // API 요청
      const request: ChatRequest = {
        userId: 'current-user', // 실제로는 사용자 ID를 가져와야 함
        message: message,
        context: {
          history: messages.slice(-5) // 최근 5개 메시지만 컨텍스트로 전송
        }
      };

      const response = await chatAPI.sendMessage(request);
      
      if (isApiSuccess(response)) {
        // 봇 응답 추가
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response.data.message || '응답을 받았습니다.',
          timestamp: new Date().toISOString(),
          roomCode: '1234567890',
          userId: 1234567890,
          createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);
      } else if (isApiError(response)) {
        setError(response.error.message || '메시지 전송 중 오류가 발생했습니다.');
        
        // 에러 메시지 추가
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          roomCode: '1234567890',
          userId: 1234567890,
          createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      setError('메시지 전송 중 오류가 발생했습니다.');
      
      // 에러 메시지 추가
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '죄송합니다. 네트워크 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
        roomCode: '1234567890',
        userId: 1234567890,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        content: '안녕하세요! 맛돌이입니다. 어떤 음식을 찾고 계신가요?',
        timestamp: new Date().toISOString(),
        roomCode: '1237890',
        userId: 1234567890,
        createdAt: new Date().toISOString()
      }
    ]);
    setError(null);
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const value: ChatContextType = {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
    addMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 