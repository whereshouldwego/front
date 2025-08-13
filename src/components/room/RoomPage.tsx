/**
 * RoomPage.tsx
 *
 * 방 페이지
 *
 * 변경 사항(요청 반영):
 * - ✅ API 없이 사이드바/스토어 정보만 사용
 * - ✅ 찜은 해제 전까지 항상 지도에 남도록 sticky 캐시 유지
 * - ✅ 지도 마커 = 검색 결과 ∪ (sticky 찜)
 * - ✅ 찜 마커는 주황+별 아이콘 (isFavorite 플래그)
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebSocketProvider, useWebSocket } from '../../stores/WebSocketContext';
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext';
import { ChatProvider } from '../../stores/ChatContext';
import { useRestaurantStore } from '../../stores/RestaurantStore'; // ✅ [추가]
import { Sidebar } from '../sidebar';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import ChatSection from '../chat/ChatSection';
import styles from './RoomPage.module.css';
import type { MapCenter, MapEventHandlers, UserProfile, MapMarker, Restaurant } from '../../types';

interface RoomData {
  id: string;
  name: string;
  participants: string[];
  createdAt: Date;
  isValid: boolean;
}

const RoomPage: React.FC = () => {
  const { roomCode, roomId } = useParams<{ roomCode?: string; roomId?: string }>();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
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
      setRoomData({ id, name: `방 ${id}`, participants: [], createdAt: new Date(), isValid: true });
      loadedRoomId.current = id;
    } catch (e: any) {
      setError(e?.message || '방을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
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
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>🚫</div>
          <h2 className={styles.errorTitle}>{error || '방을 찾을 수 없습니다'}</h2>
          <p className={styles.errorDescription}>방 코드가 올바른지 확인해주세요.</p>
          <div className={styles.errorButtons}>
            <button onClick={() => navigate('/')} className={`${styles.errorButton} ${styles.errorButtonPrimary}`}>새 방 만들기</button>
            <button onClick={() => window.history.back()} className={`${styles.errorButton} ${styles.errorButtonSecondary}`}>뒤로가기</button>
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
                  <RoomMainContent roomId={roomData.id} />
                </div>
              </div>
            </div>
          </div>
        </ChatProvider>
      </SidebarProvider>
    </WebSocketProvider>
  );
};

// 방 내부 메인 콘텐츠
const RoomMainContent: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { searchResults, setMapCenter, performSearch, selectedRestaurantId } = useSidebar();
  const { sendCursorPosition, otherUsersPositions } = useWebSocket();

  // ✅ [추가] 찜 스토어 + sticky 캐시
  const { favorites, favoriteIndex } = useRestaurantStore();
  const [stickyFavoriteById, setStickyFavoriteById] = useState<Record<string, Restaurant>>({}); // ✅ [추가]

  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [lastSearchCenter, setLastSearchCenter] = useState<MapCenter | null>(null);

  const [users] = useState<UserProfile[]>([
    { id: 'me', name: '나', location: '강남역', avatarColor: '#FF6B6B', isCurrentUser: true },
    { id: 'yoon', name: '윤', location: '홍대입구역', avatarColor: '#4ECDC4' },
  ]);

  /* ✅ [추가] sticky 갱신 로직 (AppContainer와 동일) */
  useEffect(() => {
    setStickyFavoriteById((prev) => {
      const next: Record<string, Restaurant> = { ...prev };
      const favIdSet = new Set<number>(Array.from(favorites ?? []).map((v: any) => Number(v)));

      // 1) 찜 해제된 항목 제거
      for (const k of Object.keys(next)) {
        const pid = Number(k);
        if (!favIdSet.has(pid)) delete next[k];
      }

      // 2) favoriteIndex 기반 채우기
      const dict = (favoriteIndex ?? {}) as unknown as Record<string, Restaurant>;
      for (const [k, r] of Object.entries(dict)) {
        const pid = Number(k);
        if (!favIdSet.has(pid)) continue;
        if (r && r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)) {
          next[String(pid)] = r;
        }
      }

      // 3) 검색결과 보강
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

  /* ✅ [추가] 검색 결과 ∪ sticky 찜 */
  const unionRestaurants: Restaurant[] = useMemo(() => {
    const map = new Map<string, Restaurant>();
    (searchResults ?? []).forEach((r) => { if (r?.placeId != null) map.set(String(r.placeId), r); });
    Object.values(stickyFavoriteById).forEach((r) => { if (r?.placeId != null) map.set(String(r.placeId), r); });
    return Array.from(map.values());
  }, [searchResults, stickyFavoriteById]);

  /* ✅ [변경] 마커 변환: isFavorite 플래그 부여 */
  const favoriteIdSet = useMemo(() => new Set<number>(Array.from(favorites ?? []).map((v: any) => Number(v))), [favorites]);
  const mapMarkers = useMemo<(MapMarker & { isFavorite?: boolean })[]>(() => {
    return (unionRestaurants ?? [])
      .filter((r) => Number.isFinite(r?.location?.lat) && Number.isFinite(r?.location?.lng))
      .map((r) => ({
        id: String(r.placeId),
        position: { lat: r.location.lat, lng: r.location.lng },
        title: r.name,
        category: (r as any).category ?? undefined,
        restaurant: r,
        isFavorite: favoriteIdSet.has(Number(r.placeId)), // ✅ [추가]
      }));
  }, [unionRestaurants, favoriteIdSet]);

  // ====== 아래는 기존 로직 유지 ======
  const handleMapMoved = useCallback((center: MapCenter) => {
    setMapCenter(center);
    const threshold = 0.001;
    if (!lastSearchCenter ||
        Math.abs(center.lat - lastSearchCenter.lat) > threshold ||
        Math.abs(center.lng - lastSearchCenter.lng) > threshold) {
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
      {/* ✅ [변경] 검색 + (sticky)찜 합친 마커 전달 */}
      <MapContainer
        markers={mapMarkers as any}
        eventHandlers={mapEventHandlers}
        onMapMoved={handleMapMoved}
        onCursorMove={(pos) => sendCursorPosition(pos)}
        cursorPositions={[...otherUsersPositions.entries()].map(([id, position]) => ({ id, position }))}
        selectedMarkerId={selectedRestaurantId ?? undefined}
      />
      <MapOverlay
        users={users}
        onDepartureSubmit={(loc) => console.log('출발지 설정:', loc)}
        onUserProfileClick={(id) => console.log('사용자 클릭:', id)}
        onCurrentLocationSearch={handleCurrentLocationSearch}
        showCurrentLocationButton={showCurrentLocationButton}
      />
      <ChatSection onAuroraToggle={(a) => console.log('Aurora:', a)} />
    </div>
  );
};

export default RoomPage;
