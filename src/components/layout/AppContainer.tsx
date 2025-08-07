/**
 * AppContainer.tsx
 *
 * 앱 메인 컨테이너 컴포넌트
 *
 * 기능:
 * - 전체 앱 라우팅 관리
 * - 전체 앱 레이아웃 관리
 * - 사이드바와 메인 콘텐츠 영역 구성
 * - 지도와 채팅 섹션 통합
 * - 사용자 프로필 및 위치 관리
 *
 * 구조:
 * - 라우터 설정 (초기화면, 방 페이지, 404)
 * - 사이드바 (왼쪽)
 * - 메인 콘텐츠 영역 (지도 + 오버레이)
 * - 채팅 섹션 (오른쪽)
 *
 * 상태 관리:
 * - 사용자 프로필 정보
 * - 지도 마커 데이터
 * - 이벤트 핸들러들
 *
 * Provider:
 * - WebSocketProvider: 웹소켓 상태 관리
 * - SidebarProvider: 사이드바 상태 관리
 * - ChatProvider: 채팅 상태 관리
 */

import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChatProvider } from '../../stores/ChatContext';
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext';
import { WebSocketProvider, useWebSocket } from '../../stores/WebSocketContext';
import { restaurantData } from '../../data/restaurantData';
import type { MapCenter, MapEventHandlers, MapMarker, UserProfile } from '../../types';
import ChatSection from '../chat/ChatSection';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import { Sidebar } from '../sidebar';
import InitialScreen from '../initial/InitialScreen';
import RoomPage from '../room/RoomPage';

// 메인 서비스 컴포넌트 (기존 MainContent)
const MainService: React.FC<{ roomId?: string }> = ({ roomId }) => {
  const { searchResults, recommendations, favorites, votes } = useSidebar();
  const { otherUsersCursors } = useWebSocket();
  
  // 동적 사용자 프로필 예시
  const [users, setUsers] = useState<UserProfile[]>([
    {
      id: 'me',
      name: '나',
      location: '강남역',
      avatarColor: '#FF6B6B',
      isCurrentUser: true
    },
    {
      id: 'yoon',
      name: '윤',
      location: '홍대입구역',
      avatarColor: '#4ECDC4'
    },
    {
      id: 'yekyung',
      name: '예',
      location: '고속버스터미널',
      avatarColor: '#45B7D1'
    },
    {
      id: 'kyuback',
      name: '규',
      location: '합정역',
      avatarColor: '#96CEB4'
    }
  ]);

  // 현재 활성 패널에 따른 마커 데이터 생성
  const mapMarkers = useMemo((): MapMarker[] => {
    let restaurants = restaurantData.search || [];
    
    // 활성 패널에 따른 데이터 선택
    if (searchResults.length > 0) {
      restaurants = searchResults;
    } else if (recommendations.length > 0) {
      restaurants = recommendations;
    } else if (favorites.length > 0) {
      restaurants = favorites;
    } else if (votes.length > 0) {
      restaurants = votes;
    }

    return restaurants.map(restaurant => ({
      id: restaurant.id,
      position: {
        lat: restaurant.location.lat,
        lng: restaurant.location.lng
      },
      title: restaurant.name,
      category: restaurant.category,
      restaurant: restaurant
    }));
  }, [searchResults, recommendations, favorites, votes]);

  // 이벤트 핸들러들
  const handleAuroraToggle = (isActive: boolean) => {
    console.log('Aurora 버튼 상태:', isActive);
    console.log('현재 방 ID:', roomId);
  };

  const handleDepartureSubmit = (location: string) => {
    console.log('출발지 설정:', location);
    console.log('현재 방 ID:', roomId);
    // 사용자 위치 업데이트
    setUsers(prev => prev.map(user => 
      user.isCurrentUser 
        ? { ...user, location } 
        : user
    ));
  };

  const handleCurrentLocationClick = () => {
    console.log('현위치 재검색 클릭');
    console.log('현재 방 ID:', roomId);
  };

  const handleUserProfileClick = (userId: string) => {
    console.log('사용자 프로필 클릭:', userId);
    console.log('현재 방 ID:', roomId);
  };

  const handleRestaurantClick = (restaurantId: string) => {
    console.log('레스토랑 클릭:', restaurantId);
    console.log('현재 방 ID:', roomId);
  };

  // 지도 이벤트 핸들러
  const mapEventHandlers: MapEventHandlers = {
    onMapClick: (lat: number, lng: number) => {
      console.log('지도 클릭:', lat, lng);
      console.log('현재 방 ID:', roomId);
    },
    onMarkerClick: (markerId: string) => {
      console.log('마커 클릭:', markerId);
      handleRestaurantClick(markerId);
    },
    onMapDragEnd: (center: MapCenter) => {
      console.log('지도 드래그 종료:', center);
    },
    onMapZoomChanged: (level: number) => {
      console.log('지도 줌 변경:', level);
    }
  };

  return (
    <div 
      className="bg-gray-100 relative overflow-hidden"
      id="main-content"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      <MapContainer
        markers={mapMarkers}
        eventHandlers={mapEventHandlers}
      />
      <MapOverlay
        users={users}
        onDepartureSubmit={handleDepartureSubmit}
        onCurrentLocationClick={handleCurrentLocationClick}
        onUserProfileClick={handleUserProfileClick}
      />
      <ChatSection
        onAuroraToggle={handleAuroraToggle}
      />

      {/* 다른 사용자 커서 렌더링 */}
      {[...otherUsersCursors.entries()].map(([userId, cursor]) => (
        <div
          key={userId}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            width: '20px',
            height: '20px',
            backgroundColor: 'red',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
};

// 메인 페이지 컴포넌트 (초기화면 + 배경 서비스)
const MainPage: React.FC = () => {
  return (
    <div className="relative">
      {/* 배경으로 서비스 화면 */}
      <div className="fixed inset-0">
        <WebSocketProvider>
          <SidebarProvider>
            <ChatProvider>
              <div className="h-screen relative">
                <div className="absolute inset-0">
                  <div id="sidebar-container">
                    <Sidebar />
                  </div>
                  <MainService roomId="DEMO01" />
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

// 앱 컨테이너 메인 컴포넌트 - 라우팅 포함
const AppContainer: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 메인 페이지 - 방 생성/참여 선택 */}
          <Route path="/" element={<MainPage />} />
          
          {/* 방 페이지 - 실제 서비스 */}
          <Route path="/rooms/:roomCode" element={<RoomPage />} />
          
          {/* 404 페이지 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default AppContainer;