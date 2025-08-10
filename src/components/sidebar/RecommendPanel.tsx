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

import React, { useEffect, useState } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import type { Restaurant } from '../../types';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';

const RecommendPanel: React.FC<{ userId: number }> = ({ userId }) => {
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 추천 데이터 가져오기
  useEffect(() => {
    const getRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 임시로 빈 배열로 설정 (구현 전까지)
        const mockRecommendations: Restaurant[] = [];
        
        // 로딩 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setRecommendations(mockRecommendations);
      } catch (err) {
        setError('추천 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    getRecommendations();
  }, []);

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
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.LOADING}</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {/* 추천 결과 */}
        {!isLoading && !error && recommendations.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>추천 맛집 ({recommendations.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {recommendations.map((restaurant) => (
                  <RestaurantCard
                  data={restaurant}
                  className={styles.restaurantCard}
                  actions={
                    <ActionButtons
                      userId={userId || 1}
                      placeId={restaurant.placeId}
                      showFavoriteButton
                      showCandidateButton
                    />
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && recommendations.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.recommend}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendPanel;
