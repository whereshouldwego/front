/**
 * AppContainer.tsx
 *
 * 앱 메인 컨테이너 컴포넌트
 *
 * 기능:
 * - 전체 앱 라우팅 관리
 * - 전체 앱 레이아웃 관리
 * - 사이드바와 메인 콘텐츠 영역 구성
 * - 지도와 오버레이 통합
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
 */

import React, { useMemo, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ChatProvider } from '../../stores/ChatContext';
import { SidebarProvider } from '../../stores/SidebarContext';
import { WebSocketProvider, useWebSocket } from '../../stores/WebSocketContext';
import type { MapEventHandlers, MapMarker, MapOverlayConfig, UserProfile } from '../../types';
import InitialScreen from '../initial/InitialScreen';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import RoomPage from '../room/RoomPage';
import { Sidebar } from '../sidebar';
import styles from './AppContainer.module.css';


// 메인 서비스 컴포넌트 (기존 MainContent)
const MainService: React.FC<{ roomId?: string }> = ({ roomId }) => {
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
    return [
      {
        id: 'default1',
        position: {
          lat: 37.5002,
          lng: 127.0364
        },
        title: '기본 위치',
        category: '기본',
        restaurant: {
          id: 'default1',
          name: '기본 위치',
          category: '기본',
          distance: '0m',
          description: '기본 위치',
          tags: ['기본'],
          location: {
            lat: 37.5002,
            lng: 127.0364,
            address: '서울 강남구'
          },
          phone: '',
          isFavorite: false,
          isCandidate: false
        }
      }
    ];
  }, []);

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
    onMapDragEnd: (center) => {
      console.log('지도 드래그 종료:', center);
    },
    onMapZoomChanged: (level: number) => {
      console.log('지도 줌 변경:', level);
    }
  };

  // 지도 오버레이 설정
  const mapOverlayConfig: MapOverlayConfig = {
    showDepartureSearch: false,
    departureLocation: '',
    currentLocationButtonText: '현 지도에서 검색'
  };

  return (
    <div className={styles.mainContent}>
      {/* 지도 컨테이너 */}
      <MapContainer
        markers={mapMarkers}
        eventHandlers={mapEventHandlers}
        className={styles.mapContainer}
      />
      
      {/* 지도 오버레이 */}
      <MapOverlay
        config={mapOverlayConfig}
        onDepartureSearch={handleDepartureSubmit}
        onCurrentLocation={handleCurrentLocationClick}
        className={styles.mapOverlay}
      />
    </div>
  );
};

// 앱 컨테이너 컴포넌트
const MainPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleSidebarExpandedChange = (expanded: boolean) => {
    setIsSidebarExpanded(expanded);
  };

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
                    <Sidebar 
                      onExpandedChange={handleSidebarExpandedChange}
                    />
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