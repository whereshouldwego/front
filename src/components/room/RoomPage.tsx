/**
 * RoomPage.tsx
 *
 * 개별 방 페이지 - 실제 서비스
 *
 * 기능:
 * - 방별 독립적인 서비스 제공
 * - 방 공유 기능 (링크 복사)
 * - 현위치 검색 기능
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebSocketProvider } from '../../stores/WebSocketContext';
import { SidebarProvider, useSidebar } from '../../stores/SidebarContext';
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

      console.log(`방 정보 로드 시작: ${id}`);
      
      // 실제 서버 API 구현 - 주석 해제 및 수정
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        // 인증 토큰 포함
        ...(localStorage.getItem('accessToken') && {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        })
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('존재하지 않는 방입니다.');
      } else if (response.status === 403) {
        throw new Error('방에 접근할 권한이 없습니다.');
      } else {
        throw new Error(`방을 불러올 수 없습니다. (${response.status})`);
      }
    }

    const data = await response.json();
    console.log('백엔드 응답:', data);

    // 백엔드 응답을 RoomData 형태로 변환
    const roomInfo: RoomData = {
      id: data.roomCode || id,
      name: data.name || `방 ${data.roomCode || id}`,
      participants: data.participants || [],
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      isValid: true
    };

    setRoomData(roomInfo);
    console.log('방 정보 로드 성공:', roomInfo);

    } catch (error) {
    console.error('방 정보 로드 실패:', error);
    
    if (error instanceof Error) {
      setError(error.message);
      
      // 특정 에러에 따른 처리
      if (error.message.includes('존재하지 않는 방')) {
        setTimeout(() => {
          alert('존재하지 않는 방입니다. 홈으로 이동합니다.');
          navigate('/');
        }, 2000);
      } else if (error.message.includes('권한이 없습니다')) {
        setTimeout(() => {
          alert('방에 접근할 권한이 없습니다. 홈으로 이동합니다.');
          navigate('/');
        }, 2000);
      }
    } else {
      setError('알 수 없는 오류가 발생했습니다.');
    }

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

// RoomPage용 메인 콘텐츠 컴포넌트 - 현위치 검색 기능 추가
const RoomMainContent: React.FC<{ roomId: string }> = ({ roomId }) => {
  // useSidebar 훅 추가
  const { searchResults, recommendations, favorites, votes, performSearch } = useSidebar();
  
  //  현위치 검색 버튼 표시 상태
  const [showCurrentLocationButton, setShowCurrentLocationButton] = useState(false);
  const [lastSearchCenter, setLastSearchCenter] = useState<MapCenter | null>(null);

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

  // 지도 마커 데이터 (사이드바 결과 반영)
  const mapMarkers: MapMarker[] = React.useMemo(() => {
    let restaurants = restaurantData.search || [];
    
    // 활성 패널에 따른 데이터 선택
    if (searchResults.length > 0) {
      restaurants = searchResults;
    } else if (recommendations.length > 0) {
      restaurants = recommendations;
    } else if (favorites.length > 0) {
      restaurants = favorites;
    } else if (votes.length > 0) {
      restaurants = votes;
    }

    return restaurants.map(restaurant => ({
      id: restaurant.id,
      position: {
        lat: restaurant.location.lat,
        lng: restaurant.location.lng
      },
      title: restaurant.name,
      category: restaurant.category,
      restaurant: restaurant
    }));
  }, [searchResults, recommendations, favorites, votes]);

  // 이벤트 핸들러들
  const handleAuroraToggle = (isActive: boolean) => {
    console.log('Aurora 버튼 상태:', isActive, '방 ID:', roomId);
  };

  const handleDepartureSubmit = (location: string) => {
    console.log('출발지 설정:', location, '방 ID:', roomId);
  };

  const handleUserProfileClick = (userId: string) => {
    console.log('사용자 프로필 클릭:', userId, '방 ID:', roomId);
  };

  // 지도 이동 시 버튼 표시 로직
  const handleMapMoved = (center: MapCenter) => {
    console.log('지도 이동:', center, '방 ID:', roomId);
    
    // 지도가 이동했고, 이전 검색 위치와 충분히 다르면 버튼 표시
    const threshold = 0.001; // 약 100m 정도의 거리
    
    if (!lastSearchCenter || 
        Math.abs(center.lat - lastSearchCenter.lat) > threshold || 
        Math.abs(center.lng - lastSearchCenter.lng) > threshold) {
      setShowCurrentLocationButton(true);
    }
  };

  // 현위치 검색 실행
  const handleCurrentLocationSearch = async (center: MapCenter) => {
    console.log('현위치 검색 실행:', center, '방 ID:', roomId);
    
    try {
      // 검색 실행 - 현재 지도 중심점 기반으로 검색
      await performSearch({
        query: '', // 빈 쿼리로 위치 기반 검색
        location: `${center.lat},${center.lng}`, // 위도,경도 형태로 전달
        category: '', // 모든 카테고리
        limit: 20 // 충분한 결과 수
      });
      
      // 검색 완료 후 버튼 숨기기 및 위치 저장
      setShowCurrentLocationButton(false);
      setLastSearchCenter(center);
      
      // 성공 피드백
      console.log('✅ 현위치 검색 완료 (방:', roomId, ')');
      
    } catch (error) {
      console.error('❌ 현위치 검색 실패 (방:', roomId, '):', error);
      
      // 에러 시에도 버튼 숨기기 (사용자 혼란 방지)
      setShowCurrentLocationButton(false);
    }
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
        onMapMoved={handleMapMoved}
      />
      <MapOverlay
        users={users}
        onDepartureSubmit={handleDepartureSubmit}
        onUserProfileClick={handleUserProfileClick}
        onCurrentLocationSearch={handleCurrentLocationSearch}
        showCurrentLocationButton={showCurrentLocationButton}
      />
      <ChatSection
        onAuroraToggle={handleAuroraToggle}
      />
    </div>
  );
};

export default RoomPage;