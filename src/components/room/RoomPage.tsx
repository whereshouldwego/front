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
import AppContainer from '../layout/AppContainer';
import styles from './RoomPage.module.css';

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
    <div className={styles.container}>
      {/* 메인 앱 (기존 AppContainer) - 헤더 제거로 전체 화면 */}
      <div className={styles.mainApp}>
        <AppContainer roomId={roomData.id} />
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
  );
};

export default RoomPage;