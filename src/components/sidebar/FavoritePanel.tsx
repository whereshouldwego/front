/**
 * FavoritePanel.tsx
 *
 * 찜하기 패널 컴포넌트
 */

import React from 'react';
import { PANEL_CONFIGS, LOADING_MESSAGES, EMPTY_MESSAGES } from '../../constants/sidebar';
import styles from './SidebarPanels.module.css';

import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';

import { useFavorites } from '../../hooks/useFavorites';
import { useSidebar } from '../../stores/SidebarContext';

interface Props {
  userId: number;
}

const FavoritePanel: React.FC<Props> = ({ userId }) => {
  const uid = userId ?? 1;
  const { items, loading, error } = useFavorites(uid);

  const { setSelectedRestaurantId, selectedRestaurantId } = useSidebar();
  const panelBodyRef = React.useRef<HTMLDivElement | null>(null); // ✅ [추가]

  // ✅ [유지] 선택 강조 스타일
  const selectedStyle: React.CSSProperties = {
    boxShadow:
      'inset 0 0 0 2px rgba(59,130,246,0.65), 0 12px 20px rgba(0,0,0,0.12), 0 5px 10px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'visible',
  };

  // ✅ [유지] 그라데이션 글로우
  const gradientGlowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: -6,
    borderRadius: 12,
    background:
      'radial-gradient(60% 80% at 50% 0%, rgba(59,130,246,0.28), rgba(59,130,246,0) 70%) , linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.22))',
    filter: 'blur(12px)',
    opacity: 1,
    zIndex: 0,
    pointerEvents: 'none',
  };

  // ✅ [추가] 선택된 카드로 스크롤 포커스 이동
  React.useEffect(() => {
    if (!selectedRestaurantId || !panelBodyRef.current) return;
    const target = panelBodyRef.current.querySelector(
      `[data-place-id="${selectedRestaurantId}"]`
    ) as HTMLElement | null;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedRestaurantId, items.length]);

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

      {/* 바디 */}
      <div className={styles.panelBody} ref={panelBodyRef}>{/* ✅ [추가] ref 부착 */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.LOADING}</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            {error.includes('로그인 후 이용해주세요') ? (
              <div className={styles.loginContainer}>
                <p className={styles.loginMessage}>로그인 후 이용해주세요</p>
                <button
                  className={styles.loginButton}
                  onClick={() => {
                    console.log('로그인 버튼 클릭');
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

        {!loading && !error && items.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>찜한 맛집 ({items.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {items.map((restaurant) => {
                const selected = String(selectedRestaurantId) === String(restaurant.placeId);
                return (
                  <div
                    key={restaurant.placeId}
                    className={styles.favoriteItem}
                    data-place-id={restaurant.placeId} // ✅ [추가]
                    style={selected ? selectedStyle : undefined}
                    onClick={() => setSelectedRestaurantId(String(restaurant.placeId))}
                  >
                    {selected && <div style={gradientGlowStyle} aria-hidden />}{/* 유지 */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
