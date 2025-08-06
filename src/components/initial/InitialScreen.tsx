/**
 * InitialScreen.tsx
 *
 * 앱 초기 화면 컴포넌트
 *
 * 기능:
 * - 비회원 방생성 / 회원 방생성 선택
 * - 카카오 로그인 연동
 * - 앱 진입 전 사용자 타입 결정
 */

import React, { useState } from 'react';
import styles from './InitialScreen.module.css';

interface InitialScreenProps {
  onEnterApp: (userType: 'guest' | 'member', userData?: any) => void;
}

const InitialScreen: React.FC<InitialScreenProps> = ({ onEnterApp }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleGuestEntry = () => {
    onEnterApp('guest');
  };

  const handleMemberEntry = () => {
    // 카카오 로그인 모달을 열거나 직접 로그인 처리
    setIsLoginModalOpen(true);
    // 임시로 바로 진입 (실제로는 로그인 완료 후)
    setTimeout(() => {
      onEnterApp('member', { name: '사용자', id: 'user123' });
    }, 1000);
  };

  const handleLoginModalClose = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h1 className={styles.title}>여기갈래</h1>
          <p className={styles.subtitle}>그룹 식사 장소 결정 플랫폼</p>
        </div>

        {/* 선택 버튼들 */}
        <div className={styles.buttonContainer}>
          {/* 비회원 방생성 */}
          <button
            onClick={handleGuestEntry}
            className={`${styles.button} ${styles.guestButton}`}
          >
            <div className={styles.buttonContent}>
              <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className={styles.buttonText}>비회원 방생성</span>
            </div>
            <p className={styles.buttonDescription}>로그인 없이 바로 시작하기</p>
          </button>

          {/* 회원 방생성 */}
          <button
            onClick={handleMemberEntry}
            className={`${styles.button} ${styles.memberButton}`}
          >
            <div className={styles.buttonContent}>
              <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={styles.buttonText}>회원 방생성</span>
            </div>
            <p className={styles.buttonDescription}>카카오 로그인으로 더 많은 기능 이용하기</p>
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            비회원으로도 모든 기능을 이용할 수 있습니다
          </p>
          <p className={styles.footerSubText}>
            회원 가입 시 개인화된 추천과 히스토리 저장이 가능합니다
          </p>
        </div>
      </div>

      {/* 로딩 오버레이 (로그인 처리 중) */}
      {isLoginModalOpen && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>카카오 로그인 중...</p>
            {/* 취소 버튼 추가 */}
            <button 
              onClick={handleLoginModalClose} // ✅ 함수 사용
              className={styles.cancelButton}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InitialScreen;