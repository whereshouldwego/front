/**
 * ChatContext.tsx
 * 
 * 기존 파일: src/app/ChatComponent.js
 * 변환 내용:
 * - 채팅 메시지 상태를 전역적으로 관리
 * - 메시지 전송 및 수신 기능
 * - React Context API 사용
 */


import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage, PlaceDetail } from '../types';
import { chatAPI } from '../lib/api';
import SockJS from 'sockjs-client';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

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
  roomCode?: string; // 현재 방 코드
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, roomCode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const userIdRef = useRef<string>('');
  const cacheKeyRef = useRef<string>('');
  const messageIdSetRef = useRef<Set<string>>(new Set());

  const getCacheKey = useCallback((code: string) => `chat_history_${code}`, []);
  const loadCache = useCallback((code: string): ChatMessage[] => {
    try {
      const raw = localStorage.getItem(getCacheKey(code));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr as ChatMessage[] : [];
    } catch { return []; }
  }, [getCacheKey]);
  const saveCache = useCallback((code: string, msgs: ChatMessage[]) => {
    try { localStorage.setItem(getCacheKey(code), JSON.stringify(msgs)); } catch {}
  }, [getCacheKey]);

  // 내 사용자 ID 로드
  useEffect(() => {
    userIdRef.current = localStorage.getItem('userId') || '';
  }, []);

  // STOMP 연결 및 구독, 히스토리 로드
  useEffect(() => {
    if (!roomCode) return;

    let isActive = true;
    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '';
    const endpoint = `${String(API_BASE_URL).replace(/\/$/, '')}/ws`;
    cacheKeyRef.current = getCacheKey(roomCode);

    // 우선 로컬 캐시 복원 (즉시 표시)
    const cached = loadCache(roomCode);
    if (cached.length > 0) {
      // 캐시를 우선 중복 제거하여 로드
      const uniq = new Map<string, ChatMessage>();
      const keyOf = (m: ChatMessage) => {
        const idStr = String(m.id ?? '');
        return idStr || `${m.createdAt ?? ''}|${m.content ?? ''}`;
      };
      cached.forEach((m) => uniq.set(keyOf(m), m));
      const deduped = Array.from(uniq.values());
      deduped.forEach((m) => {
        const s = String(m.id ?? '');
        if (s) messageIdSetRef.current.add(s);
      });
      setMessages(deduped);
    }

    const accessToken = localStorage.getItem('accessToken') || '';
    const client = new Client({
      // SockJS를 사용한 연결
      webSocketFactory: () => new SockJS(endpoint),
      reconnectDelay: 1500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // STOMP CONNECT 시 Authorization 헤더로 토큰 전달
      connectHeaders: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
      onStompError: (frame) => {
        console.error('[STOMP ERROR]', frame.headers['message'], frame.body);
        if (isActive) setError('채팅 서버 오류가 발생했습니다.');
      },
      onWebSocketError: (evt) => {
        console.error('[WS ERROR]', evt);
        if (isActive) setError('네트워크 오류가 발생했습니다.');
      },
    });

    client.onConnect = async () => {
      // 방 히스토리 로드 → 기존 메시지와 머지
      try {
        const history = await chatAPI.getRoomHistory(roomCode);
        if (Array.isArray(history)) {
          setMessages((prev) => {
            const uniq = new Map<string, ChatMessage>();
            const keyOf = (m: ChatMessage) => {
              const idStr = String(m.id ?? '');
              return idStr || `${m.createdAt ?? ''}|${m.content ?? ''}`;
            };
            prev.forEach((m) => uniq.set(keyOf(m), m));
            history.forEach((m) => uniq.set(keyOf(m), m));
            const merged = Array.from(uniq.values()).sort((a, b) =>
              String(a.createdAt).localeCompare(String(b.createdAt))
            );
            // 병합 결과의 ID들을 등록
            merged.forEach((m) => {
              const s = String(m.id ?? '');
              if (s) messageIdSetRef.current.add(s);
            });
            saveCache(roomCode, merged);
            return merged;
          });
        }
      } catch (e) {
        console.warn('[CHAT] history load failed', e);
      }

      // 구독 설정 (히스토리 로드 후)
      const destination = `/topic/chat.${roomCode}`;
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = client.subscribe(destination, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body) as ChatMessage;
          if (!data.createdAt) (data as any).createdAt = new Date().toISOString();
          const idStr = String((data as any).id ?? '');
          // 중복 메시지 방지
          if (idStr && messageIdSetRef.current.has(idStr)) return;
          if (idStr) messageIdSetRef.current.add(idStr);
          setMessages((prev) => {
            // prev에 동일 ID가 있으면 무시
            if (idStr && prev.some((m) => String(m.id ?? '') === idStr)) return prev;
            const next = [...prev, data];
            saveCache(roomCode, next);
            return next;
          });
        } catch (e) {
          console.warn('[STOMP] invalid message', e);
        }
      });
    };

    // 방 변경 시 기존 ID 집합 초기화
    messageIdSetRef.current.clear();
    client.activate();
    clientRef.current = client;

    return () => {
      isActive = false;
      try { subscriptionRef.current?.unsubscribe(); } catch {}
      try { client.deactivate(); } catch {}
      clientRef.current = null;
      subscriptionRef.current = null;
        messageIdSetRef.current.clear();
    };
  }, [roomCode]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !roomCode) return;
    const client = clientRef.current;
    if (!client || !client.connected) return;

    const payload = {
      roomCode: roomCode,
      userId: userIdRef.current ? Number(userIdRef.current) : null,
      username: localStorage.getItem('userNickname') || undefined,
      content: message,
    };

    try {
      setLoading(true);
      client.publish({
        destination: `/ws/chat.${roomCode}`,
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('[STOMP publish error]', e);
      setError('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  const clearMessages = useCallback(() => {
    setMessages([]);
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