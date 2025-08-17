/**
 * FavoritePanel.tsx
 *
 * 찜하기 패널 컴포넌트
 * 
 * 변경 사항:
 * - [추가] 카카오 로그인 후 기존 방으로 돌아가는 로직
 * - [추가] 로그인 버튼 클릭 시 카카오 OAuth 플로우 실행
 * - [추가] 로그인 성공 후 현재 방 코드로 돌아가기
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PANEL_CONFIGS, LOADING_MESSAGES, EMPTY_MESSAGES } from '../../constants/sidebar';
import styles from './SidebarPanels.module.css';

import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';

import { useFavorites } from '../../hooks/useFavorites';
import { useSidebar } from '../../stores/SidebarContext';

interface Props {
  userId: number;
}

// 카카오 로그인 응답 타입
interface KakaoLoginResponse {
  access_token?: string;
  nickname?: string;
  user_id?: string;
}

const FavoritePanel: React.FC<Props> = ({ userId }) => {
  const uid = userId ?? 1;
  const { items, loading, error } = useFavorites(uid);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { setSelectedRestaurantId, selectedRestaurantId } = useSidebar();
  const panelBodyRef = React.useRef<HTMLDivElement | null>(null);

  // 로그인 관련 상태
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ✅ [유지] 선택 강조 스타일
  const selectedStyle: React.CSSProperties = {
    boxShadow:
      'inset 0 0 0 2px rgba(59,130,246,0.65), 0 12px 20px rgba(0,0,0,0.12), 0 5px 10px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'visible',
  };

  // ✅ [유지] 그라데이션 글로우
  const gradientGlowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: -6,
    borderRadius: 12,
    background:
      'radial-gradient(60% 80% at 50% 0%, rgba(59,130,246,0.28), rgba(59,130,246,0) 70%) , linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.22))',
    filter: 'blur(12px)',
    opacity: 1,
    zIndex: 0,
    pointerEvents: 'none',
  };

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

  // 카카오 로그인 실패 공통 처리
  const handleKakaoFail = (message: string) => {
    console.error('[카카오 로그인 실패]', message);
    setLoginError(message);
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userType');
    } catch {}
    setIsLoginLoading(false);
  };

  // 카카오 로그인 후 기존 방으로 돌아가기
  const handleKakaoLoginReturnToRoom = async () => {
    try {
      setIsLoginLoading(true);
      setLoginError(null);
      
      const currentRoomCode = localStorage.getItem('roomCode');
      if (!currentRoomCode) {
        throw new Error('현재 방 정보를 찾을 수 없습니다.');
      }
      
      // 로그인 후 수행할 작업을 'returnToRoom'으로 설정
      localStorage.setItem('postLoginAction', 'returnToRoom');
      localStorage.setItem('pendingRoomCode', currentRoomCode);

      const kakaoLoginUrl = `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao`;
      window.location.href = kakaoLoginUrl;
    } catch (e: any) {
      console.error('카카오 로그인 시작 실패:', e);
      setLoginError(e?.message || '로그인을 시작할 수 없습니다.');
      setIsLoginLoading(false);
    }
  };

  // 카카오 로그인 콜백 처리 (OAuth 리디렉션 후)
  useEffect(() => {
    const handleCallback = async () => {
      const accessTokenFromQuery = searchParams.get('accessToken');
      const error = searchParams.get('error');

      if (accessTokenFromQuery) {
        try {
          setIsLoginLoading(true);
          setLoginError(null);

          localStorage.setItem('accessToken', accessTokenFromQuery);
          localStorage.setItem('userType', 'kakao');

          try {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, '', cleanUrl);
          } catch {}

          const intent = localStorage.getItem('postLoginAction');
          localStorage.removeItem('postLoginAction');

          if (intent === 'returnToRoom') {
            const roomCode = localStorage.getItem('pendingRoomCode');
            if (roomCode) {
              localStorage.removeItem('pendingRoomCode');
              
              const joinRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Authorization': `Bearer ${accessTokenFromQuery}`,
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
              
              navigate(`/rooms/${roomCode}`);
            }
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
          setIsLoginLoading(true);
          setLoginError(null);

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

          // 레거시 플로우에서도 동일하게: 기존 방으로 돌아가기
          const roomCode = localStorage.getItem('pendingRoomCode');
          if (roomCode) {
            localStorage.removeItem('pendingRoomCode');
            
            // 방 입장 API 호출
            const joinRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${finalToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (!joinRes.ok && joinRes.status !== 409) {
              const t = await joinRes.text().catch(() => '');
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
            
            // 현재 방 페이지로 이동
            navigate(`/rooms/${roomCode}`);
          }
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
  }, [searchParams, navigate]);

  // ✅ [추가] 선택된 카드로 스크롤 포커스 이동
  React.useEffect(() => {
    if (!selectedRestaurantId || !panelBodyRef.current) return;
    const target = panelBodyRef.current.querySelector(
      `[data-place-id="${selectedRestaurantId}"]`
    ) as HTMLElement | null;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedRestaurantId, items.length]);

  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.favorite.title}</h2>
          </div>
        </div>
      </div>

      {/* 바디 */}
      <div className={styles.panelBody} ref={panelBodyRef}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.LOADING}</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            {error.includes('로그인 후 이용해주세요') ? (
              <div className={styles.loginContainer}>
                <p className={styles.loginMessage}>로그인 후 이용해주세요</p>
                
                {/* 로그인 에러 표시 */}
                {loginError && (
                  <div className={styles.loginError}>
                    <strong>로그인 오류:</strong> {loginError}
                  </div>
                )}
                
                <button
                  className={`${styles.loginButton} ${styles.kakaoStyle}`}
                  onClick={handleKakaoLoginReturnToRoom}
                  disabled={isLoginLoading}
                >
                  {isLoginLoading ? (
                    <>
                      <div className={styles.loadingSpinner}></div>
                      로그인 중...
                    </>
                  ) : (
                    <>
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 7.955c.084.13.084.27 0 .4-.084.13-.252.195-.42.195H9.42c-.168 0-.336.065-.42.195-.084-.13-.084.27 0-.4.084-.13.252-.195.42-.195h8.067c.168 0 .336.065.42.195z"/>
                      </svg>
                      로그인
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p>{error}</p>
            )}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>찜한 맛집 ({items.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {items.map((restaurant) => {
                const selected = String(selectedRestaurantId) === String(restaurant.placeId);
                return (
                  <div
                    key={restaurant.placeId}
                    className={styles.favoriteItem}
                    data-place-id={restaurant.placeId}
                    style={selected ? selectedStyle : undefined}
                    onClick={() => setSelectedRestaurantId(String(restaurant.placeId))}
                  >
                    {selected && <div style={gradientGlowStyle} aria-hidden />}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <RestaurantCard
                        data={restaurant}
                        className={styles.restaurantCard}
                        actions={
                          <ActionButtons
                            userId={userId}
                            placeId={restaurant.placeId}
                            showFavoriteButton
                          />
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.favorite}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritePanel;
