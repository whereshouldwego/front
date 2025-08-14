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
  const { items, loading, error, refresh } = useCandidates(roomCode);

  const handleStateChange = () => {
    // 상태 변경 후 후보 목록 새로고침
    refresh();
  };

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
        {!loading && items.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>투표 후보 ({items.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {items.map((restaurant) => (
                <div key={restaurant.placeId} className={styles.candidateItem}>
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
              ))}
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
