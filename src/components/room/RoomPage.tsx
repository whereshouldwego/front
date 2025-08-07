/**
 * RoomPage.tsx
 *
 * 개별 방 페이지 - 실제 서비스
 *
 * 기능:
 * - 방별 독립적인 서비스 제공
 * - 방 공유 기능 (링크 복사)
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebSocketProvider } from '../../stores/WebSocketContext';
import { SidebarProvider } from '../../stores/SidebarContext';
import { ChatProvider } from '../../stores/ChatContext';
import { Sidebar } from '../sidebar';
import MapContainer from '../map/MapContainer';
import MapOverlay from '../map/MapOverlay';
import ChatSection from '../chat/ChatSection';
import styles from './RoomPage.module.css';
import type { MapCenter, MapEventHandlers, MapMarker, UserProfile } from '../../types';
import { restaurantData } from '../../data/restaurantData';

interface RoomData {
  id: string;
  name: string;
  participants: string[];
  createdAt: Date;
  isValid: boolean;
}

const RoomPage: React.FC = () => {
  // URL 파라미터 변경: roomId -> roomCode
  const { roomCode, roomId } = useParams<{ roomCode?: string; roomId?: string }>();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // roomCode 또는 roomId 사용 (호환성)
  const currentRoomId = roomCode || roomId;

  useEffect(() => {
    if (!currentRoomId) {
      navigate('/');
      return;
    }

    // 방 정보 로드
    loadRoomData(currentRoomId);
  }, [currentRoomId, navigate]);

  const loadRoomData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // 향후 서버 API 구현
      // const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`);
      // if (!response.ok) {
      //   throw new Error('방을 찾을 수 없습니다.');
      // }
      // const data = await response.json();

      // 임시 데이터 (실제로는 서버에서 가져옴)
      const mockRoomData: RoomData = {
        id,
        name: `방 ${id}`,
        participants: ['user1', 'user2'],
        createdAt: new Date(),
        isValid: true // 임시로 모든 방을 유효한 것으로 처리
      };

      // 방 코드 검증 (6자리 영숫자)
      const isValidRoomCode = /^[A-Z0-9]{6}$/.test(id);
      if (!isValidRoomCode) {
        throw new Error('올바르지 않은 방 코드입니다.');
      }

      setRoomData(mockRoomData);
    } catch (error) {
      console.error('방 정보 로드 실패:', error);
      setError(error instanceof Error ? error.message : '방 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 바로 링크 복사 - 간소화된 공유 기능
  const handleShareRoom = async () => {
    if (!roomData) return;
    
    try {
      // URL 변경: /room/ -> /rooms/
      const roomLink = `${window.location.origin}/rooms/${roomData.id}`;
      await navigator.clipboard.writeText(roomLink);
      alert('방 링크가 복사되었습니다! 친구들에게 공유해보세요.');
    } catch (error) {
      alert('링크 복사에 실패했습니다.');
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !roomData) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>🚫</div>
          <h2 className={styles.errorTitle}>
            {error || '방을 찾을 수 없습니다'}
          </h2>
          <p className={styles.errorDescription}>
            방 코드가 올바른지 확인하거나, 새로운 방을 생성해보세요.
          </p>
          <div className={styles.errorButtons}>
            <button 
              onClick={() => navigate('/')}
              className={`${styles.errorButton} ${styles.errorButtonPrimary}`}
            >
              새 방 만들기
            </button>
            <button 
              onClick={() => window.history.back()}
              className={`${styles.errorButton} ${styles.errorButtonSecondary}`}
            >
              뒤로가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WebSocketProvider>
      <SidebarProvider>
        <ChatProvider>
          <div className={styles.container}>
            {/* 메인 앱 - 전체 화면 서비스 */}
            <div className={styles.mainApp}>
              <div className="h-screen relative">
                <div className="absolute inset-0">
                  <div id="sidebar-container">
                    <Sidebar />
                  </div>
                  <RoomMainContent roomId={roomData.id} />
                </div>
              </div>
            </div>

            {/* 지도 상단에 플로팅하는 공유 버튼 */}
            <div className={styles.floatingButtonContainer}>
              <button
                onClick={handleShareRoom}
                className={styles.shareButton}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                공유하기
              </button>
            </div>
          </div>
        </ChatProvider>
      </SidebarProvider>
    </WebSocketProvider>
  );
};

// RoomPage용 메인 콘텐츠 컴포넌트
const RoomMainContent: React.FC<{ roomId: string }> = ({ roomId }) => {
  // 사용자 프로필 데이터 (방별로 다를 수 있음)
  const [users] = useState<UserProfile[]>([
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
    }
  ]);

  // 지도 마커 데이터
  const mapMarkers: MapMarker[] = restaurantData.search.map(restaurant => ({
    id: restaurant.id,
    position: {
      lat: restaurant.location.lat,
      lng: restaurant.location.lng
    },
    title: restaurant.name,
    category: restaurant.category,
    restaurant: restaurant
  }));

  // 이벤트 핸들러들
  const handleAuroraToggle = (isActive: boolean) => {
    console.log('Aurora 버튼 상태:', isActive, '방 ID:', roomId);
  };

  const handleDepartureSubmit = (location: string) => {
    console.log('출발지 설정:', location, '방 ID:', roomId);
  };

  const handleCurrentLocationClick = () => {
    console.log('현위치 재검색 클릭', '방 ID:', roomId);
  };

  const handleUserProfileClick = (userId: string) => {
    console.log('사용자 프로필 클릭:', userId, '방 ID:', roomId);
  };

  // 지도 이벤트 핸들러
  const mapEventHandlers: MapEventHandlers = {
    onMapClick: (lat: number, lng: number) => {
      console.log('지도 클릭:', lat, lng, '방 ID:', roomId);
    },
    onMarkerClick: (markerId: string) => {
      console.log('마커 클릭:', markerId, '방 ID:', roomId);
    },
    onMapDragEnd: (center: MapCenter) => {
      console.log('지도 드래그 종료:', center, '방 ID:', roomId);
    },
    onMapZoomChanged: (level: number) => {
      console.log('지도 줌 변경:', level, '방 ID:', roomId);
    }
  };

  return (
    <div 
      className="bg-gray-100 relative overflow-hidden"
      id="main-content"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
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

export default RoomPage;