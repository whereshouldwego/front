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

import React, { useState, useEffect, useRef } from 'react';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import type { MapMarker as MapMarkerType, MapEventHandlers, MapCenter } from '../../types';

// MapContainer 컴포넌트 props 인터페이스
interface MapContainerProps {
  markers?: MapMarkerType[];
  eventHandlers?: MapEventHandlers;
  className?: string;
  onMapMoved?: (center: MapCenter) => void;
  onMapIdle?: (center: MapCenter) => void;
  onCursorMove?: (center: MapCenter) => void;
  cursorPositions?: { id: string; position: MapCenter }[];
}

// 기본 지도 설정 (역삼역 중심)
const defaultCenter = {
  lat: 37.5002, // 역삼역 위도
  lng: 127.0364 // 역삼역 경도
};

const MapContainer: React.FC<MapContainerProps> = ({
  markers = [],
  eventHandlers,
  className = '',
  onMapMoved,
  onMapIdle,
  onCursorMove,
  cursorPositions = []
}) => {
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentCenter, setCurrentCenter] = useState<MapCenter>(defaultCenter);
  const mapRef = useRef<any>(null);
  const mapObjectRef = useRef<any>(null);
  const throttledOnCursorMove = useRef<((center: MapCenter) => void) | null>(null);

  // 8~12Hz 스로틀: 약 80~120ms 주기로 전송 (기본 80ms)
  useEffect(() => {
    if (!onCursorMove) {
      throttledOnCursorMove.current = null;
      return;
    }
    let timeout: any = null;
    const fn = (center: MapCenter) => {
      if (timeout) return;
      timeout = setTimeout(() => {
        timeout = null;
      }, 80);
      onCursorMove(center);
    };
    throttledOnCursorMove.current = fn;
    return () => {
      throttledOnCursorMove.current = null;
      if (timeout) clearTimeout(timeout);
    };
  }, [onCursorMove]);

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

  // 지도 인스턴스 생성 시 마우스 무브 이벤트 바인딩
  const handleMapCreate = (map: any) => {
    mapObjectRef.current = map;
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.event.addListener(map, 'mousemove', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        throttledOnCursorMove.current?.({ lat: latlng.getLat(), lng: latlng.getLng() });
      });
    }
  };

  // 지도 클릭 이벤트 핸들러
  const handleMapClick = (_map: any, mouseEvent: any) => {
    const latlng = mouseEvent.latLng;
    eventHandlers?.onMapClick?.(latlng.getLat(), latlng.getLng());
  };

  // 지도 드래그 종료 이벤트 핸들러
  const handleMapDragEnd = (map: any) => {
    const center = map.getCenter();
    const newCenter: MapCenter = {
      lat: center.getLat(),
      lng: center.getLng()
    };
    
    // 현재 중심점 업데이트
    setCurrentCenter(newCenter);
    
    // 기존 이벤트 핸들러 호출
    eventHandlers?.onMapDragEnd?.(newCenter);
    
    // 지도 이동 시 콜백 호출 (현위치 검색 버튼 표시용)
    onMapMoved?.(newCenter);
  };

  // 지도 이동 완료 이벤트 핸들러
  const handleMapIdle = (map: any) => {
    const center = map.getCenter();
    const newCenter: MapCenter = {
      lat: center.getLat(),
      lng: center.getLng()
    };
    
    setCurrentCenter(newCenter);
    // 지도 이동이 완료되었을 때 콜백 호출
    onMapIdle?.(newCenter);
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

  // 현재 지도 중심점 반환 함수
  const getCurrentCenter = (): MapCenter => {
    return currentCenter;
  };

  // 외부에서 지도 중심점에 접근할 수 있도록 ref 설정
  useEffect(() => {
    if (mapRef.current) { 
      mapRef.current.getCurrentCenter = getCurrentCenter;
    }
  }, [currentCenter]);

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
        onIdle={handleMapIdle}
        onZoomChanged={handleMapZoomChanged}
        onCreate={handleMapCreate}
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

        {/* 다른 사용자 커서 위치 렌더링 */}
        {cursorPositions.map((cp) => (
          <CustomOverlayMap key={cp.id} position={cp.position} zIndex={1000}>
            <div style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              {/* Cursor arrow shape with per-user color */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill={stringToColor(cp.id)} stroke="#ffffff" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
                <path d="M3 2l7 17 2-6 6-2L3 2z" />
              </svg>
              <div style={{
                marginLeft: 6,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                {getUserNickname(cp.id)}
              </div>
            </div>
          </CustomOverlayMap>
        ))}
      </Map>
    </div>
  );
};

// 사용자 ID로부터 안정적인 색상 생성
function stringToColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 75%, 45%)`;
}

// 표시용 닉네임 결정: 로컬스토리지의 본인 닉네임과 매칭하거나, 일부 잘라서 표시
function getUserNickname(userId: string): string {
  const selfId = localStorage.getItem('userId') || '';
  if (String(selfId) === String(userId)) {
    return localStorage.getItem('userNickname') || '나';
  }
  // 다른 사용자: 접두 4글자
  return userId.slice(0, 4);
}

export default MapContainer; 