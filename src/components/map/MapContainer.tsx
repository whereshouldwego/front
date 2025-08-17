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
import styles from './MapContainer.module.css';

/* 찜/후보 플래그 모두 허용 */
type MarkerWithFlags = MapMarkerType & { isFavorite?: boolean; isCandidate?: boolean };

interface MapContainerProps {
  markers?: MarkerWithFlags[];
  eventHandlers?: MapEventHandlers;
  className?: string;
  onMapMoved?: (center: MapCenter) => void;
  onMapIdle?: (center: MapCenter) => void;
  onCursorMove?: (center: MapCenter) => void;
  cursorPositions?: { id: string; position: MapCenter }[];
  selectedMarkerId?: string;
}

/** 기본 지도 설정 (유성온천역 중심) */
const defaultCenter = {
  lat: 36.35369004484255,
  lng: 127.34132312554642,
};

/* ✅ [추가] 좌표 보정: x/y(=lng/lat)과 lat/lng 혼용을 자동 감지해 스왑/정규화 */
function normalizeLatLng(pos?: MapCenter | null): MapCenter {
  const safe = (n: any) => typeof n === 'number' && Number.isFinite(n);
  let lat = safe(pos?.lat) ? (pos as MapCenter).lat : defaultCenter.lat;
  let lng = safe(pos?.lng) ? (pos as MapCenter).lng : defaultCenter.lng;

  // (1) 기본 유효성
  const latOut = Math.abs(lat) > 90;
  const lngOut = Math.abs(lng) > 180;

  // (2) 한국 좌표 특성 기반 스왑 휴리스틱
  //    - 잘못 뒤바뀐 경우 자주 보이는 패턴: lat≈126~130, lng≈33~44
  const looksSwappedKR = (lat >= 60 && lat <= 140) && (lng >= 20 && lng <= 60);

  if (latOut || lngOut || looksSwappedKR) {
    // 스왑이 더 말이 되는지 검사
    const sLat = lng;
    const sLng = lat;
    const sLatOk = Math.abs(sLat) <= 90;
    const sLngOk = Math.abs(sLng) <= 180;
    if (sLatOk && sLngOk) {
      lat = sLat;
      lng = sLng;
    }
  }

  // (3) 최종 방어: 여전히 비정상이면 기본 중심 유지
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ...defaultCenter };
  }
  return { lat, lng };
}

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
    const user = presentUsers.find((u) => u.id === userId);
    if (user && user.name) return user.name;
    return userId.slice(0, 6);
  };

  // 말풍선(가게명) hover 제어
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredMarker = useMemo(
    () => markers.find((m) => m.id === hoveredMarkerId) || null,
    [markers, hoveredMarkerId]
  );
  
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
    

  // 8~12Hz 스로틀
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
      }, 50);
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
          setMapError(
            '카카오맵 API 키가 설정되지 않았습니다. 환경변수 VITE_KAKAO_MAP_API_KEY를 설정해주세요.'
          );
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
    if (mapRef.current) {
      (mapRef.current as any).getCurrentCenter = getCurrentCenter;
    }
  }, [currentCenter]);

  /* ✅ [추가] 카드/리스트 클릭으로 선택된 마커로 포커스 이동할 때 좌표 보정 */
  useEffect(() => {
    if (!mapObjectRef.current || !selectedMarkerId) return;
    const target = markers.find((m) => String(m.id) === String(selectedMarkerId));
    if (!target) return;
    if (!(window as any).kakao || !(window as any).kakao.maps) return;

    const targetPos = normalizeLatLng(target.position); // ✅ 보정 적용
    try {
      const latlng = new window.kakao.maps.LatLng(targetPos.lat, targetPos.lng);
      mapObjectRef.current.panTo(latlng); // 중심 이동
      // 확대 레벨은 기존 유지 (원하면 조건부로 setLevel 조정 가능)
      setCurrentCenter(targetPos);
    } catch (e) {
      console.warn('[MapContainer] panTo 실패:', e);
    }
  }, [selectedMarkerId, markers]);

  /* 선택/찜/후보 여부에 따라 다른 마커 SVG 생성 */
  const getMarkerImage = (isSelected: boolean, isFavorite?: boolean, isCandidate?: boolean) => {
    const size = isSelected ? 60 : 40;

    // 후보 우선 색상
    const fillColor = isCandidate ? '#10b981' : isFavorite ? '#f59e0b' : '#3b82f6';

    // 내부 아이콘도 후보 우선
    const inner = isCandidate
      ? `
          <rect x="18" y="14" width="12" height="12" rx="2" fill="#fff"/>
          <path d="M20.5 20.5 l3 3 l4.5-6" stroke="${fillColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        `
      : isFavorite
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
      options: { offset: { x: size / 2, y: size } },
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
        {/* 마커 렌더링 (좌표 보정 적용) */}
        {markers.map((m) => {
          const isSelected = selectedMarkerId === m.id;
          const isFavorite = !!m.isFavorite;
          const isCandidate = !!(m as any).isCandidate;

          const pos = normalizeLatLng(m.position); // ✅ [추가] 렌더링에도 보정 적용
          // 보정 후에도 비정상이면 렌더 스킵
          if (Math.abs(pos.lat) > 90 || Math.abs(pos.lng) > 180) return null;

          return (
            <MapMarker
              key={m.id}
              position={{ lat: pos.lat, lng: pos.lng }}
              image={getMarkerImage(isSelected, isFavorite, isCandidate)}
              zIndex={isSelected ? 100 : isCandidate ? 70 : isFavorite ? 50 : 10}
              onClick={() => handleMarkerClick(m.id)}
              onMouseOver={() => setHoveredMarkerId(m.id)}
              onMouseOut={() => setHoveredMarkerId((prev) => (prev === m.id ? null : prev))}
            />
          );
        })}

        {/* 말풍선: hover시에만 */}
        {hoveredMarker && (
          <CustomOverlayMap 
            position={hoveredMarker.position} 
            zIndex={1000}
          >
            <div className={styles.tooltip}>
              <div className={styles.tooltipBody}>
                {hoveredMarker.restaurant?.name ?? hoveredMarker.title}
              </div>
              <div className={styles.tooltipArrow} />
            </div>
          </CustomOverlayMap>
        )}
        {/* 다른 사용자 커서 표시 */}
        {cursorPositions.map((cp) => (
          <CustomOverlayMap key={cp.id} position={normalizeLatLng(cp.position)} zIndex={1000}> {/* ✅ [추가] 보정 */}
            <div
              style={{
                position: 'relative',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transform: 'translate(0, 0)',
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill={colorFromString(cp.id)}
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  marginBottom: '2px',
                }}
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>

              {/* 사용자 닉네임 - 커서 아래에 표시 */}
              <div
                style={{
                  color: '#000',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  marginLeft: '2px',
                  textShadow:
                    '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8)',
                }}
              >
                {(() => {
                  const selfId = localStorage.getItem('userId') || '';
                  return String(cp.id) === String(selfId)
                    ? localStorage.getItem('userNickname') || '나'
                    : getUserNickname(cp.id);
                })()}
              </div>
            </div>
          </CustomOverlayMap>
        ))}
      </Map>
    </div>
  );
};

export default MapContainer;
