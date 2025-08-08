/**
 * InitialScreen.tsx
 *
 * 방 생성 선택 화면
 *
 * 기능:
 * - 카카오 로그인 후 방 생성
 * - 비회원으로 방 생성
 * - 방 생성 시 고유 URL 생성
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './InitialScreen.module.css';

interface KakaoLoginResponse {
  access_token: string;
  nickname: string;
  user_id: string;
}

interface RoomCreateResponse {
  roomCode: string; // 백엔드에서 받을 방 코드
  roomId?: string; // 호환성을 위해 유지
}

const InitialScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 카카오 로그인 성공 후 콜백 처리
  useEffect(() => {
    const handleKakaoCallback = async () => {
      // URL에서 인증 코드 확인 (카카오에서 리다이렉트된 경우)
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (code) {
        // 카카오 로그인 성공 - 백엔드에서 토큰 교환
        try {
          setIsLoading(true);
          
          const response = await fetch(`${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao?code=${code}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error('카카오 로그인 처리에 실패했습니다.');
          }

          const kakaoData: KakaoLoginResponse = await response.json();
          
          // 토큰과 사용자 정보 저장
          localStorage.setItem('accessToken', kakaoData.access_token);
          localStorage.setItem('userNickname', kakaoData.nickname);
          localStorage.setItem('userId', kakaoData.user_id);
          
          // 카카오 로그인 성공 후 방 생성
          await handleKakaoLoginSuccess(kakaoData);
          
        } catch (error) {
          console.error('카카오 로그인 처리 실패:', error);
          alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
          setIsLoading(false);
        }
      } else if (error) {
        // 카카오 로그인 실패
        console.error('카카오 로그인 실패:', error);
        alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
        setIsLoading(false);
      }
    };

    handleKakaoCallback();
  }, [searchParams]);

  // 카카오 로그인 시작
  const handleKakaoCreateRoom = () => {
    setIsLoading(true);
    
    // 백엔드 카카오 OAuth 엔드포인트로 리다이렉트
    const kakaoLoginUrl = `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao`;
    window.location.href = kakaoLoginUrl;
  };

  // 카카오 로그인 성공 후 방 생성
  const handleKakaoLoginSuccess = async (kakaoData: KakaoLoginResponse) => {
    try {
      // 서버에 로그인된 사용자로 방 생성 요청
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kakaoData.access_token}`
        },
        body: JSON.stringify({ 
          creatorType: 'kakao',
          creatorId: kakaoData.user_id,
          creatorName: kakaoData.nickname
        })
      });

      if (!response.ok) {
        throw new Error('방 생성에 실패했습니다.');
      }

      const data: RoomCreateResponse = await response.json();
      const roomCode = data.roomCode || data.roomId || generateRoomId(); // 백엔드에서 받거나 임시 생성
      
      console.log('카카오 로그인 사용자 방 생성 성공:', {
        roomCode,
        nickname: kakaoData.nickname,
        userId: kakaoData.user_id
      });
      
      // 방 URL로 리다이렉트 - rooms로 변경
      navigate(`/rooms/${roomCode}`);
      
    } catch (error) {
      console.error('방 생성 실패:', error);
      
      // 실패 시 임시 방 생성 (개발용)
      const roomCode = generateRoomId();
      console.log('임시 방 생성:', roomCode);
      navigate(`/rooms/${roomCode}`);
      
    } finally {
      setIsLoading(false);
    }
  };

  // 비회원으로 방 생성
  const handleGuestCreateRoom = async () => {
    setIsLoading(true);
    
    try {
      // 서버에 비회원 방 생성 요청
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorType: 'guest' })
      });

      if (!response.ok) {
        throw new Error('방 생성에 실패했습니다.');
      }

      const data: RoomCreateResponse = await response.json();
      const roomCode = data.roomCode || data.roomId || generateRoomId(); // 백엔드에서 받거나 임시 생성
      
      console.log('비회원 방 생성 성공:', roomCode);
      
      // 방 URL로 리다이렉트 - rooms로 변경
      navigate(`/rooms/${roomCode}`);
      
    } catch (error) {
      console.error('방 생성 실패:', error);
      
      // 실패 시 임시 방 생성 (개발용)
      const roomCode = generateRoomId();
      console.log('임시 방 생성:', roomCode);
      navigate(`/rooms/${roomCode}`);
      
    } finally {
      setIsLoading(false);
    }
  };

  // 방 코드 생성 (6자리 랜덤 코드) - fallback용
  const generateRoomId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 헤더 - 로고 제거 */}
        <div className={styles.header}>
          <h1 className={styles.title}>여기갈래</h1>
          <p className={styles.subtitle}>그룹 식사 장소를 쉽게 정해보세요</p>
        </div>

        {/* 방 생성 옵션 */}
        <div className={styles.buttonContainer}>
          {/* 카카오 로그인 후 방 생성 */}
          <button
            onClick={handleKakaoCreateRoom}
            className={`${styles.button} ${styles.kakaoButton}`}
            disabled={isLoading}
          >
            <div className={styles.buttonContent}>
              <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={styles.buttonText}>카카오 로그인 후 방 생성</span>
            </div>
            <p className={styles.buttonDescription}>카카오톡 계정으로 로그인하고 방을 생성하세요</p>
          </button>

          {/* 비회원으로 방 생성 */}
          <button
            onClick={handleGuestCreateRoom}
            className={`${styles.button} ${styles.guestButton}`}
            disabled={isLoading}
          >
            <div className={styles.buttonContent}>
              <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className={styles.buttonText}>비회원으로 방 생성</span>
            </div>
            <p className={styles.buttonDescription}>로그인 없이 바로 방을 생성하고 시작하세요</p>
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            방을 생성하면 고유한 링크가 생성됩니다
          </p>
          <p className={styles.footerSubText}>
            링크를 친구들에게 공유해서 함께 식사 장소를 정하세요
          </p>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>
              {searchParams.get('code') ? '카카오 로그인 처리 중...' : '방을 생성하는 중...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialScreen;