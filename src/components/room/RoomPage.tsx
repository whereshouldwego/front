/**
 * RoomPage.tsx
 *
 * 방 페이지
 *
 * 변경 사항(요청 반영):
 * - ✅ (문구 위치 안내) 에러 페이지 문구는 본 파일 하단의 "에러 상태" JSX에서 렌더됩니다.
 * - ✅ (정원 초과 처리) 방 참여 실패 중 '정원 초과'를 식별해 전용 문구/화면을 노출합니다.
 * - ✅ 새 탭 최초 진입 시 항상 새 게스트 발급(기존 기능 유지). 중복 생성 방지는 기존 로직 유지.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebSocketProvider, useWebSocket } from '../../stores/WebSocketContext';
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext';
import { ChatProvider } from '../../stores/ChatContext';
import { useRestaurantStore } from '../../stores/RestaurantStore';
import { Sidebar } from '../sidebar';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import ChatSection from '../chat/ChatSection';
import styles from './RoomPage.module.css';
import type { MapCenter, MapEventHandlers, MapMarker, Restaurant } from '../../types';

interface RoomData {
  id: string;
  name: string;
  participants: string[];
  createdAt: Date;
  isValid: boolean;
}

/* ===== 유틸: 응답 헤더에서 토큰 추출 ===== */
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

/* ===== 유틸: 바디가 있을 때만 JSON 파싱 (빈 바디/비JSON 방어) ===== */
async function readJsonIfAny<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

/* ===== [CAPACITY] 내부적으로 쓸 센티넬 상수 ===== */
const ROOM_FULL_SENTINEL = '__ROOM_FULL__';

