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
import { EMPTY_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
import { useSidebar } from '../../stores/SidebarContext';
import type { MapCenter } from '../../types';

const DEFAULT_CENTER: MapCenter = {
  lat: 37.5002,
  lng: 127.0364,
};

interface RecommendPanelProps {
  userId: number;
  center?: MapCenter;
}

const RecommendPanel: React.FC<RecommendPanelProps> = ({ userId, center }) => {
  const { searchResults, performSearch, setSelectedRestaurantId, selectedRestaurantId } = useSidebar();
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

  // 추천 로딩
  useEffect(() => {
    if (center) {
      const searchCenter = center || DEFAULT_CENTER;
      performSearch({
        query: '',
        location: `${searchCenter.lat},${searchCenter.lng}`,
        limit: 10,
      });
    }
  }, [center, performSearch]);

  const handleStateChange = useCallback(async () => {
    try {
      if (center) {
        const searchCenter = center || DEFAULT_CENTER;
        await performSearch({
          query: '',
          location: `${searchCenter.lat},${searchCenter.lng}`,
          limit: 10,
        });
      }
    } catch (error) {
      console.error('추천 데이터 새로고침 중 오류 발생:', error);
    }
  }, [center, performSearch]);

  // ✅ [추가] 선택된 카드로 스크롤 포커스 이동
  useEffect(() => {
    if (!selectedRestaurantId || !panelBodyRef.current) return;
    const target = panelBodyRef.current.querySelector(
      `[data-place-id="${selectedRestaurantId}"]`
    ) as HTMLElement | null;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedRestaurantId, searchResults?.length]);

  // 렌더
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
          {searchResults.map((restaurant) => {
            const selected = String(selectedRestaurantId) === String(restaurant.placeId);
            return (
              <div
                key={restaurant.placeId}
                className={styles.restaurantCard}
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
                        showCandidateButton
                        onStateChange={handleStateChange}
                      />
                    }
                  />
                </div>
              </div>
            );
          })}
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
      <div className={styles.panelBody} ref={panelBodyRef}>{/* ✅ [추가] ref 부착 */}
        {renderRecommendations()}
      </div>
    </div>
  );
};

export default RecommendPanel;
