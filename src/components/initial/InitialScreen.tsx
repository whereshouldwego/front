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
  roomCode: string; // 백엔드에서 받을 방 코드
  roomUrl: string;  // 백엔드에서 받을 방 URL
  roomId?: string;
}

const InitialScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 응답 헤더에서 토큰 추출
  const extractAccessToken = (headers: Headers): string | null => {
    const auth = headers.get('Authorization') || headers.get('authorization');
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    const custom =
      headers.get('X-Access-Token') ||
      headers.get('x-access-token') ||
      headers.get('Access-Token') ||
      headers.get('access-token');
    if (custom) return custom.trim();
    return null;
  };

  // 안전 JSON 파서
  async function parseJsonSafe<T>(res: Response, context: string): Promise<T> {
    if (res.status === 204) throw new Error(`${context}: 204 No Content`);
    const text = await res.text();
    if (!text) throw new Error(`${context}: 빈 응답`);
    try { return JSON.parse(text) as T; }
    catch (e) {
      console.error(`[parseJsonSafe] ${context} 원문:`, text);
      throw new Error(`${context}: JSON 파싱 오류`);
    }
  }

  // 카카오 로그인 콜백 처리
  useEffect(() => {
    const handleKakaoCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      if (code) {
        try {
          setIsLoading(true);
          const response = await fetch(`${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao?code=${code}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!response.ok) throw new Error('카카오 로그인 처리 실패');

          const kakaoData = await parseJsonSafe<KakaoLoginResponse>(response, '카카오 로그인 처리');
          localStorage.setItem('accessToken', kakaoData.access_token);
          localStorage.setItem('userNickname', kakaoData.nickname);
          localStorage.setItem('userId', kakaoData.user_id);

          await handleKakaoLoginSuccess(kakaoData);
        } catch (e) {
          console.error('카카오 로그인 실패:', e);
          alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
          setIsLoading(false);
        }
      } else if (error) {
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
    const kakaoLoginUrl = `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao`;
    window.location.href = kakaoLoginUrl;
  };

  // 카카오 로그인 후 방 생성
  const handleKakaoLoginSuccess = async (kakaoData: KakaoLoginResponse) => {
    try {
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
        const errorText = await response.text();
        console.error('서버 응답 에러:', response.status, errorText);
        throw new Error(`서버 오류 (${response.status}): 방 생성 실패`);
      }

      const data = await parseJsonSafe<RoomCreateResponse>(response, '방 생성(카카오)');
      const roomCode = data.roomCode;
      if (!roomCode) throw new Error('유효한 방 코드를 받지 못했습니다.');

      localStorage.setItem('roomCode', roomCode);
      navigate(`/rooms/${roomCode}`);
    } catch (e: any) {
      console.error('방 생성 실패:', e);
      alert(e?.message || '방 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 비회원으로 방 생성 (2·3단계 중요 변경 포함)
  const handleGuestCreateRoom = async () => {
    setIsLoading(true);

    let step1Ok = false;
    let step2Ok = false;
    let step3Ok = false;

    try {
      // === [STEP1] 방 생성 ===
      const roomResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, { method: 'POST' });
      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        console.error('❌ [STEP1] 방 생성 실패:', roomResponse.status, errorText);
        throw new Error(`서버 오류 (${roomResponse.status}): 방 생성 실패`);
      }
      const roomData = await parseJsonSafe<RoomCreateResponse>(roomResponse, '방 생성(비회원)');
      const roomCode = roomData.roomCode;
      if (!roomCode) throw new Error('유효한 방 코드를 받지 못했습니다.');

      localStorage.setItem('roomCode', roomCode);
      step1Ok = true;
      console.info('✅ [STEP1] 방 생성 성공:', { roomCode, roomUrl: roomData.roomUrl });

      // === [STEP2] 게스트 발급(헤더 토큰) ===
      const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${roomCode}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('❌ [STEP2] 게스트 생성 실패:', userResponse.status, errorText);
        throw new Error(`서버 오류 (${userResponse.status}): 사용자 생성 실패`);
      }

      const headerToken = extractAccessToken(userResponse.headers);
      let userId: string | number | undefined;
      let nickname: string | undefined;

      try {
        const text = await userResponse.clone().text();
        if (text) {
          const userData = JSON.parse(text) as { accessToken?: string; userId?: string | number; nickname?: string };
          userId = userData.userId;
          nickname = userData.nickname;
          if (!headerToken && userData.accessToken) {
            localStorage.setItem('accessToken', userData.accessToken);
          }
        }
      } catch {
        /* 바디가 없거나 JSON이 아닐 수 있음 */
      }

      const finalToken = headerToken || localStorage.getItem('accessToken') || '';
      if (!finalToken) throw new Error('게스트 토큰을 확인할 수 없습니다.');

      localStorage.setItem('accessToken', finalToken);
      if (userId !== undefined) localStorage.setItem('userId', String(userId));
      if (nickname !== undefined) localStorage.setItem('userNickname', nickname);
      localStorage.setItem('userType', 'guest');

      /* ★★★ 중요: 이 토큰이 어느 방에서 발급됐는지 표시하여
         RoomPage가 중복 발급을 건너뛰게 함 */
      localStorage.setItem('guestBoundRoomCode', roomCode); // <-- [ADD]

      step2Ok = true;
      console.info('✅ [STEP2] 게스트 생성/토큰 확보 성공:', { hasToken: !!finalToken, userId, nickname });

      // === [STEP3] 방 참여 ===
      const joinRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${finalToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!joinRes.ok && joinRes.status !== 409) {
        const t = await joinRes.text();
        console.error('❌ [STEP3] 방 입장 실패:', joinRes.status, t);
        throw new Error(`방 입장 실패 (${joinRes.status})`);
      }

      try {
        const bodyText = await joinRes.clone().text();
        if (bodyText) {
          const joinInfo = JSON.parse(bodyText) as { userId?: number | string; nickname?: string; color?: string };
          if (joinInfo?.userId != null) localStorage.setItem('userId', String(joinInfo.userId));
          if (joinInfo?.nickname) localStorage.setItem('userNickname', joinInfo.nickname);
          if (joinInfo?.color) localStorage.setItem('userColor', joinInfo.color);
        }
      } catch {/* 바디 없을 수 있음 */}

      /* ★★★ 중요: 이 탭에서는 이미 참여를 끝냈음을 표시
         RoomPage 첫 진입 시 "새 게스트 강제 발급"을 막아 줌 */
      sessionStorage.setItem(`joined::${roomCode}`, '1'); // <-- [ADD]

      step3Ok = true;
      console.info('✅ [STEP3] 방 입장 성공');

      // 최종 이동
      navigate(`/rooms/${roomCode}`);

    } catch (error: any) {
      console.error('방 입장 실패:', error);
      alert(error?.message || '방 생성/입장 중 문제가 발생했습니다.');
    } finally {
      console.info('[SUMMARY] 비회원 방 생성/입장 결과:', {
        step1_createRoom: step1Ok,
        step2_guestAndToken: step2Ok,
        step3_enterRoom: step3Ok
      });
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>여기갈래</h1>
          <p className={styles.subtitle}>그룹 식사 장소를 쉽게 정해보세요</p>
        </div>

        <div className={styles.buttonContainer}>
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

        <div className={styles.footer}>
          <p className={styles.footerText}>방을 생성하면 고유한 링크가 생성됩니다</p>
          <p className={styles.footerSubText}>링크를 친구들에게 공유해서 함께 식사 장소를 정하세요</p>
        </div>

        {isLoading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>{searchParams.get('code') ? '카카오 로그인 처리 중...' : '방을 생성하는 중...'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialScreen;
