/**
 * RoomPage.tsx
 *
 * 요구사항 반영:
 * - ✅ 검색핀은 검색 패널에서만 표시
 * - ✅ 후보/찜 핀은 사용자가 삭제할 때까지 항상 표시
 * - ✅ 후보(useCandidates)의 items를 지도 마커로 변환 후 기존 마커와 병합(같은 placeId면 후보가 우선)
 * - ✅ [추가] 후보 ID/객체 로컬 캐시(메모리 + localStorage)로 패널 전환 공백 제거
 * - ✅ [추가] 후보 패널에서 마커 변경 시 MapContainer 강제 리마운트로 즉시 반영
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

/* === 이하 지도/찜/검색/후보 로직 === */
const RoomMainContent: React.FC<{ roomCode: string }> = ({ roomCode }) => {
  const { 
    searchResults, setMapCenter, performSearch, 
    selectedRestaurantId, mapCenter, setActivePanel,
    activePanel,
  } = useSidebar();

  const { sendCursorPosition, otherUsersPositions } = useWebSocket();

  const { favorites, favoriteIndex } = useRestaurantStore();
  const [stickyFavoriteById, setStickyFavoriteById] = useState<Record<string, Restaurant>>({});

  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [lastSearchCenter] = useState<MapCenter | null>(null);

  // 검색 패널일 때만 검색핀 포함
  const isSearchPanel = useMemo(() => {
    const key = String(activePanel || '').toLowerCase();
    return key === 'search';
  }, [activePanel]);

  /* (유지) 방별 후보 삭제 tombstone - 읽기/필터만 사용 */
  const TOMB_EVENT = 'candidate:tombstones-changed';
  const tombKey = (room: string) => `__candidate_tombstones__::${room}`;
  const readTombs = (room: string): Set<number> => {
    try {
      const raw = localStorage.getItem(tombKey(room));
      const arr: any[] = raw ? JSON.parse(raw) : [];
      return new Set(arr.map((v) => Number(v)).filter((v) => Number.isFinite(v)));
    } catch { return new Set(); }
  };
  const [candidateTombstones, setCandidateTombstones] = useState<Set<number>>(() => readTombs(roomCode));
  useEffect(() => { setCandidateTombstones(readTombs(roomCode)); }, [roomCode]);
  useEffect(() => {
    const onChange = (e: any) => { if (!e?.detail || e.detail.roomCode === roomCode) setCandidateTombstones(readTombs(roomCode)); };
    const onStorage = (e: StorageEvent) => { if (e.key && e.key === tombKey(roomCode)) setCandidateTombstones(readTombs(roomCode)); };
    window.addEventListener(TOMB_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(TOMB_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [roomCode]);

  const handleCurrentLocationSearch = useCallback(async (center: MapCenter) => {
    try {
      setActivePanel('search');
      await performSearch({ query: '', center });
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

  /* ✅ [추가] 후보 ID/객체 캐시 (영속) — 패널 이동/일시 공백에도 후보 핀 유지 */
  const cidKey = (room: string) => `__candidate_ids__::${room}`;                 // ✅ [추가] 후보 ID set 저장 키
  const readCidSet = (room: string): Set<number> => {                            // ✅ [추가] 로딩
    try {
      const raw = localStorage.getItem(cidKey(room));
      const arr: any[] = raw ? JSON.parse(raw) : [];
      return new Set(arr.map((v) => Number(v)).filter(Number.isFinite));
    } catch { return new Set(); }
  };
  const writeCidSet = (room: string, set: Set<number>) => {                      // ✅ [추가] 저장
    try {
      localStorage.setItem(cidKey(room), JSON.stringify(Array.from(set)));
    } catch {}
  };
  const [stickyCandidateById, setStickyCandidateById] = useState<Record<string, Restaurant>>({}); // ✅ [추가] 마지막으로 본 후보 Restaurant 캐시

  /* 검색/찜 소스 분리 */
  const searchRestaurants: Restaurant[] = useMemo(
    () => (isSearchPanel ? (searchResults ?? []) : []),
    [isSearchPanel, searchResults]
  );
  const favoriteRestaurants: Restaurant[] = useMemo(
    () => Object.values(stickyFavoriteById),
    [stickyFavoriteById]
  );

  /* 검색/찜 마커 (좌표 방어적 파싱 + lat/lng 스왑) */
  const mapMarkers = useMemo<(MapMarker & { isFavorite?: boolean })[]>(() => {
    const toNum = (v: any) => (v == null ? null : Number(v));

    const baseRestaurants: Restaurant[] = [
      ...searchRestaurants,           // 검색핀: 검색 패널에서만
      ...favoriteRestaurants,         // 찜핀: 항상
    ];

    const byId = new Map<number, Restaurant>();
    for (const r of baseRestaurants) {
      const pid = toNum((r as any)?.placeId ?? (r as any)?.id ?? (r as any)?.place?.placeId ?? (r as any)?.place?.id);
      if (!pid) continue;
      byId.set(pid, r);
    }

    return Array.from(byId.values())
      .map((r) => {
        const pid = toNum((r as any)?.placeId ?? (r as any)?.id ?? (r as any)?.place?.placeId ?? (r as any)?.place?.id);
        const rawLat = toNum((r as any)?.location?.lat ?? (r as any)?.lat ?? (r as any)?.place?.lat ?? (r as any)?.place?.y);
        const rawLng = toNum((r as any)?.location?.lng ?? (r as any)?.lng ?? (r as any)?.place?.lng ?? (r as any)?.place?.x);
        if (!pid || !Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return null;

        return {
          id: String(pid),
          position: { lat: rawLng as number, lng: rawLat as number }, // 카카오 좌표계(y=lat, x=lng) 대비 스왑
          title: (r as any)?.name ?? (r as any)?.place?.name ?? `가게 ${pid}`,
          category: (r as any)?.category ?? undefined,
          restaurant: r,
          isFavorite: favoriteRestaurants.some(fr => Number((fr as any)?.placeId ?? (fr as any)?.id) === pid),
        } as MapMarker & { isFavorite?: boolean };
      })
      .filter(Boolean) as (MapMarker & { isFavorite?: boolean })[];
  }, [searchRestaurants, favoriteRestaurants]);

  /* 후보 목록 훅 */
  const { items: candidateItems, optimisticItems: optimisticCandidateItems } = useCandidates(roomCode);

  /* ✅ [추가] 후보 ID 집합(가장 신선한 순서로): optimistic > items > localStorage */
  const candidateIdSet = useMemo(() => {
    const s = new Set<number>();
    const src = (optimisticCandidateItems && optimisticCandidateItems.length > 0)
      ? optimisticCandidateItems
      : (candidateItems ?? []);
    for (const it of src) s.add(Number((it as any).placeId ?? (it as any).id));
    if (s.size === 0) {
      // 마지막으로 저장된 후보 ID로 보강
      for (const id of readCidSet(roomCode)) s.add(id);
    }
    // tombstone은 항상 제외(사용자가 삭제했으면 끝)
    for (const id of Array.from(s)) {
      if (candidateTombstones.has(id)) s.delete(id);
    }
    return s;
  }, [roomCode, optimisticCandidateItems, candidateItems, candidateTombstones]);

  /* ✅ [추가] 후보 ID/객체 캐시 갱신: 후보 목록이 바뀔 때마다 저장(삭제 제외) */
  useEffect(() => {
    const ids = new Set<number>();
    const src = (optimisticCandidateItems && optimisticCandidateItems.length > 0)
      ? optimisticCandidateItems
      : (candidateItems ?? []);
    const nextSticky = { ...stickyCandidateById };
    for (const it of src) {
      const pid = Number((it as any).placeId ?? (it as any).id);
      if (!Number.isFinite(pid) || candidateTombstones.has(pid)) continue;
      ids.add(pid);
      // 좌표가 있는 것만 캐시
      const lat = Number((it as any)?.location?.lat ?? (it as any)?.lat ?? (it as any)?.place?.lat ?? (it as any)?.place?.y);
      const lng = Number((it as any)?.location?.lng ?? (it as any)?.lng ?? (it as any)?.place?.lng ?? (it as any)?.place?.x);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        nextSticky[String(pid)] = (it as any);
      }
    }
    if (Object.keys(nextSticky).length !== Object.keys(stickyCandidateById).length) {
      setStickyCandidateById(nextSticky);
    }
    // 영속 저장
    writeCidSet(roomCode, ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, optimisticCandidateItems, candidateItems, candidateTombstones]);

  /* ✅ [수정] 후보 마커 생성(항상 포함):
     1) 후보 목록(source) → 마커
     2) 검색결과 중 candidateIdSet에 포함된 것 → 보강
     3) stickyCandidateById(캐시) 중 candidateIdSet에 포함된 것 → 추가 보강
     + tombstone 필터, placeId 기준 중복 제거
     ※ 이렇게 하면 패널 이동/일시 공백에도 후보 핀이 계속 보임 */
  const candidateMarkers = useMemo<(MapMarker & { isCandidate?: boolean })[]>(() => {
    const toNum = (v: any) => (v == null ? null : Number(v));

    const src =
      optimisticCandidateItems &&
      optimisticCandidateItems !== candidateItems &&
      optimisticCandidateItems.length > 0
        ? optimisticCandidateItems
        : candidateItems;

    const byId = new Map<number, MapMarker & { isCandidate: boolean }>();

    // 1) 후보 목록 → 마커
    for (const it of (src ?? [])) {
      const pid = toNum((it as any)?.placeId ?? (it as any)?.id ?? (it as any)?.place?.placeId ?? (it as any)?.place?.id);
      if (!pid || candidateTombstones.has(pid)) continue;
      const rawLat = toNum((it as any)?.location?.lat ?? (it as any)?.lat ?? (it as any)?.place?.lat ?? (it as any)?.place?.y);
      const rawLng = toNum((it as any)?.location?.lng ?? (it as any)?.lng ?? (it as any)?.place?.lng ?? (it as any)?.place?.x);
      if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) continue;
      byId.set(pid, {
        id: String(pid),
        position: { lat: rawLng as number, lng: rawLat as number },
        title: (it as any)?.name ?? (it as any)?.place?.name ?? `후보 ${pid}`,
        restaurant: it as any,
        isCandidate: true,
      });
    }

    // 2) 검색결과에서 candidateIdSet에 포함된 것 → 보강(좌표가 있으면)
    for (const r of (searchResults ?? [])) {
      const pid = toNum((r as any)?.placeId ?? (r as any)?.id ?? (r as any)?.place?.placeId ?? (r as any)?.place?.id);
      if (!pid || !candidateIdSet.has(pid) || candidateTombstones.has(pid)) continue;
      if (!byId.has(pid)) {
        const rawLat = toNum((r as any)?.location?.lat ?? (r as any)?.lat ?? (r as any)?.place?.lat ?? (r as any)?.place?.y);
        const rawLng = toNum((r as any)?.location?.lng ?? (r as any)?.lng ?? (r as any)?.place?.lng ?? (r as any)?.place?.x);
        if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) continue;
        byId.set(pid, {
          id: String(pid),
          position: { lat: rawLng as number, lng: rawLat as number },
          title: (r as any)?.name ?? (r as any)?.place?.name ?? `후보 ${pid}`,
          restaurant: r as any,
          isCandidate: true,
        });
      }
    }

    // 3) stickyCandidateById(캐시)로 추가 보강
    for (const [k, r] of Object.entries(stickyCandidateById)) {
      const pid = toNum(k);
      if (!pid || !candidateIdSet.has(pid) || candidateTombstones.has(pid)) continue;
      if (!byId.has(pid)) {
        const rawLat = toNum((r as any)?.location?.lat ?? (r as any)?.lat ?? (r as any)?.place?.lat ?? (r as any)?.place?.y);
        const rawLng = toNum((r as any)?.location?.lng ?? (r as any)?.lng ?? (r as any)?.place?.lng ?? (r as any)?.place?.x);
        if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) continue;
        byId.set(pid, {
          id: String(pid),
          position: { lat: rawLng as number, lng: rawLat as number },
          title: (r as any)?.name ?? (r as any)?.place?.name ?? `후보 ${pid}`,
          restaurant: r as any,
          isCandidate: true,
        });
      }
    }

    return Array.from(byId.values());
  }, [candidateItems, optimisticCandidateItems, candidateTombstones, searchResults, candidateIdSet, stickyCandidateById]);

  /* 최종 병합: 후보가 우선 덮어쓰기 (같은 id면 후보 속성으로 덮음) */
  const finalMapMarkers = useMemo(() => {
    const byId = new Map<string, MapMarker & { isFavorite?: boolean; isCandidate?: boolean }>();
    for (const m of mapMarkers) byId.set(String(m.id), m); // 1) 검색/찜
    for (const c of candidateMarkers) {                    // 2) 후보로 덮어쓰기
      const prev = byId.get(String(c.id));
      byId.set(String(c.id), { ...prev, ...c, isCandidate: true });
    }
    return Array.from(byId.values());
  }, [mapMarkers, candidateMarkers]);

  /* ✅ [추가] 후보 패널에서 마커 변경 시 강제 리마운트 키 */
  const isCandidatePanel = useMemo(() => {
    const k = String(activePanel || '').toLowerCase();
    return k === 'candidate' || k === 'candidates';
  }, [activePanel]);
  const mapRemountKey = useMemo(() => {
    return isCandidatePanel ? `cand-${candidateMarkers.length}` : `all`;
  }, [isCandidatePanel, candidateMarkers.length]);

  useEffect(() => {
    console.log('[panel]', activePanel, 'isSearchPanel:', isSearchPanel);
    console.log('[candidate] ids:', Array.from(candidateIdSet));
    console.log('[candidate] items/optimistic:', candidateItems?.length, optimisticCandidateItems?.length);
    console.log('[finalMapMarkers] length:', finalMapMarkers.length);
  }, [activePanel, isSearchPanel, candidateIdSet, candidateItems, optimisticCandidateItems, finalMapMarkers]);

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
        key={mapRemountKey} // ✅ [추가] 후보 패널에서 마커 수 변동 시 즉시 반영
        markers={finalMapMarkers as any}
        eventHandlers={mapEventHandlers}
        onMapMoved={(center) => {
          setMapCenter(center);
          const threshold = 0.001;
          if (
            !lastSearchCenter ||
            Math.abs(center.lat - lastSearchCenter.lat) > threshold ||
            Math.abs(center.lng - lastSearchCenter.lng) > threshold
          ) {
            setShowCurrentLocationButton(true);
          }
        }}
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
