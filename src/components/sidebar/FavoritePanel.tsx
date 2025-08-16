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
import { useSidebar } from '../../stores/SidebarContext'; // ✅ [추가] 지도 포커스 이동을 위해

interface Props {
  userId: number;
}

const FavoritePanel: React.FC<Props> = ({ userId }) => {
  console.log('[DEBUG] FavoritePanel 마운트됨, userId:', userId);
  
  const uid = userId ?? 1;
  const { items, loading, error } = useFavorites(uid);

  const { setSelectedRestaurantId } = useSidebar(); // ✅ [추가] 카드 클릭 시 선택 핀 지정

  console.log('[DEBUG] FavoritePanel - useFavorites 결과:', { items, loading, error });

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
            {error.includes('로그인 후 이용해주세요') ? (
              <div className={styles.loginContainer}>
                <p className={styles.loginMessage}>로그인 후 이용해주세요</p>
                <button 
                  className={styles.loginButton}
                  onClick={() => {
                    // 로그인 모달 열기 또는 로그인 페이지로 이동
                    // 예: openKakaoLoginModal() 또는 navigate('/login')
                    console.log('로그인 버튼 클릭'); // 임시로 콘솔 출력
                  }}
                >
                  로그인하기
                </button>
              </div>
            ) : (
              <p>{error}</p>
            )}
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
                // ✅ [추가] 카드 전체를 클릭하면 해당 placeId로 지도 포커스 이동
                <div
                  key={restaurant.placeId}
                  className={styles.favoriteItem}
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
