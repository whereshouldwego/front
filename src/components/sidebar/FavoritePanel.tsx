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
import { useRestaurantStore } from '../../stores/RestaurantStore';

const FavoritePanel: React.FC<{ userId: number }> = ({ userId }) => {
  const { getFavorites, isFavorited, toggleFavorite, hydrateFavorites } = useRestaurantStore();
  const favorites = getFavorites();

  // 컴포넌트 마운트 시 찜한 맛집 데이터 가져오기
  useEffect(() => {
    void hydrateFavorites(userId);
  }, [userId, hydrateFavorites]);

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