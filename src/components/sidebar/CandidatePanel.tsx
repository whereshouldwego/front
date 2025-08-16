/**
 * CandidatePanel.tsx
 *
 * 후보 패널 컴포넌트
 *
 * 기능:
 * - 투표 후보 맛집 표시
 * - 투표 기능
 * - 로딩 및 에러 상태 처리
 */

import React from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
import { useCandidates } from '../../hooks/useCandidates';

interface Props {
  roomCode?: string;
  userId?: number;
}


const CandidatePanel: React.FC<Props> = ({ roomCode, userId }) => {
  const { items, optimisticItems, setOptimisticItems, loading, error, refresh } = useCandidates(roomCode);

  // 후보 삭제 시 낙관적으로 리스트에서 제거 (useCandidates의 setOptimisticItems 사용)
  const handleStateChange = React.useCallback((removePlaceId?: number) => {
    if (removePlaceId) {
      setOptimisticItems((prev) => {
        const base = prev ?? items;
        const next = base.filter((r) => r.placeId !== removePlaceId);
        console.log('[handleStateChange] optimisticItems after remove:', next);
        return next;
      });
    } else {
      refresh();
    }
  }, [setOptimisticItems, items, refresh]);

  // 순위별 메달과 스타일 정의
  const getRankInfo = (index: number, voteCount: number) => {
    // 투표 수가 0이면 순위 없음
    if (voteCount === 0) {
      return { medal: '', className: '', rankText: '' };
    }

    switch (index) {
      case 0:
        return { 
          medal: '🥇', 
          className: styles.goldRank,
          rankText: '1위'
        };
      case 1:
        return { 
          medal: '🥈', 
          className: styles.silverRank,
          rankText: '2위'
        };
      case 2:
        return { 
          medal: '🥉', 
          className: styles.bronzeRank,
          rankText: '3위'
        };
      default:
        return { medal: '', className: '', rankText: `${index + 1}위` };
    }
  };

  // 항상 최신 items를 사용하도록, optimisticItems가 null이거나 items와 동일하면 items 사용
  const candidateList = (!optimisticItems || optimisticItems === items || optimisticItems.length === 0)
    ? items
    : optimisticItems;

  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.candidate.title}</h2>
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
        {!loading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {/* 후보 결과 */}
        {!loading && candidateList.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>투표 후보 {candidateList.length}개</span>
            </div>
            <div className={styles.restaurantCards}>
              {candidateList.map((restaurant, index) => {
                const rankInfo = getRankInfo(index, restaurant.voteCount || 0);
                return (
                  <div 
                    key={`candidate-${restaurant.placeId}-${index}`}
                    className={`${styles.candidateItem} ${rankInfo.className}`}
                  >
                    {/* 순위 표시 */}
                    {rankInfo.medal && (
                      <div className={styles.rankBadge}>
                        <span className={styles.rankMedal}>{rankInfo.medal}</span>
                        <span className={styles.rankText}>{rankInfo.rankText}</span>
                      </div>
                    )}
                    <RestaurantCard
                      data={restaurant}
                      className={styles.restaurantCard}
                      actions={
                        <ActionButtons
                          userId={userId || 1}
                          placeId={restaurant.placeId}
                          showCandidateButton
                          showVoteButton
                          onStateChange={handleStateChange}
                          isInCandidatePanel={true}
                        />
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && items.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.candidate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePanel;
