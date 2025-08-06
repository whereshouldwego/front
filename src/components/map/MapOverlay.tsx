/**
 * MapOverlay.tsx
 * 
 * 기존 파일: src/backup/MapComponents.html
 * 변환 내용:
 * - 지도 위 오버레이 요소들을 React 컴포넌트로 변환
 * - 사용자 프로필 배지들
 * - 출발지 검색 입력창
 * - 현위치 재검색 버튼
 * - 반응형 디자인 적용
 * 
 * 기존 CSS: src/backup/MapComponents.css
 * - 프로필 배지 스타일링
 * - 검색 입력창 스타일링
 * - 반응형 breakpoint 적용
 */

import React, { useState } from 'react';
import type { MapOverlayConfig, UserProfile } from '../../types';
import styles from './MapOverlay.module.css';

// MapOverlay 컴포넌트 props 인터페이스
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
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
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
              onKeyPress={(e) => e.key === 'Enter' && handleDepartureSubmit()}
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
    </div>
  );
};

export default MapOverlay; 