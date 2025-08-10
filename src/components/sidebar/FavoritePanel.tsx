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

import React from 'react';
import { PANEL_CONFIGS, LOADING_MESSAGES, EMPTY_MESSAGES } from '../../constants/sidebar';
import styles from './SidebarPanels.module.css';

import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';

import { useFavorites } from '../../hooks/useFavorites';

interface Props {
  userId: number;
}

const FavoritePanel: React.FC<Props> = ({ userId }) => {
  const uid = userId ?? 1; // TODO: 실제 로그인 연동 시 교체
  const { items, loading, error } = useFavorites(uid);

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
        {loading && (
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
        {!loading && !error && items.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>찜한 맛집 ({items.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {items.map((restaurant) => (
                <div key={restaurant.placeId} className={styles.favoriteItem}>
                  <RestaurantCard
                    data={restaurant}
                    className={styles.restaurantCard}
                    actions={
                      <ActionButtons
                        userId={userId}
                        placeId={restaurant.placeId}
                        showFavoriteButton
                      />
                    }
                  />
              </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && items.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.favorite}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritePanel; 