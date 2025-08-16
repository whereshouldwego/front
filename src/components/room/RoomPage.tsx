/**
 * RoomPage.tsx
 *
 * 요구사항 반영:
 * - ✅ 후보 패널(useCandidates)의 items를 그대로 받아 지도 마커로 변환
 * - ✅ 기존 검색/찜 마커와 병합 시, 같은 placeId는 후보가 우선 노출
 * - ✅ MapContainer에는 최종 병합된 markers만 내려줌
 *
 * ※ 그 외 기능/코드는 수정하지 않음
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { WebSocketProvider, useWebSocket } from '../../stores/WebSocketContext';
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext';
import { ChatProvider } from '../../stores/ChatContext';
import { useRestaurantStore } from '../../stores/RestaurantStore';

import Sidebar from '../sidebar/Sidebar';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import ChatSection from '../chat/ChatSection';

import styles from './RoomPage.module.css';
import type { MapCenter, MapEventHandlers, MapMarker, Restaurant } from '../../types';

/* ✅ [추가] 후보 패널과 동일한 훅을 사용해서 후보 리스트를 가져온다 */
import { useCandidates } from '../../hooks/useCandidates';

interface RoomData {
  id: string;
  name: string;
  participants: string[];
  createdAt: Date;
  isValid: boolean;
}

/* (유지) 유틸들 */
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
async function readJsonIfAny<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}
const ROOM_FULL_SENTINEL = '__ROOM_FULL__';

const RoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode?: string }>(); // 라우트는 /rooms/:roomCode
  const navigate = useNavigate();

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLoadingRef = useRef(false);
  const loadedRoomId = useRef<string | null>(null);

  const currentRoomId = roomCode || roomId;
  
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
    if (isLoadingRef.current || loadedRoomId.current === roomCode) return;
    loadRoomData(roomCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, navigate]);

  const loadRoomData = async (id: string) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const joinedKey = `joined::${id}`;
      const firstEntryInThisTab = sessionStorage.getItem(joinedKey) !== '1';

      // 현재 로컬 상태
      let token = localStorage.getItem('accessToken') || '';
      let uid = localStorage.getItem('userId') || '';
      let nick = localStorage.getItem('userNickname') || '';
      const bound = localStorage.getItem('guestBoundRoomCode') || '';

      const ensureGuestAuth = async (forceNew: boolean) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${id}`, {
          method: 'POST',
          credentials: forceNew ? 'omit' : 'include',
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
        localStorage.setItem('guestBoundRoomCode', id);
      };

      const joinRoom = async () => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        const resClone = res.clone();

        if (!res.ok && res.status !== 409) {
          const raw = await res.text().catch(() => '');
          const looksFull =
            res.status === 429 || res.status === 409 || res.status === 403 ||
            /full|capacity|limit|인원|정원|최대\s*인원/i.test(raw);

          if (looksFull) throw new Error(ROOM_FULL_SENTINEL);
          throw new Error(`방 참여 실패`);
        }

        const joined = await readJsonIfAny<{ userId?: number | string; nickname?: string; color?: string }>(resClone);
        if (joined?.userId != null) localStorage.setItem('userId', String(joined.userId));
        if (joined?.nickname) localStorage.setItem('userNickname', joined.nickname);
        if (joined?.color) localStorage.setItem('userColor', joined.color);
      };

      const hasLocalForThisRoom = !!token && !!uid && bound === id;

      if (firstEntryInThisTab) {
        if (hasLocalForThisRoom) {
          await joinRoom();
        } else {
          await ensureGuestAuth(true);
          await joinRoom();
        }
        sessionStorage.setItem(joinedKey, '1');
      } else {
        if (!token || !uid || bound !== id) {
          await ensureGuestAuth(false);
          await joinRoom();
          sessionStorage.setItem(joinedKey, '1');
        } else {
          await joinRoom();
        }
      }

      setRoomData({
        id,
        name: `방 ${id}`,
        participants: [],
        createdAt: new Date(),
        isValid: true
      });
      try { localStorage.setItem('roomCode', id); } catch {}
      loadedRoomId.current = id;

    } catch (e: any) {
      console.error('방 정보 로드 실패:', e);
      if (e?.message === ROOM_FULL_SENTINEL) setError(ROOM_FULL_SENTINEL);
      else setError(e?.message || '방을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleShareRoom = async () => {
    if (!roomData) return;
    try {
      const roomLink = `${window.location.origin}/rooms/${roomData.id}`;
      await navigator.clipboard.writeText(roomLink);
      alert('방 링크가 복사되었습니다! 친구들에게 공유해보세요.');
    } catch {
      alert('링크 복사에 실패했습니다.');
    }
  };

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

  if (error || !roomData) {
    const isRoomFull = error === ROOM_FULL_SENTINEL;
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>🚫</div>
          <h2 className={styles.errorTitle}>
            {isRoomFull ? '정원이 가득 찼어요' : (error || '방을 찾을 수 없습니다')}
          </h2>
          <p className={styles.errorDescription}>
            {isRoomFull
              ? '이 방은 최대 10명까지 입장할 수 있어요. 새 방을 만들거나 호스트에게 알려주세요.'
              : '방 코드가 올바른지 확인하거나, 새로운 방을 생성해보세요.'}
          </p>
          <div className={styles.errorButtons}>
            <button onClick={() => navigate('/')} className={`${styles.errorButton} ${styles.errorButtonPrimary}`}>
              새 방 만들기
            </button>
            <button onClick={() => window.history.back()} className={`${styles.errorButton} ${styles.errorButtonSecondary}`}>
              뒤로가기
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  {/* ✅ [변경] roomCode를 명시적으로 넘겨줌 */}
                  <RoomMainContent roomCode={roomData.id} />
                </div>
              </div>
            </div>

            <div className={styles.floatingButtonContainer}>
              <button onClick={handleShareRoom} className={styles.shareButton}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2z" />
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
  const [lastSearchCenter] = useState<MapCenter | null>(null);

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


  /* (유지) 찜 상태 보강 로직 */
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

  /* (유지) 검색/찜 마커 */
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

  /* ------------------------------------------------------------
   * ✅ [추가] 후보 패널의 items → 지도 마커로 변환
   *   - useCandidates(roomCode)와 CandidatePanel이 같은 소스 사용
   *   - 좌표 필드가 다양한 가능성을 고려하여 방어적으로 파싱
   * ------------------------------------------------------------ */
  const { items: candidateItems, optimisticItems: optimisticCandidateItems } = useCandidates(roomCode); // ✅ [추가]

  // optimisticItems가 있으면 우선 사용
  const candidateMarkers = useMemo<(MapMarker & { isCandidate?: boolean })[]>(() => {
    const toNum = (v: any) => (v == null ? null : Number(v));
    const base = optimisticCandidateItems ?? candidateItems;
    return (base ?? [])
      .map((it: any) => {
        const pid = toNum(it?.placeId ?? it?.id ?? it?.place?.placeId ?? it?.place?.id);
        const rawLat = toNum(it?.location?.lat ?? it?.lat ?? it?.place?.lat ?? it?.place?.y);
        const rawLng = toNum(it?.location?.lng ?? it?.lng ?? it?.place?.lng ?? it?.place?.x);
        if (!pid || !Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return null;

        return {
          id: String(pid),
          position: { lat: rawLng, lng: rawLat },
          title: it?.name ?? it?.place?.name ?? `후보 ${pid}`,
          restaurant: it,
          isCandidate: true,
        } as MapMarker & { isCandidate: boolean };
      })
      .filter(Boolean) as (MapMarker & { isCandidate: boolean })[];
  }, [candidateItems, optimisticCandidateItems]); // ✅ [추가]

  /* ✅ [추가] 최종 병합: 후보가 우선 덮어쓰기 */
  const finalMapMarkers = useMemo(() => {
    const byId = new Map<string, MapMarker & { isFavorite?: boolean; isCandidate?: boolean }>();
    for (const m of mapMarkers) byId.set(String(m.id), m); // 1) 기본(검색/찜)
    for (const c of candidateMarkers) {                    // 2) 후보로 덮어쓰기
      const prev = byId.get(String(c.id));
      byId.set(String(c.id), { ...prev, ...c, isCandidate: true });
    }
    return Array.from(byId.values());
  }, [mapMarkers, candidateMarkers]); // ✅ [추가]

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

  const handleCurrentLocationSearch = async (center: MapCenter) => {
    try {
      await performSearch({ query: '', center });
      setShowCurrentLocationButton(false);
      setLastSearchCenter(center);
    } catch {
      setShowCurrentLocationButton(false);
    }
  };
  useEffect(() => {
    console.log('[useCandidates] items:', candidateItems?.length ?? 0, candidateItems);
    console.log('[candidateMarkers] count:', candidateMarkers.length);
    console.log('[finalMapMarkers] candidates:', finalMapMarkers.filter(m => (m as any).isCandidate).length);
    console.log('[finalMapMarkers] length:', finalMapMarkers.length, finalMapMarkers);
  }, [candidateItems, candidateMarkers, finalMapMarkers]);

  const mapEventHandlers: MapEventHandlers = {
    onMapClick: (lat, lng) => console.log('지도 클릭:', lat, lng, '방:', roomCode),
    onMarkerClick: (markerId) => console.log('마커 클릭:', markerId, '방:', roomCode),
    onMapDragEnd: (center) => console.log('지도 드래그 종료:', center, '방:', roomCode),
    onMapZoomChanged: (level) => console.log('지도 줌 변경:', level, '방:', roomCode),
  };

  return (
    <div
      className="bg-gray-100 relative overflow-hidden"
      id="main-content"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}
    >
      <MapContainer
        /* ✅ [변경] 후보까지 합친 최종 마커 전달 */
        markers={finalMapMarkers as any}
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
