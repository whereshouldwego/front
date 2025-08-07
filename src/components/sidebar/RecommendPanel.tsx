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
import styles from './SidebarPanels.module.css';

const RecommendPanel: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 추천 데이터 가져오기
  useEffect(() => {
    const getRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 실제 API 호출 대신 임시 데이터 사용
        const mockRecommendations: Restaurant[] = [
          {
            id: 'rec1',
            name: '맛있는 한식집',
            category: '한식',
            distance: '100m',
            phone: '02-1111-2222',
            location: { lat: 37.5002, lng: 127.0364, address: '서울 강남구 강남대로 123'},
            placeUrl: 'https://place.map.kakao.com/1111111111',
            description: '정갈한 한식과 친절한 서비스',
            tags: ['한식', '가정식'],
            isFavorite: false,
            isCandidate: false
          },
          {
            id: 'rec2',
            name: '고급 양식당',
            category: '양식',
            category_group_code: 'FD6',
            category_group_name: '음식점',
            phone: '02-2222-3333',
            address: '서울 강남구 강남대로 456',
            road_address: '서울 강남구 강남대로 456',
            location: { lat: 37.5005, lng: 127.0368, address: '서울 강남구 강남대로 456' },
            place_url: 'https://place.map.kakao.com/2222222222',
            distance: '200m',
            description: '분위기 좋은 양식 레스토랑',
            tags: ['양식', '스테이크'],
            isFavorite: false,
            isCandidate: false
          },
          {
            id: 'rec3',
            name: '정통 일식집',
            category: '일식',
            category_group_code: 'FD6',
            category_group_name: '음식점',
            phone: '02-3333-4444',
            address: '서울 강남구 강남대로 789',
            road_address: '서울 강남구 강남대로 789',
            location: { lat: 37.5008, lng: 127.0372, address: '서울 강남구 강남대로 789' },
            place_url: 'https://place.map.kakao.com/3333333333',
            distance: '300m',
            description: '신선한 재료의 일식집',
            tags: ['일식', '초밥'],
            isFavorite: false,
            isCandidate: false
          }
        ];
        
        // 로딩 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
                  key={restaurant.id}
                  restaurant={restaurant}
                  className={styles.restaurantCard}
                >
                  {/* <ActionButtons
                    restaurantId={restaurant.id}
                    showFavoriteButton={true}
                    showCandidateButton={true}
                    onFavoriteClick={handleFavoriteClick}
                    onCandidateClick={handleCandidateClick}
                    isFavorited={(favorites as Set<string>).has(restaurant.id)}
                    isCandidate={(candidates as Set<string>).has(restaurant.id)}
                  /> */}
                </RestaurantCard>
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
