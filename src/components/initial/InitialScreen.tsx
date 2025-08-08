/**
 * InitialScreen.tsx
 *
 * 방 생성 선택 화면
 *
 * 기능:
 * - 카카오 로그인 후 방 생성
 * - 비회원으로 방 생성
 * - 방 생성 시 고유 URL 생성
 * - 백엔드 응답 처리 및 에러 핸들링
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
  roomCode: string; // 백엔드에서 받을 방 코드 (예: "RQxvNA")
  roomUrl: string;  // 백엔드에서 받을 방 URL (예: "http://localhost:8080/api/rooms/RQxvNA")
  roomId?: string;  // 호환성을 위해 유지
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

  // 카카오 로그인 성공 후 방 생성 - 에러 처리 개선
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

      // 응답 상태 확인 개선
      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 응답 에러:', response.status, errorText);
        throw new Error(`서버 오류 (${response.status}): 방 생성에 실패했습니다.`);
      }

      // 백엔드 응답 파싱
      const data: RoomCreateResponse = await response.json();
      console.log('백엔드 응답 (카카오):', data);

      // roomCode 추출 (백엔드 응답 우선)
      const roomCode = data.roomCode;
      
      if (!roomCode) {
        throw new Error('서버에서 유효한 방 코드를 받지 못했습니다.');
      }
      
      console.log('카카오 로그인 사용자 방 생성 성공:', {
        roomCode: roomCode,
        roomUrl: data.roomUrl,
        nickname: kakaoData.nickname,
        userId: kakaoData.user_id
      });
      
      // 방 URL로 리다이렉트
      navigate(`/rooms/${roomCode}`);
      
    } catch (error) {
      console.error('방 생성 실패:', error);
      
      // 사용자 친화적 에러 처리
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          alert('네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검하고 다시 시도해주세요.');
        } else if (error.message.includes('서버 오류')) {
          alert('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          alert('방 생성에 실패했습니다. 카카오 로그인을 다시 시도해주세요.');
        }
      } else {
        alert('알 수 없는 오류가 발생했습니다. 다시 시도해주세요.');
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  // 비회원으로 방 생성 - 2단계 플로우
  const handleGuestCreateRoom = async () => {
    setIsLoading(true);
    
    try {
      // === 1단계: 방 생성 요청 ===
      const roomResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        method: 'POST'
      });

      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        console.error('방 생성 실패:', roomResponse.status, errorText);
        throw new Error(`서버 오류 (${roomResponse.status}): 방 생성에 실패했습니다.`);
      }

      const roomData: RoomCreateResponse = await roomResponse.json();
      console.log('1단계 - 방 생성 성공:', roomData);
      
      const roomCode = roomData.roomCode;
      if (!roomCode) {
        throw new Error('서버에서 유효한 방 코드를 받지 못했습니다.');
      }

      // === 2단계: 비회원 사용자 정보 생성 ===
      const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${roomCode}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('사용자 생성 실패:', userResponse.status, errorText);
        throw new Error(`서버 오류 (${userResponse.status}): 사용자 생성에 실패했습니다.`);
      }

      const userData = await userResponse.json();
      console.log('2단계 - 사용자 생성 성공:', userData);

      // 사용자 정보 저장
      localStorage.setItem('accessToken', userData.accessToken);
      localStorage.setItem('userNickname', userData.nickname);
      localStorage.setItem('userId', userData.userId);
      localStorage.setItem('userType', 'guest'); // 비회원 구분

      console.log('비회원 방 생성 완료:', {
        roomCode: roomCode,
        roomUrl: roomData.roomUrl,
        userId: userData.user_id,
        nickname: userData.nickname
      });

      // === 3단계: 방 입장 ===
      navigate(`/rooms/${roomCode}`);
      
    } catch (error) {
      console.error('방 생성 실패:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          alert('네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검하고 다시 시도해주세요.');
        } else if (error.message.includes('서버 오류')) {
          alert('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          alert('방 생성에 실패했습니다. 다시 시도해주세요.');
        }
      } else {
        alert('알 수 없는 오류가 발생했습니다. 다시 시도해주세요.');
      }
      
    } finally {
      setIsLoading(false);
    }
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