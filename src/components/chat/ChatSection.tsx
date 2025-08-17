/**
 * ChatSection.tsx
 *
 * 채팅 섹션 컴포넌트
 *
 * 기능:
 * - AI 챗봇과의 대화 인터페이스
 * - 메시지 전송 및 수신
 * - 채팅 히스토리 관리
 * - Aurora 버튼 토글 기능
 *
 * Props:
 * - onAuroraToggle: Aurora 버튼 토글 핸들러
 *
 * 사용된 Context:
 * - ChatContext: 채팅 상태 관리
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useChat } from '../../stores/ChatContext'; // Updated import
import type { ChatMessage } from '../../types';
import styles from './ChatSection.module.css';
import { colorFromString } from '../../utils/color';

interface ChatSectionProps {
  onAuroraToggle?: (isActive: boolean) => void;
}

const ChatSection: React.FC<ChatSectionProps> = () => {
  const { messages, loading, sendMessage} = useChat();
  const [inputValue, setInputValue] = useState('');
  const selfUserId = useMemo(() => localStorage.getItem('userId') || '', []);
  const listRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    await sendMessage(inputValue.trim());
    setInputValue('');
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 새 메시지 도착 시 하단으로 스크롤
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className={styles.chatSection}>
      {/* 메시지 목록 */}
      <div className={styles.messagesContainer} ref={listRef}>
        {messages.map((msg: ChatMessage, idx: number) => {
          const isMine = String(msg.userId ?? '') === String(selfUserId);
          const createdAt = msg.createdAt || msg.timestamp || new Date().toISOString();
          const key = msg.id ? `${msg.id}` : `${createdAt}|${idx}`;
          const displayName = msg.username || '익명';
          const userIdentifier = String(msg.userId ?? displayName);
          
          return (
          <div
            key={key}
            className={`${styles.message} ${
              isMine ? styles.userMessage : styles.botMessage
            }`}
          >
            {/* 사용자 아바타와 이름 (userPresence와 동일한 스타일) */}
            <div className={styles.userItem}>
              <div className={styles.userAvatar} style={{ backgroundColor: colorFromString(userIdentifier) }}>
                <svg className={styles.userIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <span className={styles.userNickname}>{displayName}</span>
            </div>
            
            {/* 메시지 버블 (시간 포함) */}
            <div className={styles.messageGroup}>
              <div className={styles.messageContent}>
                <p className={styles.messageText}>{msg.content}</p>
                <div className={styles.messageTime}>
                  {formatTime(new Date(createdAt))}
                </div>
              </div>
            </div>
          </div>
          );
        })}
        
        {loading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
            <div className={styles.userItem}>
              <div className={styles.userAvatar} style={{ backgroundColor: '#999' }}>
                <svg className={styles.userIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <span className={styles.userNickname}>입력중...</span>
            </div>
            <div className={styles.messageGroup}>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <form className={styles.inputContainer} onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className={styles.messageInput}
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!inputValue.trim() || loading}
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatSection; 