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

import React, { useEffect, useState, useRef } from 'react';
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
import { useWebSocket } from '../../stores/WebSocketContext';
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

  // 중복 실행 방지를 위한 ref
  const isLoadingRef = useRef(false);
  const loadedRoomId = useRef<string | null>(null);

  // roomCode 또는 roomId 사용 (호환성)
  const currentRoomId = roomCode || roomId;

  useEffect(() => {
    if (!currentRoomId) {
      navigate('/');
      return;
    }

  // 이미 같은 방을 로딩 중이거나 로딩 완료된 경우 중복 실행 방지
    if (isLoadingRef.current || loadedRoomId.current === currentRoomId) {
      return;
    }

  // 방 정보 로드
  loadRoomData(currentRoomId);
}, [currentRoomId, navigate]);

  const loadRoomData = async (id: string) => {
    if (isLoadingRef.current) {
      console.log('이미 로딩 중입니다. 중복 실행 방지');
      return;
    }

    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      console.log(`방 정보 로드 시작: ${id}`);
      
      // 기존 사용자 토큰 확인
      const existingToken = localStorage.getItem('accessToken');
      const existingUserId = localStorage.getItem('userId');
      
      // 2단계: 사용자 인증 확인 및 새 사용자 생성
      let userToken = existingToken;
      let userId = existingUserId;

      // 토큰이 없는 경우에만 새 사용자 생성
      if (!userToken) {
        console.log('새 사용자 생성 중...');
        
        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/guest?roomCode=${id}`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!userResponse.ok) {
          throw new Error('사용자 생성에 실패했습니다.');
        }

        const userData = await userResponse.json();
        
        // 새 사용자 정보 저장
        userToken = userData.accessToken;
        userId = userData.userId;
        
        // null 체크 후 localStorage에 저장
        if (userToken && userId) {
          localStorage.setItem('accessToken', userToken);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userNickname', userData.nickname || '');
          localStorage.setItem('userType', 'guest');
          
          console.log('새 사용자 생성 완료:', {
            userId: userId,
            nickname: userData.nickname,
            roomCode: id
          });
        } else {
          throw new Error('사용자 정보가 올바르지 않습니다.');
        }
      }

      // 3단계: 인증된 사용자로 방 정보 조회 (방 존재 여부 확인 포함)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('존재하지 않는 방입니다.');
        } else if (response.status === 403) {
          // 권한이 없는 경우, 방에 참가 요청
          console.log('방 참가 요청 중...');
          
          const joinResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}/join`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!joinResponse.ok) {
            throw new Error('방에 참가할 수 없습니다.');
          }

          // 참가 성공 후 다시 방 정보 조회
          const finalResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!finalResponse.ok) {
            throw new Error('방 정보를 불러올 수 없습니다.');
          }

          const data = await finalResponse.json();
          const roomInfo: RoomData = {
            id: data.roomCode || id,
            name: data.name || `방 ${data.roomCode || id}`,
            participants: data.participants || [],
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            isValid: true
          };

          setRoomData(roomInfo);
          loadedRoomId.current = id; // 로딩 완료된 방 ID 저장
          console.log('방 참가 및 정보 로드 성공:', roomInfo);
          
        } else {
          throw new Error(`방을 불러올 수 없습니다. (${response.status})`);
        }
      } else {
        // 기존 사용자 또는 새 사용자 - 바로 방 정보 로드
        const data = await response.json();
        const roomInfo: RoomData = {
          id: data.roomCode || id,
          name: data.name || `방 ${data.roomCode || id}`,
          participants: data.participants || [],
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          isValid: true
        };

        setRoomData(roomInfo);
        loadedRoomId.current = id; // 로딩 완료된 방 ID 저장
        console.log('방 정보 로드 성공:', roomInfo);
      }

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
        } else if (error.message.includes('권한이 없습니다') || error.message.includes('참가할 수 없습니다')) {
          setTimeout(() => {
            alert('방에 접근할 수 없습니다. 홈으로 이동합니다.');
            navigate('/');
          }, 2000);
        }
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }

    } finally {
      setLoading(false);
      isLoadingRef.current = false; // 로딩 상태 해제
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
    <WebSocketProvider roomCode={roomData.id}>
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
  const { sendCursorPosition, otherUsersPositions } = useWebSocket();
  
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
        onCursorMove={(pos) => sendCursorPosition(pos)}
        cursorPositions={[...otherUsersPositions.entries()].map(([id, pos]) => ({ id, position: pos }))}
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