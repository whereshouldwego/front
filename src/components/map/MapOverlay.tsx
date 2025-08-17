/**
 * MapOverlay.tsx
 * 
 * 기존 파일: src/backup/MapComponents.html
 * 변환 내용:
 * - 지도 위 오버레이 요소들을 React 컴포넌트로 변환
 * - 사용자 프로필 배지들
 * - 출발지 검색 입력창
 * - 반응형 디자인 적용
 * 
 * 기존 CSS: src/backup/MapComponents.css
 * - 프로필 배지 스타일링
 * - 검색 입력창 스타일링
 * - 반응형 breakpoint 적용
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { MapOverlayConfig, MapCenter } from '../../types';
import styles from './MapOverlay.module.css';
import { useWebSocket } from '../../stores/WebSocketContext';
import { colorFromString } from '../../utils/color';
import UserProfileEdit from '../profile/UserProfileEdit';

interface MapOverlayProps {
  config?: MapOverlayConfig;
  onDepartureSubmit?: (location: string) => void;
  onDepartureCancel?: () => void;
  onCurrentLocationSearch?: (center: MapCenter) => void;
  showCurrentLocationButton?: boolean;
  currentMapCenter?: MapCenter;
  className?: string;
}

// 기본 설정
const defaultConfig: MapOverlayConfig = {
  showDepartureSearch: false,
  departureLocation: '',
  currentLocationButtonText: '이 지역에서 검색',
  showCurrentLocationButton: false,
};

const MapOverlay: React.FC<MapOverlayProps> = ({
  config = defaultConfig,
  onDepartureSubmit,
  onDepartureCancel,
  onCurrentLocationSearch,
  showCurrentLocationButton = false,
  currentMapCenter,
  className = ''
}) => {
  const [showDepartureSearch, setShowDepartureSearch] = useState(config.showDepartureSearch);
  const [departureLocation, setDepartureLocation] = useState(config.departureLocation);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const { sendCursorPosition, presentUsers } = useWebSocket();

  // 현재 사용자 ID 가져오기
  const currentUserId = useMemo(() => {
    const userIdRaw = localStorage.getItem('userId') || '';
    const n = Number(userIdRaw);
    return String(Number.isFinite(n) && !Number.isNaN(n) ? n : userIdRaw || `user_${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  // 지도 중심 변경에 따른 커서 전송은 비활성화

  // 🆕 이 지역에서 검색 처리 함수
  const handleCurrentLocationSearch = useCallback(async () => {
    if (!currentMapCenter) return;
    onCurrentLocationSearch?.(currentMapCenter);
  }, [currentMapCenter, onCurrentLocationSearch]);

  // 사용자 프로필 기능 제거로 인한 진입 버튼 제거됨

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

  // 프로필 클릭 핸들러
  const handleProfileClick = (userId: string) => {
    // 본인 프로필만 편집 가능
    if (userId === currentUserId) {
      setEditingProfileId(userId);
    }
  };

  // 프로필 이름 변경 핸들러
  const handleProfileNameChange = (newName: string) => {
    // localStorage에 새로운 닉네임 저장
    localStorage.setItem('userNickname', newName);
    
    // 편집 상태 종료
    setEditingProfileId(null);
    
    // WebSocket을 통해 다른 사용자들에게 업데이트된 정보 전송
    if (currentMapCenter) {
      sendCursorPosition(currentMapCenter);
    }
  };

  // 프로필 편집 취소 핸들러
  const handleProfileEditCancel = () => {
    setEditingProfileId(null);
  };

  return (
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ cursor: 'default' }}
      >
      {/* User Presence: 접속자 표시 */}
      {presentUsers?.length > 0 && (
        <div className={styles.userPresence}>
          <div className={styles.userRows}>
            {/* 첫 번째 줄: 최대 5명 */}
            <div className={styles.userRow}>
              {presentUsers.slice(0, 5).map((u) => {
                const isCurrentUser = u.id === currentUserId;
                const isEditing = editingProfileId === u.id;
                
                return (
                  <div key={u.id} className={styles.userItem}>
                    <div 
                      className={`${styles.userAvatar} ${isCurrentUser ? styles.currentUserAvatar : ''}`}
                      style={{ backgroundColor: colorFromString(u.id) }}
                      title={isCurrentUser ? `${u.name} (클릭하여 이름 변경)` : u.name}
                      onClick={() => handleProfileClick(u.id)}
                    >
                      <svg className={styles.userIcon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    {isEditing ? (
                      <UserProfileEdit
                        currentName={u.name}
                        onNameChange={handleProfileNameChange}
                        onCancel={handleProfileEditCancel}
                        isInline={true}
                      />
                    ) : (
                      <span 
                        className={`${styles.userNickname} ${isCurrentUser ? styles.currentUserNickname : ''}`}
                        onClick={() => isCurrentUser && handleProfileClick(u.id)}
                      >
                        {u.name}
                      </span>
                    )}
                  </div>
                );
              })}
              
              {/* 확장 버튼 또는 카운터 */}
              {presentUsers.length > 5 && (
                <div 
                  className={styles.expandButton}
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={`${presentUsers.length - 5}명 더 보기`}
                >
                  {isExpanded ? '−' : `+${presentUsers.length - 5}`}
                </div>
              )}
            </div>
            
            {/* 두 번째 줄: 6-10명 (확장된 경우에만 표시) */}
            {isExpanded && presentUsers.length > 5 && (
              <div className={styles.userRow}>
                {presentUsers.slice(5, 10).map((u) => {
                  const isCurrentUser = u.id === currentUserId;
                  const isEditing = editingProfileId === u.id;
                  
                  return (
                    <div key={u.id} className={styles.userItem}>
                      <div 
                        className={`${styles.userAvatar} ${isCurrentUser ? styles.currentUserAvatar : ''}`}
                        style={{ backgroundColor: colorFromString(u.id) }}
                        title={isCurrentUser ? `${u.name} (클릭하여 이름 변경)` : u.name}
                        onClick={() => handleProfileClick(u.id)}
                      >
                        <svg className={styles.userIcon} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                      {isEditing ? (
                        <UserProfileEdit
                          currentName={u.name}
                          onNameChange={handleProfileNameChange}
                          onCancel={handleProfileEditCancel}
                          isInline={true}
                        />
                      ) : (
                        <span 
                          className={`${styles.userNickname} ${isCurrentUser ? styles.currentUserNickname : ''}`}
                          onClick={() => isCurrentUser && handleProfileClick(u.id)}
                        >
                          {u.name}
                        </span>
                      )}
                    </div>
                  );
                })}
                
                {/* 10명 초과시 남은 인원 표시 */}
                {presentUsers.length > 10 && (
                  <span className={styles.userCount}>+{presentUsers.length - 10}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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

      {/* 이 지역에서 검색 버튼 (지도 하단 중앙) */}
      {showCurrentLocationButton && (
        <div className={styles.currentLocationContainer}>
          <button 
            className={styles.currentLocationBtn}
            onClick={handleCurrentLocationSearch}
          >
            <div className={styles.locationIcon}>
              📍
            </div>
            <span>{config.currentLocationButtonText}</span>
          </button>
        </div>
      )}

      {/* 다른 사용자 커서 렌더링: lat/lng -> 화면 좌표 변환 필요 (간단히 숨김 처리 또는 추후 구현) */}
    </div>
  );
};

export default MapOverlay; 