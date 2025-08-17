/**
 * InitialScreen.tsx
 *
 * 변경 요약:
 * - [유지] href 리디렉션 후 /?accessToken=... 처리
 * - ★ [변경] "카카오 로그인 후 방 생성" 플로우: 토큰 확보 후 "방 생성만" 하고 즉시 /rooms/:code 로 이동
 *   (방 입장 API 호출은 RoomPage에서 수행) — 백엔드 지침의 3단계 절차에 정확히 맞춤
 * - ★ [유지] 실패 시 개발용 에러 배너 노출, 게스트 폴백 금지
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './InitialScreen.module.css';

interface KakaoLoginResponse {
  access_token?: string;
  nickname?: string;
  user_id?: string;
}
interface RoomCreateResponse {
  roomCode: string;
  roomUrl: string;
  roomId?: string;
}

const STORAGE_KEYS = {
  pendingRoomCode: 'pendingRoomCode',
  pendingRoomUrl: 'pendingRoomUrl',
  postLoginAction: 'postLoginAction',
};

const InitialScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [devError, setDevError] = useState<string | null>(null); // 개발용 에러 배너
  const navigate = useNavigate();

  // 레거시 호환용 헤더 토큰 추출
  const extractAccessToken = (headers: Headers): string | null => {
    const auth = headers.get('Authorization') || headers.get('authorization');
    if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    const custom =
      headers.get('X-Access-Token') ||
      headers.get('x-access-token') ||
      headers.get('Access-Token') ||
      headers.get('access-token');
    return custom ? custom.trim() : null;
  };

  // 안전 JSON 파싱
  async function parseJsonSafe<T>(res: Response, context: string): Promise<T> {
    const text = await res.text();
    if (!text) throw new Error(`${context}: 빈 응답`);
    try { return JSON.parse(text) as T; }
    catch {
      console.error(`[parseJsonSafe] ${context} 원문:`, text);
      throw new Error(`${context}: JSON 파싱 오류`);
    }
  }

  // 카카오 실패 공통 처리
  const handleKakaoFail = (message: string) => {
    console.error('[카카오 로그인 실패 - 개발용 표시]', message);
    setDevError(message);
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userType');
    } catch {}
    setIsLoading(false);
  };

  // ★ [유지] (옵션) 저장된 방으로 바로 입장 — 현재 요구사항 범위 밖이지만 기존 호환성 유지
  const joinSavedRoomWithToken = async (accessToken: string) => {
    const roomCode =
      localStorage.getItem(STORAGE_KEYS.pendingRoomCode) ||
      localStorage.getItem('roomCode') || '';

    if (!roomCode) {
      throw new Error('방 코드가 없습니다. (로그인 전에 방을 생성했는지 확인해주세요)');
    }

    const joinRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!joinRes.ok && joinRes.status !== 409) {
      const t = await joinRes.text().catch(() => '');
      if (joinRes.status === 401 || joinRes.status === 403) {
        throw new Error(`카카오 인증 실패(rooms/${roomCode}): ${joinRes.status} ${t}`);
      }
      throw new Error(`방 입장 실패 (${joinRes.status}) ${t}`);
    }

    try {
      const text = await joinRes.clone().text();
      if (text) {
        const joinInfo = JSON.parse(text) as { userId?: number | string; nickname?: string; color?: string };
        if (joinInfo?.userId != null) localStorage.setItem('userId', String(joinInfo.userId));
        if (joinInfo?.nickname) localStorage.setItem('userNickname', joinInfo.nickname);
        if (joinInfo?.color) localStorage.setItem('userColor', joinInfo.color);
      }
    } catch {}

    sessionStorage.setItem(`joined::${roomCode}`, '1');
    localStorage.removeItem(STORAGE_KEYS.pendingRoomCode);
    localStorage.removeItem(STORAGE_KEYS.pendingRoomUrl);

    navigate(`/rooms/${roomCode}`);
  };

  // ★ [변경] 로그인 후 "방 생성만 하고" 즉시 /rooms/:code 로 이동 (입장은 RoomPage에서 처리)
  const createRoomThenNavigate = async () => {
    // 1) 방 생성
    const createRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!createRes.ok) {
      const t = await createRes.text().catch(() => '');
      throw new Error(`서버 오류 (${createRes.status}): 방 생성 실패 ${t}`);
    }
    const data = await parseJsonSafe<RoomCreateResponse>(createRes, '방 생성(로그인 후)');
    const roomCode = data.roomCode;
    if (!roomCode) throw new Error('유효한 방 코드를 받지 못했습니다.');

    localStorage.setItem('roomCode', roomCode);

    // 2) ★ [변경] 곧바로 방 URL로 이동 (입장 API 호출은 RoomPage가 담당)
    //    → 백엔드 지시: "프론트에서 /rooms/:code 로 바꾸고 방 입장 API 호출"
    //    호출 자체는 RoomPage 마운트 시 수행하도록 위임
    navigate(`/rooms/${roomCode}`);
  };

  // 카카오 로그인 콜백 처리
  useEffect(() => {
    const handleCallback = async () => {
      const accessTokenFromQuery = searchParams.get('accessToken');
      const error = searchParams.get('error');

      if (accessTokenFromQuery) {
        try {
          setIsLoading(true);
          setDevError(null);

          // ★ [변경] 토큰 저장 + 카카오 사용자 플래그
          localStorage.setItem('accessToken', accessTokenFromQuery);
          localStorage.setItem('userType', 'kakao'); // 카카오 사용자 표식

          // URL 깨끗이
          try {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, '', cleanUrl);
          } catch {}

          // 의도 수행
          const intent = localStorage.getItem(STORAGE_KEYS.postLoginAction);
          localStorage.removeItem(STORAGE_KEYS.postLoginAction);

          if (intent === 'createRoom') {
            // ★ [변경] 방 생성 후 이동(입장은 RoomPage에게 맡김)
            await createRoomThenNavigate();
          } else if (localStorage.getItem(STORAGE_KEYS.pendingRoomCode)) {
            // (옵션) 저장된 방으로 바로 입장 — 기존 호환 유지
            await joinSavedRoomWithToken(accessTokenFromQuery);
          } else {
            setIsLoading(false);
          }
        } catch (e: any) {
          handleKakaoFail(e?.message || '카카오 로그인 후 작업에 실패했습니다.');
        }
        return;
      }

      // 레거시 code 플로우(혼재 환경 대응)
      const code = searchParams.get('code');
      if (code) {
        try {
          setIsLoading(true);
          setDevError(null);

          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao?code=${code}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          if (!response.ok) throw new Error('카카오 로그인 처리 실패');

          const headerToken = extractAccessToken(response.headers);
          let bodyToken = '';
          let nickname = '';
          let userId = '';
          try {
            const kakaoData = await response.clone().json() as KakaoLoginResponse;
            bodyToken = kakaoData.access_token || '';
            nickname = kakaoData.nickname || '';
            userId = kakaoData.user_id || '';
          } catch {}

          const finalToken = headerToken || bodyToken;
          if (!finalToken) throw new Error('액세스 토큰을 확인할 수 없습니다.');

          localStorage.setItem('accessToken', finalToken);
          localStorage.setItem('userType', 'kakao');
          if (nickname) localStorage.setItem('userNickname', nickname);
          if (userId) localStorage.setItem('userId', userId);

          // ★ [변경] 레거시 플로우에서도 동일하게: 방 생성 후 이동
          await createRoomThenNavigate();
        } catch (e: any) {
          handleKakaoFail(e?.message || '카카오 로그인 처리에 실패했습니다.');
        }
        return;
      }

      if (error) {
        handleKakaoFail(`카카오 로그인 실패: ${error}`);
      }
    };

    handleCallback();
  }, [searchParams]);

  // 카카오 로그인 후 방 생성 버튼
  const handleKakaoCreateRoom = async () => {
    try {
      setIsLoading(true);
      setDevError(null);
      localStorage.setItem(STORAGE_KEYS.postLoginAction, 'createRoom');

      // ★ [유지] ① href 카카오 로그인 요청
      const kakaoLoginUrl = `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao`;
      window.location.href = kakaoLoginUrl;
    } catch (e: any) {
      console.error('카카오 로그인 시작 실패:', e);
      setDevError(e?.message || '로그인을 시작할 수 없습니다.');
      setIsLoading(false);
    }
  };

  // 비회원 방 생성(기존 기능, 카카오 실패 시 자동 폴백은 없음)
  const handleGuestCreateRoom = async () => {
    setIsLoading(true);
    try {
      const roomResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, { method: 'POST' });
      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        throw new Error(`서버 오류 (${roomResponse.status}): 방 생성 실패 ${errorText}`);
      }
      const roomData = await parseJsonSafe<{ roomCode: string; roomUrl: string }>(roomResponse, '방 생성(비회원)');
      const roomCode = roomData.roomCode;
      if (!roomCode) throw new Error('유효한 방 코드를 받지 못했습니다.');
      localStorage.setItem('roomCode', roomCode);

      // 게스트 발급
      const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${roomCode}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        throw new Error(`서버 오류 (${userResponse.status}): 사용자 생성 실패 ${errorText}`);
      }

      let finalToken = extractAccessToken(userResponse.headers) || '';
      try {
        const text = await userResponse.clone().text();
        if (text) {
          const userData = JSON.parse(text) as { accessToken?: string; userId?: string | number; nickname?: string };
          if (!finalToken && userData.accessToken) finalToken = userData.accessToken;
          if (userData.userId != null) localStorage.setItem('userId', String(userData.userId));
          if (userData.nickname) localStorage.setItem('userNickname', userData.nickname);
        }
      } catch {}

      if (!finalToken) throw new Error('게스트 토큰을 확인할 수 없습니다.');

      localStorage.setItem('accessToken', finalToken);
      localStorage.setItem('userType', 'guest');
      localStorage.setItem('guestBoundRoomCode', roomCode);

      // 방 입장
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
        throw new Error(`방 입장 실패 (${joinRes.status}) ${t}`);
      }
      sessionStorage.setItem(`joined::${roomCode}`, '1');

      navigate(`/rooms/${roomCode}`);
    } catch (error: any) {
      console.error('방 생성/입장 실패:', error);
      setDevError(error?.message || '방 생성/입장 중 문제가 발생했습니다.');
    } finally {
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

        {/* 개발용 에러 배너 */}
        {devError && (
          <div className="mt-3 mb-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            <strong>개발용 안내:</strong> {devError}
          </div>
        )}

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
            <p className={styles.buttonDescription}>카카오 계정으로 로그인하고 방을 생성합니다</p>
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
            <p className={styles.buttonDescription}>로그인 없이 바로 시작합니다</p>
          </button>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>방을 생성하면 고유한 링크가 생성됩니다</p>
          <p className={styles.footerSubText}>링크를 친구들에게 공유해서 함께 정하세요</p>
        </div>

        {isLoading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>{searchParams.get('accessToken') ? '로그인 처리 중...' : (searchParams.get('code') ? '카카오 로그인 처리 중...' : '방을 생성하는 중...')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialScreen;
