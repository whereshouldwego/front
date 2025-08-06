/**
 * AppContainer.tsx
 *
 * 앱 메인 컨테이너 컴포넌트
 *
 * 기능:
 * - 전체 앱 레이아웃 관리
 * - 사이드바와 메인 콘텐츠 영역 구성
 * - 지도와 채팅 섹션 통합
 * - 사용자 프로필 및 위치 관리
 *
 * 구조:
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
import { ChatProvider } from '../../stores/ChatContext'; // Updated import
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext'; // Updated import
import { restaurantData } from '../../data/restaurantData';
import type { MapCenter, MapEventHandlers, MapMarker, UserProfile } from '../../types';
import ChatSection from '../chat/ChatSection';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import { Sidebar } from '../sidebar'; // Updated import

// 메인 콘텐츠 컴포넌트
const MainContent: React.FC = () => {
  const { isExpanded, searchResults, recommendations, favorites, votes } = useSidebar();
  
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
  };

  const handleDepartureSubmit = (location: string) => {
    console.log('출발지 설정:', location);
    // 사용자 위치 업데이트
    setUsers(prev => prev.map(user => 
      user.isCurrentUser 
        ? { ...user, location } 
        : user
    ));
  };

  const handleCurrentLocationClick = () => {
    console.log('현위치 재검색 클릭');
  };

  const handleUserProfileClick = (userId: string) => {
    console.log('사용자 프로필 클릭:', userId);
  };

  const handleRestaurantClick = (restaurantId: string) => {
    console.log('레스토랑 클릭:', restaurantId);
  };

  // 지도 이벤트 핸들러
  const mapEventHandlers: MapEventHandlers = {
    onMapClick: (lat: number, lng: number) => {
      console.log('지도 클릭:', lat, lng);
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
        left: isExpanded ? '229px' : '63px',
        right: 0,
        bottom: 0,
        width: `calc(100vw - ${isExpanded ? '229px' : '63px'})`,
        transition: 'left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)'
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
    </div>
  );
};

// 앱 컨테이너 메인 컴포넌트
const AppContainer: React.FC = () => {
  return (
    <SidebarProvider>
      <ChatProvider>
        <div className="h-screen relative">
          {/* 사이드바 토글 컨테이너 */}
          <div id="sidebar-container">
            <Sidebar />
          </div>
          
          {/* 메인 콘텐츠 영역 */}
          <MainContent />
        </div>
      </ChatProvider>
    </SidebarProvider>
  );
};

export default AppContainer; 