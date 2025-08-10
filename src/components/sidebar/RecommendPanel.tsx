/**
 * RecommendPanel.tsx
 *
 * 추천 패널 컴포넌트
 *
 * 기능:
 * - AI 추천 맛집 표시
 * - 추천 결과 필터링
 * - 로딩 및 에러 상태 처리
 */

import React, { useEffect } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
// import { useRecommendations } from '../../hooks/useRecommendations'; 
import { useRestaurantStore } from '../../stores/RestaurantStore'; // 임시로 search 사용. 추후 생성해야 함

interface RecommendPanelProps {
  userId: number;
  roomCode?: string;
}

const RecommendPanel: React.FC<RecommendPanelProps> = ({ userId, roomCode }) => {
  const {
    recommendations,
    loading: recommendationsLoading,
    error: recommendationsError,
    fetchRecommendations,
    refreshRecommendations
  } = useRecommendations(roomCode);

  // 전역 상태에서 필요한 데이터
  const { 
    favorites,
    candidates,
    refreshFavorites,
    refreshCandidates 
  } = useRestaurantStore();

  // 컴포넌트 마운트 시 추천 데이터 로드
  useEffect(() => {
    if (roomCode) {
      fetchRecommendations();
    }
  }, [roomCode, fetchRecommendations]);

  const handleStateChange = async () => {
    try {
      // 관련 상태들을 병렬로 새로고침
      await Promise.all([
        refreshRecommendations(),
        refreshFavorites(),
        refreshCandidates()
      ]);
    } catch (error) {
      console.error('상태 새로고침 중 오류 발생:', error);
    }
  };
  // 추천 결과 렌더링
  const renderRecommendations = () => {
    if (!recommendations || recommendations.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>{EMPTY_MESSAGES.recommend}</p>
        </div>
      );
    }
  return (
    <div className={styles.resultsContainer}>
    <div className={styles.resultsHeader}>
      <span>추천 맛집 ({recommendations.length}개)</span>
    </div>
    <div className={styles.restaurantCards}>
      {recommendations.map((restaurant) => (
        <RestaurantCard
          key={restaurant.placeId}
          data={restaurant}
          className={styles.restaurantCard}
          actions={
            <ActionButtons
              userId={userId}
              placeId={restaurant.placeId}
              showFavoriteButton
              showCandidateButton
              onStateChange={handleStateChange}
            />
          }
        />
      ))}
    </div>
  </div>
);
};
return (
  <div className={styles.panelContent}>
    {/* 헤더 */}
    <div className={styles.panelHeader}>
      <div className={styles.panelTitle}>
        <div className={styles.titleContainer}>
          <h2 className={styles.titleText}>{PANEL_CONFIGS.recommend.title}</h2>
        </div>
      </div>
    </div>

    {/* 패널 바디 */}
    <div className={styles.panelBody}>
      {/* 로딩 상태 */}
      {recommendationsLoading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>{LOADING_MESSAGES.LOADING}</p>
        </div>
      )}

      {/* 에러 상태 */}
      {!recommendationsLoading && recommendationsError && (
        <div className={styles.errorState}>
          <p>{recommendationsError}</p>
        </div>
      )}

      {/* 추천 결과 */}
      {!recommendationsLoading && !recommendationsError && renderRecommendations()}
    </div>
  </div>
);
};


export default RecommendPanel;
