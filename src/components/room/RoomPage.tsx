/**
 * RoomPage.tsx
 *
 * 요구사항 반영:
 * - ✅ 후보 패널(useCandidates)의 items를 받아 지도 마커로 변환
 * - ✅ 검색/찜/후보 마커 병합 시 같은 placeId는 후보가 우선
 * - ✅ MapContainer에는 최종 병합된 markers만 전달
 *
 * ★ [변경 요약]
 * - 카카오 로그인 토큰이 있으면(= userType==='kakao' && accessToken 존재) 게스트 발급(/api/auth/guest) 절대 호출하지 않고,
 *   곧바로 Authorization: Bearer <kakaoToken> 으로 방 입장 API 호출.
 * - 게스트 중복 생성 방지 로직(StrictMode 2회 마운트 대비)은 그대로 유지하되, 카카오 분기에서는 비활성.
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

/* 후보 훅 */
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

      // ★ [변경] StrictMode(개발모드)에서 useEffect 2번 문제로 인한 게스트 중복 발급 방지 키
      const authInFlightKey = `guestAuthInFlight::${id}`;

      // 현재 로컬 상태
      let token = localStorage.getItem('accessToken') || '';
      let uid = localStorage.getItem('userId') || '';
      let nick = localStorage.getItem('userNickname') || '';
      const bound = localStorage.getItem('guestBoundRoomCode') || '';
      const userType = localStorage.getItem('userType') || '';

      // ★ [변경] 카카오 로그인 여부(카카오면 게스트 발급 금지)
      const isKakao = userType === 'kakao' && !!token; // ← accessToken 존재까지 확인

      // 게스트 자격 보유 여부(게스트만 의미 있음)
      const hasLocalForThisRoom = !isKakao && !!token && bound === id; // ★ [변경] isKakao면 항상 false

      // ★ [변경] (게스트 전용) 첫 인스턴스가 토큰을 저장할 때까지 대기
      const waitForGuestToken = async (roomId: string, timeoutMs = 2000, stepMs = 100) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const t = localStorage.getItem('accessToken') || '';
          const b = localStorage.getItem('guestBoundRoomCode') || '';
          if (t && b === roomId) {
            token = t;
            uid = localStorage.getItem('userId') || '';
            nick = localStorage.getItem('userNickname') || '';
            return;
          }
          await new Promise(res => setTimeout(res, stepMs));
        }
      };

      const ensureGuestAuth = async (forceNew: boolean) => {
        if (isKakao) return; // ★ [변경] 카카오면 게스트 발급 절대 금지

        // (게스트) 다른 마운트가 발급 중이면 대기만
        if (sessionStorage.getItem(authInFlightKey) === '1') {
          await waitForGuestToken(id);
          return;
        }

        // (게스트) 내가 발급 시작
        sessionStorage.setItem(authInFlightKey, '1');

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
            'Authorization': `Bearer ${token}`, // ★ [중요] 카카오/게스트 공통 — 해당 토큰으로 참여
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

      /* ===== 실행 흐름 ===== */
      if (firstEntryInThisTab) {
        if (isKakao) {
          // ★ [변경] 카카오: 게스트 발급 없이 바로 참여
          await joinRoom();
        } else if (hasLocalForThisRoom) {
          await joinRoom();
        } else {
          await ensureGuestAuth(true);
          await joinRoom();
        }
        sessionStorage.setItem(joinedKey, '1');
      } else {
        if (isKakao) {
          // ★ [변경] 카카오: 재진입도 항상 카카오 토큰으로 참여
          await joinRoom();
        } else if (!token || bound !== id) {
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
                {/* 음식 이모티콘 비 애니메이션 */}
                <div className={styles.foodRain}>
          <div className={styles.foodDrop}>🍕</div>
          <div className={styles.foodDrop}>🍔</div>
          <div className={styles.foodDrop}>🍜</div>
          <div className={styles.foodDrop}>🍣</div>
          <div className={styles.foodDrop}>🍖</div>
          <div className={styles.foodDrop}>🍗</div>
          <div className={styles.foodDrop}>🥘</div>
          <div className={styles.foodDrop}>🍱</div>
          <div className={styles.foodDrop}>🥗</div>
          <div className={styles.foodDrop}>🍝</div>
          <div className={styles.foodDrop}>🍛</div>
          <div className={styles.foodDrop}>🥩</div>
          <div className={styles.foodDrop}>🍤</div>
          <div className={styles.foodDrop}>🥟</div>
          <div className={styles.foodDrop}>🍙</div>
          <div className={styles.foodDrop}>🍚</div>
          <div className={styles.foodDrop}>🍞</div>
          <div className={styles.foodDrop}>🥐</div>
        </div>
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
                  {/* roomCode를 명시적으로 넘겨줌 */}
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

/* === 이하 지도/찜/검색 로직 (변경 없음) === */
const RoomMainContent: React.FC<{ roomCode: string }> = ({ roomCode }) => {
  const { searchResults, setMapCenter, performSearch, selectedRestaurantId, mapCenter, setActivePanel } = useSidebar();
  const { sendCursorPosition, otherUsersPositions } = useWebSocket();

  const { favorites, favoriteIndex } = useRestaurantStore();
  const [stickyFavoriteById, setStickyFavoriteById] = useState<Record<string, Restaurant>>({});

  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [lastSearchCenter] = useState<MapCenter | null>(null);

  const handleCurrentLocationSearch = useCallback(async (center: MapCenter) => {
    try {
      setActivePanel('search');
      await performSearch({
        query: '',
        center: center,
      });
    } catch (error) {
      console.error('이 지역에서 검색 실패:', error);
    }
  }, [setActivePanel, performSearch]);

  /* (유지) 찜 상태 보강 */
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

  /* 검색/찜 마커 (좌표 방어적 파싱 + lat/lng 스왑) */
  const mapMarkers = useMemo<(MapMarker & { isFavorite?: boolean })[]>(() => {
    const toNum = (v: any) => (v == null ? null : Number(v));
    return (unionRestaurants ?? [])
      .map((r) => {
        const pid = toNum((r as any)?.placeId ?? (r as any)?.id ?? (r as any)?.place?.placeId ?? (r as any)?.place?.id);
        const rawLat = toNum((r as any)?.location?.lat ?? (r as any)?.lat ?? (r as any)?.place?.lat ?? (r as any)?.place?.y);
        const rawLng = toNum((r as any)?.location?.lng ?? (r as any)?.lng ?? (r as any)?.place?.lng ?? (r as any)?.place?.x);
        if (!pid || !Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return null;

        return {
          id: String(pid),
          position: { lat: rawLng as number, lng: rawLat as number }, // 좌표 스왑
          title: (r as any)?.name ?? (r as any)?.place?.name ?? `가게 ${pid}`,
          category: (r as any)?.category ?? undefined,
          restaurant: r,
          isFavorite: favoriteIdSet.has(Number(pid)),
        } as MapMarker & { isFavorite?: boolean };
      })
      .filter(Boolean) as (MapMarker & { isFavorite?: boolean })[];
  }, [unionRestaurants, favoriteIdSet]);

  /* 후보 목록 훅 */
  const { items: candidateItems, optimisticItems: optimisticCandidateItems } = useCandidates(roomCode);

  /* 후보 마커 생성 */
  const candidateMarkers = useMemo<(MapMarker & { isCandidate?: boolean })[]>(() => {
    const toNum = (v: any) => (v == null ? null : Number(v));

    const base =
      optimisticCandidateItems &&
      optimisticCandidateItems !== candidateItems &&
      optimisticCandidateItems.length > 0
        ? optimisticCandidateItems
        : candidateItems;

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
  }, [candidateItems, optimisticCandidateItems]);

  /* 최종 병합: 후보 우선 */
  const finalMapMarkers = useMemo(() => {
    const byId = new Map<string, MapMarker & { isFavorite?: boolean; isCandidate?: boolean }>();
    for (const m of mapMarkers) byId.set(String(m.id), m);
    for (const c of candidateMarkers) {
      const prev = byId.get(String(c.id));
      byId.set(String(c.id), { ...prev, ...c, isCandidate: true });
    }
    return Array.from(byId.values());
  }, [mapMarkers, candidateMarkers]);

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
