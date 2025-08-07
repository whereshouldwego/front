/**
 * MapContainer.tsx
 *
 * 카카오맵 컨테이너 컴포넌트
 *
 * 기능:
 * - react-kakao-maps-sdk를 사용한 카카오맵 연동
 * - 지도 표시 및 마커 관리
 * - 지도 이벤트 처리
 * - 반응형 디자인 적용
 *
 * Props:
 * - markers: 지도에 표시할 마커들
 * - eventHandlers: 지도 이벤트 핸들러들
 * - className: 추가 CSS 클래스
 */

import React, { useState, useEffect } from 'react';
import { Map, MapMarker } from 'react-kakao-maps-sdk';
import type { MapEventHandlers, MapMarker as MapMarkerType } from '../../types';

// MapContainer 컴포넌트 props 인터페이스
interface MapContainerProps {
  markers?: MapMarkerType[];
  eventHandlers?: MapEventHandlers;
  className?: string;
}

// 기본 지도 설정 (역삼역 중심)
const defaultCenter = {
  lat: 37.5002, // 역삼역 위도
  lng: 127.0364 // 역삼역 경도
};

const MapContainer: React.FC<MapContainerProps> = ({
  markers = [],
  eventHandlers,
  className = ''
}) => {
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 카카오맵 SDK 로드 확인
  useEffect(() => {
    const checkKakaoMapLoaded = () => {
      if (window.kakao && window.kakao.maps) {
        setIsKakaoMapLoaded(true);
        setMapError(null);
      } else {
        const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
        if (!apiKey) {
          setMapError('카카오맵 API 키가 설정되지 않았습니다. 환경변수 VITE_KAKAO_MAP_API_KEY를 설정해주세요.');
        } else {
          setMapError('카카오맵 SDK가 로드되지 않았습니다. API 키를 확인해주세요.');
        }
      }
    };

    // 초기 확인
    checkKakaoMapLoaded();

    // 3초 후 재확인 (스크립트 로딩 시간 고려)
    const timer = setTimeout(checkKakaoMapLoaded, 3000);

    return () => clearTimeout(timer);
  }, []);
  // 지도 클릭 이벤트 핸들러
  const handleMapClick = (_map: any, mouseEvent: any) => {
    const latlng = mouseEvent.latLng;
    eventHandlers?.onMapClick?.(latlng.getLat(), latlng.getLng());
  };

  // 지도 드래그 종료 이벤트 핸들러
  const handleMapDragEnd = (map: any) => {
    const center = map.getCenter();
    eventHandlers?.onMapDragEnd?.({
      lat: center.getLat(),
      lng: center.getLng()
    });
  };

  // 지도 줌 변경 이벤트 핸들러
  const handleMapZoomChanged = (map: any) => {
    const level = map.getLevel();
    eventHandlers?.onMapZoomChanged?.(level);
  };

  // 마커 클릭 이벤트 핸들러
  const handleMarkerClick = (markerId: string) => {
    eventHandlers?.onMarkerClick?.(markerId);
  };

  // 에러 상태 표시
  if (mapError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">지도를 불러올 수 없습니다</h3>
          <p className="text-sm text-gray-600 mb-4">{mapError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  // 로딩 상태 표시
  if (!isKakaoMapLoaded) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Map
        center={defaultCenter}
        className="w-full h-full"
        level={3}
        onClick={handleMapClick}
        onDragEnd={handleMapDragEnd}
        onZoomChanged={handleMapZoomChanged}
      >
        {/* 마커들 렌더링 */}
        {markers.map((markerData) => (
          <MapMarker
            key={markerData.id}
            position={{
              lat: markerData.position.lat,
              lng: markerData.position.lng
            }}
            onClick={() => handleMarkerClick(markerData.id)}
          >
            {/* 마커에 정보창 추가 (선택사항) */}
            {markerData.restaurant && (
              <div className="p-2.5 min-w-[200px] bg-white border border-gray-300 rounded-md shadow-md">
                <h3 className="m-0 mb-1 text-sm font-bold text-gray-900">
                  {markerData.restaurant.name}
                </h3>
              </div>
            )}
          </MapMarker>
        ))}
      </Map>
    </div>
  );
};

export default MapContainer; 