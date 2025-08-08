/**
 * FavoritePanel.tsx
 *
 * 찜하기 패널 컴포넌트
 *
 * 기능:
 * - 찜한 맛집 목록 표시
 * - 찜하기 해제 기능
 * - 로딩 및 에러 상태 처리
 */

import React, { useState, useEffect } from 'react';
import { PANEL_CONFIGS, LOADING_MESSAGES, EMPTY_MESSAGES } from '../../constants/sidebar';
import type { Restaurant } from '../../types';
import RestaurantCard from '../ui/RestaurantCard';
import styles from './SidebarPanels.module.css';
import ActionButtons from '../ui/ActionButtons';

const FavoritePanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);

  const handleFavoriteClick = (restaurantId: string) => {
    setFavorites(prev => prev.filter(favorite => favorite.id !== restaurantId));
  };

  // 컴포넌트 마운트 시 찜한 맛집 데이터 가져오기
  useEffect(() => {
    const getFavorites = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 실제 API 호출 대신 임시 데이터 사용
        const mockFavorites: Restaurant[] = [
          {
            id: 'fav1',
            name: '찜한 맛집 1',
            category: '한식',
            distance: '100m',
            description: '맛있는 한식집',
            tags: ['한식', '가정식'],
            location: {
              lat: 37.5002,
              lng: 127.0364,
              address: '서울 강남구 강남대로 123'
            },
            phone: '02-6666-7777',
            isFavorite: true,
            isCandidate: false
          },
          {
            id: 'fav2',
            name: '찜한 맛집 2',
            category: '카페',
            distance: '200m',
            description: '분위기 좋은 카페',
            tags: ['카페', '커피'],
            location: {
              lat: 37.5005,
              lng: 127.0368,
              address: '서울 강남구 강남대로 456'
            },
            phone: '02-7777-8888',
            isFavorite: true,
            isCandidate: false
          }
        ];
        
        // 로딩 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setFavorites(mockFavorites);
      } catch (err) {
        setError('찜한 맛집 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    getFavorites();
  }, []);

  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.favorite.title}</h2>
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

        {/* 찜한 맛집 결과 */}
        {!isLoading && !error && favorites.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>찜한 맛집 ({favorites.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {favorites.map((restaurant) => (
                <div key={restaurant.id} className={styles.favoriteItem}>
                  <RestaurantCard
                    restaurant={restaurant}
                    className={styles.restaurantCard}
                  >
                    <ActionButtons
                      restaurantId={restaurant.id}
                      showFavoriteButton={true}
                      onFavoriteClick={handleFavoriteClick}
                      isFavorited={true}
                    />
                  </RestaurantCard>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && favorites.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.favorite}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritePanel; 