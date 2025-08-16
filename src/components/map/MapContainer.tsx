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
import { colorFromString } from '../../utils/color';
import { useWebSocket } from '../../stores/WebSocketContext';

/* ✅ [변경] 찜/후보 플래그 모두 허용 */
type MarkerWithFlags = MapMarkerType & { isFavorite?: boolean; isCandidate?: boolean };

// MapContainer 컴포넌트 props 인터페이스
interface MapContainerProps {
  markers?: MarkerWithFlags[]; // ✅ 후보 플래그 반영
  eventHandlers?: MapEventHandlers;
  className?: string;
  onMapMoved?: (center: MapCenter) => void;
  onMapIdle?: (center: MapCenter) => void;
  onCursorMove?: (center: MapCenter) => void;
  cursorPositions?: { id: string; position: MapCenter }[];
  // ✅ 선택된 마커 id (선택 시 마커 확대)
  selectedMarkerId?: string;
}

// 기본 지도 설정 (유성온천역 중심)
const defaultCenter = {
  lat: 36.35369004484255,
  lng: 127.34132312554642
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

  // WebSocket에서 사용자 이름 정보 가져오기
  const { presentUsers } = useWebSocket();

  // 표시용 닉네임 결정
  const getUserNickname = (userId: string): string => {
    const selfId = localStorage.getItem('userId') || '';
    if (String(selfId) === String(userId)) {
      return localStorage.getItem('userNickname') || '나';
    }
    const user = presentUsers.find(u => u.id === userId);
    if (user && user.name) {
      return user.name;
    }
    return userId.slice(0, 6);
  };

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

  /* ✅ [변경 | 추가] 선택된 마커로 지도 포커스 이동
       - selectedMarkerId가 바뀔 때 해당 마커 좌표로 panTo
       - 확대/축소 레벨은 기존 레벨 유지(요구사항: 포커스 이동)
  */
  useEffect(() => {
    if (!selectedMarkerId || !mapObjectRef.current || !window.kakao) return; // ✅ 안전 가드
    const target = markers.find(m => m.id === selectedMarkerId);
    if (!target) return;

    try {
      const latlng = new window.kakao.maps.LatLng(target.position.lat, target.position.lng);
      mapObjectRef.current.panTo(latlng); // ✅ 선택된 마커로 포커스 이동
    } catch (e) {
      console.warn('[MapContainer] panTo 실패:', e);
    }
  }, [selectedMarkerId, markers]); // ✅ 의존성: 선택/마커 목록 변동 시 동작

  /* ✅ [변경] 선택/찜/후보 여부에 따라 다른 마커 SVG 생성
        - 선택: 60px / 기본: 40px
        - 후보: 초록 + 체크박스(☑)
        - 찜: 주황 + 별(⭐)
        - 일반: 파랑 + 흰 원
     ※ 스타일/레이어 우선순위는 렌더링 시 zIndex에서 처리(선택 > 후보 > 찜 > 일반)
  */
  const getMarkerImage = (isSelected: boolean, isFavorite?: boolean, isCandidate?: boolean) => { // ✅ [변경]
    const size = isSelected ? 60 : 40;

    // ✅ 후보 우선 색상
    const fillColor = isCandidate
      ? '#10b981' // 초록(후보)
      : (isFavorite ? '#f59e0b' : '#3b82f6'); // 주황(찜) / 파랑(일반)

    // ✅ 내부 아이콘도 후보 우선
    const inner = isCandidate
      ? `
          <rect x="18" y="14" width="12" height="12" rx="2" fill="#fff"/>
          <path d="M20.5 20.5 l3 3 l4.5-6" stroke="${fillColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        `
      : (isFavorite
        ? '<path d="M24 13l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88L24 27.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01L24 13z" fill="#fff"/>'
        : '<circle cx="24" cy="20" r="6" fill="#fff"/>');

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 2 C14 2 6 10 6 20 c0 12 18 26 18 26 s18-14 18-26 C42 10 34 2 24 2 z" fill="${fillColor}" />
        ${inner}
      </svg>
    `;
    return {
      src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      size: { width: size, height: size },
      options: { offset: { x: size / 2, y: size } },
    };
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
          <p className="text-gray-600">지도를 불러오는 중.</p>
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
          const isFavorite = !!m.isFavorite;            // ✅ 찜 여부
          const isCandidate = !!(m as any).isCandidate; // ✅ 후보 여부
          return (
            <MapMarker
              key={m.id}
              position={{ lat: m.position.lat, lng: m.position.lng }}
              image={getMarkerImage(isSelected, isFavorite, isCandidate)} // ✅ 후보 아이콘 반영
              zIndex={isSelected ? 100 : (isCandidate ? 70 : (isFavorite ? 50 : 10))} // ✅ 선택 > 후보 > 찜 > 일반
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

        {/* 다른 사용자 커서 표시 */}
        {cursorPositions.map((cp) => (
          <CustomOverlayMap key={cp.id} position={cp.position} zIndex={1000}>
            <div style={{
              position: 'relative',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              transform: 'translate(0, 0)',
            }}>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill={colorFromString(cp.id)}
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  marginBottom: '2px'
                }}
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>

              {/* 사용자 닉네임 - 커서 아래에 표시 */}
              <div style={{
                color: '#000',
                fontSize: '11px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                marginLeft: '2px',
                textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8)'
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

export default MapContainer;
