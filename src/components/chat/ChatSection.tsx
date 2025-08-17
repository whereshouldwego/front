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
import { useSidebar } from '../../stores/SidebarContext';

interface ChatSectionProps {
  onAuroraToggle?: (isActive: boolean) => void;
}

const ChatSection: React.FC<ChatSectionProps> = () => {
  const { messages, loading, sendMessage} = useChat();
  const { setActivePanel } = useSidebar();
  const [inputValue, setInputValue] = useState('');
  const [aiOn, setAiOn] = useState(false);
  const selfUserId = useMemo(() => localStorage.getItem('userId') || '', []);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 🆕 추천 응답이 오면 패널 자동 오픈
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.items?.length) setActivePanel('recommend');
    };
    window.addEventListener('recommend:payload', handler);
    return () => window.removeEventListener('recommend:payload', handler);
  }, [setActivePanel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    await sendMessage(inputValue.trim(), { isAi: aiOn } );
    setInputValue('');
    if (aiOn) setAiOn(false);
  };

  const formatTime = (date: Date): string => {
    // DB 시간이 UTC로 저장되어 표시 시간이 실제보다 느리게 보이는 문제 보정: +9시간(KST)
    const adjusted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return adjusted.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 새 메시지 도착 시 하단으로 스크롤
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // 안내 배너 표시 여부 (방별 1회 닫기 유지)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const code = (window.location.pathname.match(/\/rooms\/(.+)$/) || [])[1] || '';
    const key = code ? `chat_intro_banner_hidden::${code}` : '';
    if (!key) return true;
    return localStorage.getItem(key) !== '1';
  });

  const handleHideIntro = () => {
    const code = (window.location.pathname.match(/\/rooms\/(.+)$/) || [])[1] || '';
    if (code) {
      try { localStorage.setItem(`chat_intro_banner_hidden::${code}`, '1'); } catch {}
    }
    setShowIntro(false);
  };

  return (
    <div className={styles.chatSection}>
      {/* 메시지 목록 */}
      <div className={styles.messagesContainer} ref={listRef}>
        {showIntro && (
          <div className={styles.introBanner} onClick={handleHideIntro} role="button" title="클릭하여 닫기">
            <div className={styles.introTitle}>맛돌이 사용법 안내</div>
            <p className={styles.introText}>
안녕하세요! 저는 맛돌이 입니다.
아래에 맛돌이 활성화 버튼을 누른 후 정보를 알려주시면 약속 장소에 적합한 가게들을 추천드릴게요!
필요하다면 항상 절 찾아주세요!
            </p>
          </div>
        )}
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
      <button
        type="button"
        onClick={() => setAiOn(v => !v)}
        disabled={loading}
        className={styles.aiToggleButton}
        title={aiOn ? 'AI 추천 모드 끄기' : 'AI 추천 모드 켜기'}
      >
        <img 
          src={aiOn ? '/images/active_button.gif' : '/images/button.png'} 
          alt="AI 모드 토글"
          width="24"
          height="24"
        />
      </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={aiOn ? '예) 유성구 맛집 추천해줘' : '메시지를 입력하세요...'}
          className={styles.messageInput}
          disabled={loading}
        />
      </form>
    </div>
  );
};

export default ChatSection; 