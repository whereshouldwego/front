/**
 * MapOverlay.tsx
 *
 * 지도 오버레이 컴포넌트
 *
 * 기능:
 * - 출발지 검색
 * - 현재 위치 버튼
 * - 지도 컨트롤
 */

import React, { useState, useCallback } from 'react';
import type { MapOverlayConfig, UserProfile } from '../../types';
import styles from './MapOverlay.module.css';
import { useWebSocket } from '../../stores/WebSocketContext';
import { debounce } from '../../utils/search';

interface MapOverlayProps {
  users?: UserProfile[];
  config?: MapOverlayConfig;
  onDepartureSubmit?: (location: string) => void;
  onDepartureCancel?: () => void;
  onCurrentLocationClick?: () => void;
  onUserProfileClick?: (userId: string) => void;
  className?: string;
}

// 기본 사용자 프로필들
const defaultUsers: UserProfile[] = [
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
];

// 기본 설정
const defaultConfig: MapOverlayConfig = {
  showDepartureSearch: false,
  departureLocation: '',
  currentLocationButtonText: '현 지도에서 검색'
};

const MapOverlay: React.FC<MapOverlayProps> = ({
  users = defaultUsers,
  config = defaultConfig,
  onDepartureSubmit,
  onDepartureCancel,
  onCurrentLocationClick,
  onUserProfileClick,
  className = ''
}) => {
  const [showDepartureSearch, setShowDepartureSearch] = useState(config.showDepartureSearch);
  const [departureLocation, setDepartureLocation] = useState(config.departureLocation);

  const { sendMessage, otherUsersCursors } = useWebSocket();

  // TODO: 실제 사용자 ID를 가져와야 합니다.
  const currentUserId = 'user-' + Math.random().toString(36).substring(7);

  const sendCursorUpdate = useCallback(debounce((x: number, y: number) => {
    sendMessage({
      type: 'cursorUpdate',
      userId: currentUserId,
      x,
      y,
    });
  }, 50), [sendMessage, currentUserId]); // 50ms 마다 전송

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    sendCursorUpdate(event.clientX, event.clientY);
  };

  const handleSetDeparture = () => {
    setShowDepartureSearch(true);
  };

  const handleDepartureSubmit = () => {
    if (departureLocation.trim()) {
      onDepartureSubmit?.(departureLocation.trim());
      setShowDepartureSearch(false);
      setDepartureLocation('');
    }
  };

  const handleDepartureCancel = () => {
    setShowDepartureSearch(false);
    setDepartureLocation('');
    onDepartureCancel?.();
  };

  const handleCurrentLocationClick = () => {
    onCurrentLocationClick?.();
  };

  const handleUserProfileClick = (userId: string) => {
    onUserProfileClick?.(userId);
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      onMouseMove={handleMouseMove}
      style={{ cursor: 'none' }} // 기본 커서 숨기기
    >
      {/* 상단 출발지 검색 입력칸 (출발지 설정 버튼 클릭 시에만 표시) */}
      {showDepartureSearch && (
        <div className={styles.topSearchContainer} id="top-search-container">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              id="top-departure-input"
              placeholder="출발지를 입력하세요..."
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-inter outline-none transition-colors focus:border-blue-600"
              value={departureLocation}
              onChange={(e) => setDepartureLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDepartureSubmit()}
            />
            <button
              id="search-submit-btn"
              className="bg-blue-600 text-white border-none rounded-lg px-4 py-2 text-xs font-semibold font-inter cursor-pointer transition-colors hover:bg-blue-700 whitespace-nowrap"
              onClick={handleDepartureSubmit}
            >
              설정
            </button>
            <button
              className="bg-gray-500 text-white border-none rounded-lg px-4 py-2 text-xs font-semibold font-inter cursor-pointer transition-colors hover:bg-gray-600 whitespace-nowrap"
              onClick={handleDepartureCancel}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 현위치 재검색 버튼 - 화면 하단 중앙 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto z-10">
        <button 
          className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-full px-6 py-3 shadow-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm"
          onClick={handleCurrentLocationClick}
        >
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span>{config.currentLocationButtonText}</span>
        </button>
      </div>

      {/* 사용자 프로필 배지들 */}
      <div className={styles.userProfiles}>
        {users.map((user) => (
          <div 
            key={user.id} 
            className={styles.profileBadge} 
            data-user={user.id} 
            data-location={user.location}
            onClick={() => handleUserProfileClick(user.id)}
          >
            <div 
              className={styles.profileAvatar}
              style={{ backgroundColor: user.avatarColor }}
            >
              {user.name}
            </div>
            <div className={styles.profileTooltip}>
              <div className="text-xs text-gray-800 mb-1">출발지: {user.location}</div>
              {user.isCurrentUser && (
                <button 
                  className={styles.setDepartureBtn} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDeparture();
                  }}
                >
                  출발지 설정
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 다른 사용자 커서 렌더링 */}
      {[...otherUsersCursors.entries()].map(([userId, cursor]) => (
        userId !== currentUserId && (
          <div
            key={userId}
            className={styles.otherCursor}
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            }}
          >
            {/* 커서 모양 (예: 작은 원 또는 아이콘) */}
            <div className={styles.cursorDot}></div>
            <div className={styles.cursorLabel}>{userId.substring(0, 4)}</div>
          </div>
        )
      ))}
    </div>
  );
};

export default MapOverlay; 