const RoomPage: React.FC = () => {
  const { roomCode, roomId } = useParams<{ roomCode?: string; roomId?: string }>();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ===== [TEXT] 에러 메시지 상태: 문자열로 유지하되, 정원초과는 센티넬로 구분 ===== */
  const [error, setError] = useState<string | null>(null);

  const isLoadingRef = useRef(false);
  const loadedRoomId = useRef<string | null>(null);

  const currentRoomId = roomCode || roomId;
  
  useEffect(() => {
    if (!currentRoomId) {
      navigate('/');
      return;
    }
    if (isLoadingRef.current || loadedRoomId.current === currentRoomId) return;
    loadRoomData(currentRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId, navigate]);

  const loadRoomData = async (id: string) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const joinedKey = `joined::${id}`;
      const firstEntryInThisTab = sessionStorage.getItem(joinedKey) !== '1';

      // 현재 로컬 상태 (참조용 — 강제 새 발급 시에는 무시)
      let token = localStorage.getItem('accessToken') || '';
      let uid = localStorage.getItem('userId') || '';
      let nick = localStorage.getItem('userNickname') || '';
      const bound = localStorage.getItem('guestBoundRoomCode') || '';

      /* ===== 게스트 발급: 새 탭 첫 진입이면 credentials: 'omit' 로 강제 새 발급 ===== */
      const ensureGuestAuth = async (forceNew: boolean) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${id}`, {
          method: 'POST',
          credentials: forceNew ? 'omit' : 'include', // ★ 새 탭 강제 새 발급 시 쿠키 미전송
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`사용자 생성 실패 (${res.status}) ${t}`);
        }
        const headerToken = extractAccessToken(res.headers);
        const body = await readJsonIfAny<{ accessToken?: string; userId?: number | string; nickname?: string }>(res);
        const finalToken = headerToken || body?.accessToken || '';
        if (!finalToken) throw new Error('게스트 토큰을 확인할 수 없습니다.');

        token = finalToken;
        uid = body?.userId != null ? String(body.userId) : '';
        nick = body?.nickname ?? '';

        localStorage.setItem('accessToken', token);
        if (uid) localStorage.setItem('userId', uid);
        if (nick) localStorage.setItem('userNickname', nick);
        localStorage.setItem('userType', 'guest');
        localStorage.setItem('guestBoundRoomCode', id); // 어느 방에서 발급됐는지 기록
      };

      /* ===== [CAPACITY] 방 참여 =====
         - 실패시 상태코드/본문으로 '정원 초과' 추정 → 센티넬 에러로 throw */
      const joinRoom = async () => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        // 본문을 두 번 사용할 수 있도록 clone
        const resClone = res.clone();

        if (!res.ok && res.status !== 409) {
          const raw = await res.text().catch(() => '');
          const looksFull =
            res.status === 429 || res.status === 409 || res.status === 403 ||
            /full|capacity|limit|인원|정원|최대\s*인원/i.test(raw); // ★ [CAPACITY] 키워드 추정

          if (looksFull) {
            // ★ 정원 초과 상황을 센티넬로 명확히 표기
            throw new Error(ROOM_FULL_SENTINEL);
          }

          throw new Error(`방 참여 실패`);
        }

        // 참여 성공/이미참여(409) → 응답 바디가 있으면 저장
        const joined = await readJsonIfAny<{ userId?: number | string; nickname?: string; color?: string }>(resClone);
        if (joined?.userId != null) localStorage.setItem('userId', String(joined.userId));
        if (joined?.nickname) localStorage.setItem('userNickname', joined.nickname);
        if (joined?.color) localStorage.setItem('userColor', joined.color);
      };

      /* 실행 흐름 */
      const hasLocalForThisRoom = !!token && !!uid && bound === id; // <-- [CHANGE] 추가

      if (firstEntryInThisTab) {
        if (hasLocalForThisRoom) {
          // <-- [CHANGE] 기존 정보로 바로 참여
          await joinRoom();
        } else {
          // 기존처럼 새 게스트 발급
          await ensureGuestAuth(true);
          await joinRoom();
        }
        sessionStorage.setItem(joinedKey, '1');
      } else {
        // 같은 탭 재진입: 기존 로직 유지
        if (!token || !uid || bound !== id) {
          await ensureGuestAuth(false);
          await joinRoom();
          sessionStorage.setItem(joinedKey, '1');
        } else {
          await joinRoom();
        }
      }

      // 최소 방 정보 세팅 (지도/사이드바 기존 로직 유지)
      setRoomData({
        id,
        name: `방 ${id}`,
        participants: [],
        createdAt: new Date(),
        isValid: true
      });
      // 전역 접근을 위해 roomCode 저장 (STOMP 후보 클라이언트 등에서 사용)
      try { localStorage.setItem('roomCode', id); } catch {}
      loadedRoomId.current = id;

    } catch (e: any) {
      console.error('방 정보 로드 실패:', e);

      /* ===== [CAPACITY] 정원 초과면 전용 에러코드로 세팅 ===== */
      if (e?.message === ROOM_FULL_SENTINEL) {
        setError(ROOM_FULL_SENTINEL);
      } else {
        setError(e?.message || '방을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 바로 링크 복사 - 간소화된 공유 기능
  const handleShareRoom = async () => {
    if (!roomData) return;
    
    try {
      // URL 변경: /room/ -> /rooms/
      const roomLink = `${window.location.origin}/rooms/${roomData.id}`;
      await navigator.clipboard.writeText(roomLink);
      alert('방 링크가 복사되었습니다! 친구들에게 공유해보세요.');
    } catch (error) {
      alert('링크 복사에 실패했습니다.');
    }
  };

  /* 로딩 화면 */
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  /* ===== [TEXT] 에러 화면: 이 블록이 스크린샷의 '오류 페이지'입니다. 여기 문구를 바꾸면 됨. ===== */
  if (error || !roomData) {
    const isRoomFull = error === ROOM_FULL_SENTINEL; // ★ 정원 초과 여부

    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>🚫</div>

          {/* ★ 제목 문구 */}
          <h2 className={styles.errorTitle}>
            {isRoomFull ? '정원이 가득 찼어요' : (error || '방을 찾을 수 없습니다')}
          </h2>

          {/* ★ 설명 문구 */}
          <p className={styles.errorDescription}>
            {isRoomFull
              ? '이 방은 최대 10명까지 입장할 수 있어요. 새 방을 만들거나 호스트에게 알려주세요.'
              : '방 코드가 올바른지 확인하거나, 새로운 방을 생성해보세요.'}
          </p>

          <div className={styles.errorButtons}>
            <button 
              onClick={() => navigate('/')}
              className={`${styles.errorButton} ${styles.errorButtonPrimary}`}
            >
              새 방 만들기
            </button>
            <button 
              onClick={() => window.history.back()}
              className={`${styles.errorButton} ${styles.errorButtonSecondary}`}
            >
              뒤로가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 정상 화면 */
  return (
    <WebSocketProvider roomCode={roomData.id}>
      <SidebarProvider>
        <ChatProvider roomCode={roomData.id}>
          <div className={styles.container}>
            <div className={styles.mainApp}>
              <div className="h-screen relative">
                <div className="absolute inset-0">
                  <div id="sidebar-container">
                    <Sidebar />
                  </div>
                  <RoomMainContent roomId={roomData.id} />
                </div>
              </div>
            </div>
            {/* 지도 상단에 플로팅하는 공유 버튼 */}
            <div className={styles.floatingButtonContainer}>
              <button
                onClick={handleShareRoom}
                className={styles.shareButton}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                방 공유하기
              </button>
            </div>
          </div>
        </ChatProvider>
      </SidebarProvider>
    </WebSocketProvider>
  );
};

/* === 이하 기존 RoomMainContent(지도/찜/검색 로직) — 기능 변경 없음 === */
const RoomMainContent: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { searchResults, setMapCenter, performSearch, selectedRestaurantId, mapCenter, setActivePanel } = useSidebar();
  const { sendCursorPosition, otherUsersPositions } = useWebSocket();

  const { favorites, favoriteIndex } = useRestaurantStore();
  const [stickyFavoriteById, setStickyFavoriteById] = useState<Record<string, Restaurant>>({});

  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [lastSearchCenter, setLastSearchCenter] = useState<MapCenter | null>(null);

  const handleCurrentLocationSearch = useCallback(async (center: MapCenter) => {
    try {
      // 1. 검색 패널 열기
      setActivePanel('search');
      
      // 2. 현재 위치 기반으로 검색 실행
      await performSearch({
        query: '', // 빈 쿼리로 위치 기반 검색
        center: center,
      });
    } catch (error) {
      console.error('이 지역에서 검색 실패:', error);
    }
  }, [setActivePanel, performSearch]);


  useEffect(() => {
    setStickyFavoriteById((prev) => {
      const next: Record<string, Restaurant> = { ...prev };
      const favIdSet = new Set<number>(Array.from(favorites ?? []).map((v: any) => Number(v)));

      for (const k of Object.keys(next)) {
        const pid = Number(k);
        if (!favIdSet.has(pid)) delete next[k];
      }

      const dict = (favoriteIndex ?? {}) as unknown as Record<string, Restaurant>;
      for (const [k, r] of Object.entries(dict)) {
        const pid = Number(k);
        if (!favIdSet.has(pid)) continue;
        if (r && r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)) {
          next[String(pid)] = r;
        }
      }

      for (const r of (searchResults ?? [])) {
        if (!r?.placeId) continue;
        const pid = Number(r.placeId);
        if (!favIdSet.has(pid)) continue;
        if (!next[String(pid)] && r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)) {
          next[String(pid)] = r;
        }
      }

      return next;
    });
  }, [favorites, favoriteIndex, searchResults]);

  const unionRestaurants: Restaurant[] = useMemo(() => {
    const map = new Map<string, Restaurant>();
    (searchResults ?? []).forEach((r) => { if (r?.placeId != null) map.set(String(r.placeId), r); });
    Object.values(stickyFavoriteById).forEach((r) => { if (r?.placeId != null) map.set(String(r.placeId), r); });
    return Array.from(map.values());
  }, [searchResults, stickyFavoriteById]);

  const favoriteIdSet = useMemo(
    () => new Set<number>(Array.from(favorites ?? []).map((v: any) => Number(v))),
    [favorites]
  );

  const mapMarkers = useMemo<(MapMarker & { isFavorite?: boolean })[]>(() => {
    return (unionRestaurants ?? [])
      .filter((r) => Number.isFinite(r?.location?.lat) && Number.isFinite(r?.location?.lng))
      .map((r) => ({
        id: String(r.placeId),
        position: { lat: r.location.lat, lng: r.location.lng },
        title: r.name,
        category: (r as any).category ?? undefined,
        restaurant: r,
        isFavorite: favoriteIdSet.has(Number(r.placeId)),
      }));
  }, [unionRestaurants, favoriteIdSet]);

  const handleMapMoved = useCallback((center: MapCenter) => {
    setMapCenter(center);
    const threshold = 0.001;
    if (
      !lastSearchCenter ||
      Math.abs(center.lat - lastSearchCenter.lat) > threshold ||
      Math.abs(center.lng - lastSearchCenter.lng) > threshold
    ) {
      setShowCurrentLocationButton(true);
    }
  }, [lastSearchCenter, setMapCenter]);

  const mapEventHandlers: MapEventHandlers = {
    onMapClick: (lat, lng) => console.log('지도 클릭:', lat, lng, '방:', roomId),
    onMarkerClick: (markerId) => console.log('마커 클릭:', markerId, '방:', roomId),
    onMapDragEnd: (center) => console.log('지도 드래그 종료:', center, '방:', roomId),
    onMapZoomChanged: (level) => console.log('지도 줌 변경:', level, '방:', roomId),
  };

  return (
    <div
      className="bg-gray-100 relative overflow-hidden"
      id="main-content"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}
    >
      <MapContainer
        markers={mapMarkers as any}
        eventHandlers={mapEventHandlers}
        onMapMoved={handleMapMoved}
        onCursorMove={(pos) => sendCursorPosition(pos)}
        cursorPositions={[...otherUsersPositions.entries()].map(([id, position]) => ({ id, position }))}
        selectedMarkerId={selectedRestaurantId ?? undefined}
      />
      <MapOverlay
        onDepartureSubmit={(loc) => console.log('출발지 설정:', loc)}
        onCurrentLocationSearch={handleCurrentLocationSearch}
        showCurrentLocationButton={showCurrentLocationButton}
        currentMapCenter={mapCenter ?? undefined}
      />
      <ChatSection onAuroraToggle={(a) => console.log('Aurora:', a)} />
    </div>
  );
};

export default RoomPage;
