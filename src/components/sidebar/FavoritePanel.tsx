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
import RestaurantCard from '../ui/RestaurantCard';
import styles from './SidebarPanels.module.css';

const [favorites, setFavorites] = useState<Set<string>>(new Set());

const handleFavoriteClick = (restaurantId: string) => {
  setFavorites(prev => {
    const newSet = new Set(prev);
    newSet.delete(restaurantId);
    return newSet;
  });
};

const FavoritePanel: React.FC = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 찜한 맛집 데이터 가져오기
  useEffect(() => {
    const getFavorites = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 실제 API 호출 대신 임시 데이터 사용
        const mockFavorites = [
          {
            id: 'fav1',
            name: '찜한 맛집 1',
            category: '한식',
            category_group_code: 'FD6',
            category_group_name: '음식점',
            phone: '02-6666-7777',
            address: '서울 강남구 강남대로 123',
            road_address: '서울 강남구 강남대로 123',
            location: { lat: 37.5002, lng: 127.0364 },
            place_url: 'https://place.map.kakao.com/6666666666',
            distance: '100m'
          },
          {
            id: 'fav2',
            name: '찜한 맛집 2',
            category: '카페',
            category_group_code: 'CE7',
            category_group_name: '카페',
            phone: '02-7777-8888',
            address: '서울 강남구 강남대로 456',
            road_address: '서울 강남구 강남대로 456',
            location: { lat: 37.5005, lng: 127.0368 },
            place_url: 'https://place.map.kakao.com/7777777777',
            distance: '200m'
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

  const handleUnfavorite = async (restaurantId: string) => {
    try {
      // 실제로는 API 호출을 통해 찜 해제 처리
      console.log('찜 해제:', restaurantId);
      
      // 임시로 목록에서 제거
      setFavorites(prev => prev.filter(favorite => favorite.id !== restaurantId));
    } catch (err) {
      console.error('찜 해제 중 오류:', err);
    }
  };

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
                    key={restaurant.id}
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