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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import type { MapMarker as MapMarkerType, MapEventHandlers, MapCenter } from '../../types';

/* ✅ (추가) 찜 구분 플래그 허용 */
type MarkerWithFavorite = MapMarkerType & { isFavorite?: boolean };

// MapContainer 컴포넌트 props 인터페이스
interface MapContainerProps {
  markers?: MarkerWithFavorite[];
  eventHandlers?: MapEventHandlers;
  className?: string;
  onMapMoved?: (center: MapCenter) => void;
  onMapIdle?: (center: MapCenter) => void;
  onCursorMove?: (center: MapCenter) => void;
  cursorPositions?: { id: string; position: MapCenter }[];
  // ✅ 선택된 마커 id (선택 시 마커 확대)
  selectedMarkerId?: string;
}

// 기본 지도 설정 (역삼역 중심)
const defaultCenter = {
  lat: 37.5002,
  lng: 127.0364
};

const MapContainer: React.FC<MapContainerProps> = ({
  markers = [],
  eventHandlers,
  className = '',
  onMapMoved,
  onMapIdle,
  onCursorMove,
  cursorPositions = [],
  selectedMarkerId,
}) => {
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentCenter, setCurrentCenter] = useState<MapCenter>(defaultCenter);
  const mapRef = useRef<any>(null);
  const mapObjectRef = useRef<any>(null);
  const throttledOnCursorMove = useRef<((center: MapCenter) => void) | null>(null);

  // ✅ 말풍선(가게명) hover 제어
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const hoveredMarker = useMemo(
    () => markers.find((m) => m.id === hoveredMarkerId) || null,
    [markers, hoveredMarkerId]
  );

  // 8~12Hz 스로틀
  useEffect(() => {
    if (!onCursorMove) {
      throttledOnCursorMove.current = null;
      return;
    }
    let timeout: any = null;
    const fn = (center: MapCenter) => {
      if (timeout) return;
      timeout = setTimeout(() => { timeout = null; }, 50);
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
    checkKakaoMapLoaded();
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

  // 지도 이벤트 핸들러
  const handleMapClick = (_map: any, mouseEvent: any) => {
    const latlng = mouseEvent.latLng;
    eventHandlers?.onMapClick?.(latlng.getLat(), latlng.getLng());
  };
  const handleMapDragEnd = (map: any) => {
    const center = map.getCenter();
    const newCenter: MapCenter = { lat: center.getLat(), lng: center.getLng() };
    setCurrentCenter(newCenter);
    eventHandlers?.onMapDragEnd?.(newCenter);
    onMapMoved?.(newCenter);
  };
  const handleMapIdle = (map: any) => {
    const center = map.getCenter();
    const newCenter: MapCenter = { lat: center.getLat(), lng: center.getLng() };
    setCurrentCenter(newCenter);
    onMapIdle?.(newCenter);
  };
  const handleMapZoomChanged = (map: any) => {
    const level = map.getLevel();
    eventHandlers?.onMapZoomChanged?.(level);
  };
  const handleMarkerClick = (markerId: string) => {
    eventHandlers?.onMarkerClick?.(markerId);
  };

  // 외부에서 지도 중심점 접근
  const getCurrentCenter = (): MapCenter => currentCenter;
  useEffect(() => {
    if (mapRef.current) { (mapRef.current as any).getCurrentCenter = getCurrentCenter; }
  }, [currentCenter]);

  /* ✅ (변경) 선택/찜 여부에 따라 다른 마커 SVG 생성
        - 선택: 60px / 기본: 40px
        - 찜: 주황 + 별 / 일반: 파랑 + 흰 원 */
  const getMarkerImage = (isSelected: boolean, isFavorite?: boolean) => {
    const size = isSelected ? 60 : 40;
    const fillColor = isFavorite ? '#f59e0b' : '#3b82f6';
    const inner = isFavorite
      ? '<path d="M24 13l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88L24 27.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01L24 13z" fill="#fff"/>'
      : '<circle cx="24" cy="20" r="6" fill="#fff"/>';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
        <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter></defs>
        <g filter="url(#shadow)">
          <path d="M24 44s14-14 14-24A14 14 0 1 0 10 20c0 10 14 24 14 24z" fill="${fillColor}"/>
          ${inner}
        </g>
      </svg>`;
    const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    return {
      src: url,
      size: { width: size, height: size },
      options: { offset: { x: size / 2, y: size } }, // 핀 끝이 좌표에 닿도록
    } as const;
  };

  // 에러/로딩 표시
  if (mapError) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">지도를 불러올 수 없습니다</h3>
          <p className="text-sm text-gray-600 mb-4">{mapError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">새로고침</button>
        </div>
      </div>
    );
  }
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
        {/* 마커 렌더링 */}
        {markers.map((m) => {
          const isSelected = selectedMarkerId === m.id;
          const isFavorite = !!m.isFavorite; // ✅ 찜 여부
          return (
            <MapMarker
              key={m.id}
              position={{ lat: m.position.lat, lng: m.position.lng }}
              image={getMarkerImage(isSelected, isFavorite)} // ✅ (변경)
              zIndex={isSelected ? 100 : (isFavorite ? 50 : 10)} // ✅ 찜은 일반보다 위
              onClick={() => handleMarkerClick(m.id)}
              onMouseOver={() => setHoveredMarkerId(m.id)}
              onMouseOut={() => setHoveredMarkerId((prev) => (prev === m.id ? null : prev))}
            />
          );
        })}

        {/* ✅ 말풍선: hover시에만, 흰 배경/검정 글씨, 마커 바로 위 */}
        {hoveredMarker && (
          <CustomOverlayMap position={hoveredMarker.position} zIndex={1000}>
            {(() => {
              const markerHeight = selectedMarkerId === hoveredMarker.id ? 60 : 40;
              const gap = 6;
              const translate = `translate(-50%, calc(-100% - ${markerHeight + gap}px))`;
              return (
                <div className="pointer-events-none select-none" style={{ position: 'relative', left: '50%', transform: translate, opacity: 1 }}>
                  <div className="inline-block px-2 py-1 border border-gray-300 rounded-md shadow-md whitespace-nowrap" style={{ lineHeight: 1.2, backgroundColor: '#ffffff', opacity: 1 }}>
                    <span className="text-[11px] font-medium" style={{ color: '#000000' }}>
                      {hoveredMarker.restaurant?.name ?? hoveredMarker.title}
                    </span>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 border border-gray-300 rotate-45 shadow-sm" style={{ backgroundColor: '#ffffff', opacity: 1 }} />
                </div>
              );
            })()}
          </CustomOverlayMap>
        )}

        {/* 다른 사용자 커서 표시 (원본 유지) */}
        {cursorPositions.map((cp) => (
          <CustomOverlayMap key={cp.id} position={cp.position} zIndex={1000}>
            <div style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill={stringToColor(cp.id)} stroke="#ffffff" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
                <path d="M3 2l7 17 2-6 6-2L3 2z" />
              </svg>
              <div style={{ marginLeft: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
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

// 표시용 닉네임 결정
function getUserNickname(userId: string): string {
  const selfId = localStorage.getItem('userId') || '';
  if (String(selfId) === String(userId)) {
    return localStorage.getItem('userNickname') || '나';
  }
  return userId.slice(0, 4);
}

export default MapContainer;
