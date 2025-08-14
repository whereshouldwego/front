/**
 * InitialScreen.tsx
 *
 * 방 생성 선택 화면
 *
 * 기능:
 * - [변경] 버튼 클릭 시 먼저 방 생성 -> roomCode/roomUrl을 스토리지에 저장 후 카카오 로그인으로 이동
 * - [변경] 카카오 로그인 콜백에서 토큰 확보 후, 저장된 roomCode로 방참여(fetch) 수행 및 /rooms/{roomCode} 로 이동
 * - 비회원으로 방 생성 (기존 로직 유지)
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
  roomCode: string; // 백엔드에서 받을 방 코드
  roomUrl: string;  // 백엔드에서 받을 방 URL
  roomId?: string;
}

// ★ [추가] 방 생성 후 콜백까지 기억할 키들
const STORAGE_KEYS = {
  pendingRoomCode: 'pendingRoomCode',
  pendingRoomUrl: 'pendingRoomUrl',
};

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

  // ★ [추가] 카카오 로그인 완료 후: 저장된 roomCode로 방참여
  const joinSavedRoomWithToken = async (accessToken: string) => {
    // 1) 방코드 조회: pendingRoomCode(우선) -> roomCode(백업)
    const roomCode =
      localStorage.getItem(STORAGE_KEYS.pendingRoomCode) ||
      localStorage.getItem('roomCode') ||
      '';

    if (!roomCode) {
      throw new Error('방 코드가 없습니다. (로그인 전에 방을 생성해주세요)');
    }

    // 2) 방참여 요청
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
      throw new Error(`방 입장 실패 (${joinRes.status}) ${t}`);
    }

    // 3) (선택) 응답 바디에 userId/nickname/color가 있으면 저장
    try {
      const text = await joinRes.clone().text();
      if (text) {
        const joinInfo = JSON.parse(text) as { userId?: number | string; nickname?: string; color?: string };
        if (joinInfo?.userId != null) localStorage.setItem('userId', String(joinInfo.userId));
        if (joinInfo?.nickname) localStorage.setItem('userNickname', joinInfo.nickname);
        if (joinInfo?.color) localStorage.setItem('userColor', joinInfo.color);
      }
    } catch { /* 바디가 없거나 JSON이 아닐 수 있음 */ }

    // 4) 이 탭에서 이미 참여 완료 표시(중복 발급 방지 용도)
    sessionStorage.setItem(`joined::${roomCode}`, '1');

    // 5) pending 키 정리
    localStorage.removeItem(STORAGE_KEYS.pendingRoomCode);
    localStorage.removeItem(STORAGE_KEYS.pendingRoomUrl);

    // 6) 방 화면으로 이동
    navigate(`/rooms/${roomCode}`);
  };

  // 카카오 로그인 콜백 처리
  useEffect(() => {
    const handleKakaoCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      // 콜백 쿼리에 code가 있을 때만 처리
      if (code) {
        try {
          setIsLoading(true);
          // ✅ 서버가 이 요청을 통해 액세스 토큰을 헤더/바디에 내려주는 것으로 가정
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao?code=${code}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            }
          );
          if (!response.ok) throw new Error('카카오 로그인 처리 실패');

          // 1) 헤더 우선으로 액세스 토큰 추출
          const headerToken = extractAccessToken(response.headers);

          // 2) (백업) 바디에서도 토큰/유저정보 시도
          let bodyToken = '';
          let nickname = '';
          let userId = '';
          try {
            const kakaoData = await parseJsonSafe<KakaoLoginResponse>(response.clone(), '카카오 로그인 처리'); // ★ clone() 사용
            bodyToken = kakaoData.access_token || '';
            nickname = kakaoData.nickname || '';
            userId = kakaoData.user_id || '';
          } catch {
            // 바디가 없거나 JSON이 아닐 수 있으므로 무시
          }

          const finalToken = headerToken || bodyToken;
          if (!finalToken) throw new Error('액세스 토큰을 확인할 수 없습니다.');

          // 3) 로컬 저장
          localStorage.setItem('accessToken', finalToken);
          if (nickname) localStorage.setItem('userNickname', nickname);
          if (userId) localStorage.setItem('userId', userId);
          localStorage.setItem('userType', 'kakao');

          // 4) ★ 변경: 로그인 직후 "저장해둔 방"으로 참가 요청 후 이동
          await joinSavedRoomWithToken(finalToken);
        } catch (e) {
          console.error('카카오 로그인 콜백 처리 실패:', e);
          alert('로그인 후 방 입장 과정에서 문제가 발생했습니다. 다시 시도해주세요.');
          setIsLoading(false);
        }
        return; // 콜백 처리 분기 종료
      }

      if (error) {
        console.error('카카오 로그인 실패:', error);
        alert('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
        setIsLoading(false);
      }
    };

    handleKakaoCallback();
  }, [searchParams]);

  // ★ [변경] 카카오 로그인 시작: 먼저 방 생성 -> roomCode 저장 -> 카카오 로그인으로 이동
  const handleKakaoCreateRoom = async () => {
    try {
      setIsLoading(true);

      // 1) 방 생성 (비로그인 허용 가정)
      const createRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!createRes.ok) {
        const t = await createRes.text().catch(() => '');
        throw new Error(`서버 오류 (${createRes.status}): 방 생성 실패 ${t}`);
      }
      const data = await parseJsonSafe<RoomCreateResponse>(createRes, '방 생성(카카오 사전 생성)');
      const roomCode = data.roomCode;
      if (!roomCode) throw new Error('유효한 방 코드를 받지 못했습니다.');

      // 2) 생성된 방을 localStorage에 저장(콜백에서 사용)
      localStorage.setItem('roomCode', roomCode); // 기존 키 유지
      localStorage.setItem(STORAGE_KEYS.pendingRoomCode, roomCode);     // ★ 콜백용
      localStorage.setItem(STORAGE_KEYS.pendingRoomUrl, data.roomUrl);  // ★ (참고용)

      // 3) 카카오 로그인으로 이동
      const kakaoLoginUrl = `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao`;
      window.location.href = kakaoLoginUrl;
    } catch (e: any) {
      console.error('카카오 로그인 시작(사전 방 생성) 실패:', e);
      alert(e?.message || '방 생성에 실패했습니다.');
      setIsLoading(false);
    }
  };

  // 비회원으로 방 생성 (기존 기능 유지 — 변경 없음)
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

      /* 중요: 이 토큰이 어느 방에서 발급됐는지 표시하여
         RoomPage가 중복 발급을 건너뛰게 함 */
      localStorage.setItem('guestBoundRoomCode', roomCode);

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

      // 이 탭에서는 이미 참여를 끝냈음을 표시
      sessionStorage.setItem(`joined::${roomCode}`, '1');

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
