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

import React, { useCallback, useEffect } from 'react';
import { EMPTY_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar'; // LOADING_MESSAGES 추후 사용
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
// import { useRecommendations } from '../../hooks/useRecommendations'; 
// 임시로 search 사용. 추후 생성해야 함
import { useSidebar } from '../../stores/SidebarContext';
import type { MapCenter } from '../../types';

const DEFAULT_CENTER: MapCenter = {
  lat: 37.5002, // 역삼역 위도
  lng: 127.0364 // 역삼역 경도
};

interface RecommendPanelProps {
  userId: number;
  center?: MapCenter;
}

const RecommendPanel: React.FC<RecommendPanelProps> = ({ userId, center }) => {
  // SidebarContext에서 검색 결과와 함수들 가져오기
  const { 
    searchResults,
    performSearch,
    setSelectedRestaurantId, // ✅ [추가] 카드 클릭 시 선택 핀 지정
  } = useSidebar();

  // 컴포넌트 마운트 시 위치 기반 검색 실행 (추천용)
  useEffect(() => {
    if (center) {
      const searchCenter = center || DEFAULT_CENTER;
      performSearch({
        query: '',
        location: `${searchCenter.lat},${searchCenter.lng}`,
        limit: 10
      });
    }
  }, [center, performSearch]);

  const handleStateChange = useCallback(async () => {
    try {
      // 검색 결과를 다시 가져와서 상태 정보 업데이트
      if (center) {
        const searchCenter = center || DEFAULT_CENTER;
        await performSearch({
          query: '',
          location: `${searchCenter.lat},${searchCenter.lng}`,
          limit: 10
        });
      }
    } catch (error) {
      console.error('추천 데이터 새로고침 중 오류 발생:', error);
    }
  }, [center, performSearch]);

  // 추천 결과 렌더링
  const renderRecommendations = () => {
    if (!searchResults || searchResults.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>{EMPTY_MESSAGES.recommend}</p>
        </div>
      );
    }
    return (
      <div className={styles.resultsContainer}>
        <div className={styles.resultsHeader}>
          <span>추천 맛집 ({searchResults.length}개)</span>
        </div>
        <div className={styles.restaurantCards}>
          {searchResults.map((restaurant) => (
            // ✅ [추가] 카드 클릭 시 해당 식당으로 지도 포커스 이동
            <div
              key={restaurant.placeId}
              className={styles.restaurantCard}
              onClick={() => setSelectedRestaurantId(String(restaurant.placeId))} // ✅ [추가]
            >
              <RestaurantCard
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
            </div>
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
        {/* 추천 결과 */}
        {renderRecommendations()}
      </div>
    </div>
  );
};

export default RecommendPanel;
