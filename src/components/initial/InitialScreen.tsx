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

  // [유틸] 응답 헤더에서 토큰 추출 (Authorization: Bearer xxx 또는 X-Access-Token 등)
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

  // [유틸] 안전 JSON 파서
  async function parseJsonSafe<T>(res: Response, context: string): Promise<T> {
    if (res.status === 204) {
      throw new Error(`${context}: 서버에서 내용이 없는 응답(204)을 반환했습니다.`);
    }
    const text = await res.text();
    if (!text) {
      throw new Error(`${context}: 서버가 빈 응답을 반환했습니다.`);
    }
    try {
      return JSON.parse(text) as T;
    } catch (_) {
      console.error(`[parseJsonSafe] ${context} 응답 원문:`, text);
      throw new Error(`${context}: 응답 형식(JSON) 오류`);
    }
  }

  // 카카오 로그인 성공 후 콜백 처리
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

          if (!response.ok) {
            throw new Error('카카오 로그인 처리에 실패했습니다.');
          }

          const kakaoData = await parseJsonSafe<KakaoLoginResponse>(response, '카카오 로그인 처리');
          
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

  // 카카오 로그인 성공 후 방 생성 - 에러 처리 개선
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
        throw new Error(`서버 오류 (${response.status}): 방 생성에 실패했습니다.`);
      }

      const data = await parseJsonSafe<RoomCreateResponse>(response, '방 생성(카카오)');
      const roomCode = data.roomCode;
      if (!roomCode) {
        throw new Error('서버에서 유효한 방 코드를 받지 못했습니다.');
      }

      // roomCode 저장 (다른 컴포넌트에서 활용 가능)
      localStorage.setItem('roomCode', roomCode);

      navigate(`/rooms/${roomCode}`);
      
    } catch (error) {
      console.error('방 생성 실패:', error);
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          alert('네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검하고 다시 시도해주세요.');
        } else if (error.message.includes('서버 오류')) {
          alert('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else if (error.message.includes('응답 형식') || error.message.includes('빈 응답')) {
          alert('방 생성 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
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

  // 비회원으로 방 생성 - 2단계/3단계 변경 반영 + 단계별 콘솔 로깅
  const handleGuestCreateRoom = async () => {
    setIsLoading(true);

    // 단계별 성공 여부 플래그
    let step1Ok = false; // 방 생성
    let step2Ok = false; // 게스트 생성/토큰 확보
    let step3Ok = false; // 방 입장

    try {
      // === [STEP1] 방 생성 요청 ===
      const roomResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms`, {
        method: 'POST'
      });

      if (!roomResponse.ok) {
        const errorText = await roomResponse.text();
        console.error('❌ [STEP1] 방 생성 실패:', roomResponse.status, errorText);
        throw new Error(`서버 오류 (${roomResponse.status}): 방 생성에 실패했습니다.`);
      }

      const roomData = await parseJsonSafe<RoomCreateResponse>(roomResponse, '방 생성(비회원)');
      const roomCode = roomData.roomCode;
      if (!roomCode) {
        console.error('❌ [STEP1] 유효한 roomCode 누락:', roomData);
        throw new Error('서버에서 유효한 방 코드를 받지 못했습니다.');
      }

      // roomCode 저장 (참조 용)
      localStorage.setItem('roomCode', roomCode);
      step1Ok = true;
      console.info('✅ [STEP1] 방 생성 성공:', { roomCode, roomUrl: roomData.roomUrl });

      // === [STEP2] 비회원 사용자 생성 (헤더 토큰 추출) ===
      const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${roomCode}`, {
        method: 'POST',
        credentials: 'include', // 서버가 세션/쿠키를 병행한다면 유지
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('❌ [STEP2] 게스트 생성 실패:', userResponse.status, errorText);
        throw new Error(`서버 오류 (${userResponse.status}): 사용자 생성에 실패했습니다.`);
      }

      const headerToken = extractAccessToken(userResponse.headers);
      if (!headerToken) {
        console.warn('[STEP2] 응답 헤더에 토큰이 없습니다. (바디에서 보조 파싱 시도)');
      }

      // 바디 파싱(선택): userId/nickname 확보용
      let userId: string | number | undefined;
      let nickname: string | undefined;
      try {
        const text = await userResponse.clone().text();
        if (text) {
          const userData = JSON.parse(text) as { accessToken?: string; userId?: string | number; nickname?: string };
          userId = userData.userId;
          nickname = userData.nickname;
          if (!headerToken && userData.accessToken) {
            console.log('[STEP2] 바디 accessToken 사용 (헤더 미제공)');
            localStorage.setItem('accessToken', userData.accessToken);
          }
        }
      } catch {
        // 바디가 없거나 JSON이 아니어도 흐름 유지 (헤더 토큰만으로 진행)
      }

      const finalToken = headerToken || localStorage.getItem('accessToken') || '';
      if (!finalToken) {
        console.error('❌ [STEP2] 게스트 토큰 부재');
        throw new Error('게스트 토큰을 확인할 수 없습니다.');
      }

      // 로컬 저장
      localStorage.setItem('accessToken', finalToken);
      if (userId !== undefined) localStorage.setItem('userId', String(userId));
      if (nickname !== undefined) localStorage.setItem('userNickname', nickname);
      localStorage.setItem('userType', 'guest');

      step2Ok = true;
      console.info('✅ [STEP2] 게스트 생성/토큰 확보 성공:', {
        hasToken: !!finalToken,
        userId,
        nickname
      });

      // === [STEP3] 방 입장 ===
      // ▶ 약속방 참여 API 사양 반영:
      //    - 헤더: Authorization: Bearer {access token}
      //    - 응답 바디: { userId, nickname, color }
      const roomEnterUrl = `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`;

      // [FIX-STEP3] 기본은 POST로 시도. 405면 GET 폴백은 유지하되, 성공 시 응답 바디를 JSON으로 파싱하여 저장.
      let enterMethod: 'POST' | 'GET' = 'POST';
      let enterRes = await fetch(roomEnterUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${finalToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (enterRes.status === 405) {
        console.warn('[STEP3] POST 405 → GET 폴백 시도');
        enterMethod = 'GET';
        enterRes = await fetch(roomEnterUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${finalToken}`
          }
        });
      }

      // 이미 참가(409) 등은 성공으로 간주
      if (!enterRes.ok && enterRes.status !== 409) {
        const t = await enterRes.text();
        console.error(`❌ [STEP3] 방 입장 실패(${enterMethod}):`, enterRes.status, t);
        throw new Error(`방 입장에 실패했습니다. (${enterRes.status})`);
      }

      // [FIX-STEP3] ✅ 참여 성공 시 응답 바디(JSON)에서 userId, nickname, color를 저장
      try {
        if (enterRes.ok) {
          const joinInfo = await parseJsonSafe<{ userId: number | string; nickname: string; color: string }>(
            enterRes,
            '방 입장 응답 파싱'
          );
          // 닉네임/색상 최신값으로 덮어쓰기
          if (joinInfo?.userId !== undefined) localStorage.setItem('userId', String(joinInfo.userId));
          if (joinInfo?.nickname) localStorage.setItem('userNickname', joinInfo.nickname);
          if (joinInfo?.color) localStorage.setItem('userColor', joinInfo.color); // ← 새로 저장
          console.info('✅ [STEP3] 참여 응답 수신:', joinInfo);
        } else if (enterRes.status === 409) {
          console.info('ℹ️ [STEP3] 이미 참여 중(409) → 바디 없음 가능');
        }
      } catch (e) {
        // 응답 바디가 비어있거나 JSON이 아닐 수도 있으므로 흐름 유지
        console.warn('⚠️ [STEP3] 참여 응답 파싱 스킵/실패:', e);
      }

      step3Ok = true;
      console.info(`✅ [STEP3] 방 입장 성공 (${enterMethod})`, { status: enterRes.status });

      // 최종 이동
      navigate(`/rooms/${roomCode}`);
      
    } catch (error) {
      console.error('방 입장 플로우 실패:', error);
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          alert('네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검하고 다시 시도해주세요.');
        } else if (error.message.includes('서버 오류')) {
          alert('서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else if (error.message.includes('응답 형식') || error.message.includes('빈 응답')) {
          alert('사용자 생성 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          alert(error.message || '방 생성/입장에 실패했습니다. 다시 시도해주세요.');
        }
      } else {
        alert('알 수 없는 오류가 발생했습니다. 다시 시도해주세요.');
      }
      
    } finally {
      // 단계 요약 로그
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
