/**
 * AppContainer.tsx
 *
 * 앱 메인 컨테이너 컴포넌트
 *
 * 변경 사항(요청 반영):
 * - ✅ API 없이 사이드바/스토어 정보만 사용
 * - ✅ 찜은 사용자가 해제하기 전까지 항상 지도에 남도록 sticky 캐시 유지
 * - ✅ 지도 마커 = 검색 결과 ∪ (sticky 찜) (placeId 기준 중복 제거)
 * - ✅ 찜 마커는 주황+별 아이콘 (isFavorite 플래그)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ChatProvider } from '../../stores/ChatContext';
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext';
import { WebSocketProvider, useWebSocket } from '../../stores/WebSocketContext';
import { useRestaurantStore } from '../../stores/RestaurantStore'; // ✅ [추가]
import type { MapCenter, MapEventHandlers, MapMarker, Restaurant, UserProfile } from '../../types';
import ChatSection from '../chat/ChatSection';
import InitialScreen from '../initial/InitialScreen';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import RoomPage from '../room/RoomPage';
import { Sidebar } from '../sidebar';

const MainService: React.FC<{ roomId?: string }> = ({ roomId }) => {
  const { searchResults, performSearch, selectedRestaurantId } = useSidebar();
  const { sendCursorPosition, otherUsersPositions } = useWebSocket();

  // ✅ [추가] 찜 스토어 사용
  const { favorites, favoriteIndex } = useRestaurantStore();

  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [lastSearchCenter, setLastSearchCenter] = useState<MapCenter | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<MapCenter>({ lat: 37.5002, lng: 127.0364 });

  const [users, setUsers] = useState<UserProfile[]>([
    { id: 'me', name: '나', location: '강남역', avatarColor: '#FF6B6B', isCurrentUser: true },
    { id: 'yoon', name: '윤', location: '홍대입구역', avatarColor: '#4ECDC4' },
    { id: 'yekyung', name: '예', location: '고속버스터미널', avatarColor: '#45B7D1' },
    { id: 'kyuback', name: '규', location: '합정역', avatarColor: '#96CEB4' }
  ]);

  /* ✅ [추가] 찜 스냅샷: 패널 전환/검색과 무관하게 유지될 로컬 캐시
        - 키: placeId (string)
        - 값: Restaurant (좌표 있는 것만 저장)
        - 찜 해제 시에만 제거 */
  const [stickyFavoriteById, setStickyFavoriteById] = useState<Record<string, Restaurant>>({});

  /* ✅ [추가] 찜/인덱스/검색결과가 바뀔 때 sticky 갱신
        1) 현재 찜(Set)에 없는 항목은 sticky에서 제거
        2) favoriteIndex에 있는 상세를 sticky에 채움
        3) (보강) 검색결과 중 ‘찜’인 것도 좌표가 있으면 sticky에 채움 */
  useEffect(() => {
    setStickyFavoriteById((prev) => {
      const next: Record<string, Restaurant> = { ...prev };
      const favIdSet = new Set<number>(Array.from(favorites ?? []).map((v: any) => Number(v)));

      // 1) 찜 해제된 항목 제거
      for (const k of Object.keys(next)) {
        const pid = Number(k);
        if (!favIdSet.has(pid)) delete next[k]; // ✅ [추가] 찜 해제 시 제거
      }

      // 2) favoriteIndex 기반 채우기
      const dict = (favoriteIndex ?? {}) as unknown as Record<string, Restaurant>;
      for (const [k, r] of Object.entries(dict)) {
        const pid = Number(k);
        if (!favIdSet.has(pid)) continue;
        if (r && r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)) {
          next[String(pid)] = r; // ✅ [추가] 좌표 있는 상세를 스냅샷에 저장
        }
      }

      // 3) 검색결과 보강: 검색 결과 중 찜인 것들로 빈자리 채우기
      for (const r of (searchResults ?? [])) {
        if (!r?.placeId) continue;
        const pid = Number(r.placeId);
        if (!favIdSet.has(pid)) continue;
        if (!next[String(pid)] && r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)) {
          next[String(pid)] = r; // ✅ [추가] 검색결과로 보강
        }
      }

      return next;
    });
  }, [favorites, favoriteIndex, searchResults]);

  /* ✅ [추가] 지도에 뿌릴 최종 리스트: 검색결과 ∪ sticky 찜 */
  const unionRestaurants: Restaurant[] = useMemo(() => {
    const map = new Map<string, Restaurant>();
    (searchResults ?? []).forEach((r) => { if (r?.placeId != null) map.set(String(r.placeId), r); });
    Object.values(stickyFavoriteById).forEach((r) => { if (r?.placeId != null) map.set(String(r.placeId), r); });
    return Array.from(map.values());
  }, [searchResults, stickyFavoriteById]);

  /* ✅ [변경] 마커 변환: isFavorite 플래그로 찜 마커 구분 */
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
        isFavorite: favoriteIdSet.has(Number(r.placeId)), // ✅ [추가] 주황+별 구분
      }));
  }, [unionRestaurants, favoriteIdSet]);

  // ====== 이하 기존 로직 유지 ======
  const handleAuroraToggle = (isActive: boolean) => {
    console.log('Aurora 버튼 상태:', isActive, '현재 방 ID:', roomId);
  };
  const handleDepartureSubmit = (location: string) => {
    setUsers((prev) => prev.map((u) => (u.isCurrentUser ? { ...u, location } : u)));
  };
  const handleUserProfileClick = (userId: string) => {
    console.log('사용자 프로필 클릭:', userId, '현재 방 ID:', roomId);
  };

  const handleMapMoved = (center: MapCenter) => {
    setCurrentMapCenter(center);
    const threshold = 0.001;
    if (!lastSearchCenter ||
        Math.abs(center.lat - lastSearchCenter.lat) > threshold ||
        Math.abs(center.lng - lastSearchCenter.lng) > threshold) {
      setShowCurrentLocationButton(true);
    }
  };

  const handleCurrentLocationSearch = async (center: MapCenter) => {
    try {
      await performSearch({ query: '', location: `${center.lat},${center.lng}`, category: '', limit: 20 } as any);
      setShowCurrentLocationButton(false);
      setLastSearchCenter(center);
    } catch (error) {
      console.error('현위치 검색 실패:', error);
      setShowCurrentLocationButton(false);
    }
  };

  const mapEventHandlers: MapEventHandlers = {
    onMapClick: (lat, lng) => console.log('지도 클릭:', lat, lng),
    onMarkerClick: (markerId) => console.log('마커 클릭:', markerId),
    onMapDragEnd: (center) => console.log('지도 드래그 종료:', center),
    onMapZoomChanged: (level) => console.log('지도 줌 변경:', level),
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
        onDepartureSubmit={handleDepartureSubmit}
        onUserProfileClick={handleUserProfileClick}
        onCurrentLocationSearch={handleCurrentLocationSearch}
        showCurrentLocationButton={showCurrentLocationButton}
        currentMapCenter={currentMapCenter}
      />
      <ChatSection onAuroraToggle={handleAuroraToggle} />
    </div>
  );
};


// 앱 컨테이너 컴포넌트
const MainPage: React.FC = () => {
  const handleSidebarExpandedChange = (expanded: boolean) => {
    console.log('Sidebar expanded:', expanded);
  };

  return (
    <div className="relative">
      {/* 배경으로 서비스 화면 */}
      <div className="fixed inset-0">
        {/* Demo page without a room: WebSocket disabled */}
        <WebSocketProvider disabled>
          <SidebarProvider>
            <ChatProvider>
              <div className="h-screen relative">
                <div className="absolute inset-0">
                  <div id="sidebar-container">
                  <Sidebar 
                    onExpandedChange={handleSidebarExpandedChange}
                  />
                  </div>
                  <MainService />
                </div>
              </div>
            </ChatProvider>
          </SidebarProvider>
        </WebSocketProvider>
      </div>
      {/* 오버레이로 초기 화면 */}
      <InitialScreen />
    </div>
  );
};

// 404 페이지 컴포넌트
const NotFoundPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">페이지를 찾을 수 없습니다</h2>
        <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          메인으로 돌아가기
        </a>
      </div>
    </div>
  );
};

// 라우팅 포함 앱 엔트리 (원본 유지)
const AppContainer: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/rooms/:roomCode" element={<RoomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default AppContainer;
