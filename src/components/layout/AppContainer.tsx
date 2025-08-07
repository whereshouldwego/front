/**
 * AppContainer.tsx
 *
 * 앱 메인 컨테이너 컴포넌트
 *
 * 기능:
 * - 전체 앱 레이아웃 관리
 * - 사이드바와 메인 콘텐츠 영역 구성
 * - 지도와 오버레이 통합
 *
 * 구조:
 * - 사이드바 (왼쪽 고정)
 * - 메인 콘텐츠 영역 (지도 + 오버레이)
 * - 채팅 섹션 (오른쪽)
 *
 * 상태 관리:
 * - 사용자 프로필 정보
 * - 지도 마커 데이터
 * - 이벤트 핸들러들
 */

import React, { useMemo, useState } from 'react';
import type { MapMarker, MapEventHandlers, MapOverlayConfig } from '../../types';
import { restaurantData } from '../../data/restaurantData';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import { Sidebar } from '../sidebar';
import styles from './AppContainer.module.css';

// 메인 콘텐츠 컴포넌트
const MainContent: React.FC<{ searchResults: any[] }> = ({ searchResults }) => {
  // 마커 데이터 생성
  const mapMarkers = useMemo((): MapMarker[] => {
    return searchResults.map(restaurant => ({
      id: restaurant.id,
      position: {
        lat: restaurant.location.lat,
        lng: restaurant.location.lng
      },
      title: restaurant.name,
      category: restaurant.category,
      restaurant: restaurant
    }));
  }, [searchResults]);

  // 이벤트 핸들러들
  const handleDepartureSubmit = (location: string) => {
    console.log('출발지 설정:', location);
  };

  const handleCurrentLocationClick = () => {
    console.log('현위치 재검색 클릭');
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
const AppContainer: React.FC = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleSearchResultsChange = (results: any[]) => {
    setSearchResults(results);
  };

  const handleSidebarExpandedChange = (expanded: boolean) => {
    setIsSidebarExpanded(expanded);
  };

  return (
    <div className={styles.appContainer}>
      {/* 사이드바 */}
      <Sidebar 
        onSearchResultsChange={handleSearchResultsChange}
        onExpandedChange={handleSidebarExpandedChange}
      />
      
      {/* 메인 콘텐츠 영역 */}
      <div 
        className={styles.mainContent}
        style={{
          marginLeft: isSidebarExpanded ? '400px' : '90px',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <MainContent searchResults={searchResults} />
      </div>
    </div>
  );
};

export default AppContainer; 