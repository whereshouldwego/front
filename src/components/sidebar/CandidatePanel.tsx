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

import React, { useEffect, useState } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import { useRestaurantStore } from '../../stores/RestaurantStore';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
import type { Restaurant } from '../../types';
import { placeAPI } from '../../lib/api';



interface Props {
  roomCode?: string;
  userId?: number;
}

const CandidatePanel: React.FC<Props> = ({ roomCode, userId }) => {
  const { hydrateCandidates, getCandidates } =
    useRestaurantStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Restaurant[]>([]);
  
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await hydrateCandidates(roomCode || '');
      } catch {
        setError('후보 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [roomCode, hydrateCandidates]);

  // 컴포넌트 마운트 시 후보 데이터 가져오기
  useEffect(() => {
    const ids = getCandidates(); // number[]
    let alive = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const list: Restaurant[] = [];
        for (const pid of ids) {
          const res = await placeAPI.getPlaceById(pid);
          if (res.success) {
            const d = res.data;
            list.push({
              placeId: pid,
              name: d.name || `place #${pid}`,
              category: d.categoryName,
              phone: d.phone,
              location: {
                lat: 0, // d.lat ?? 0 → 0으로 변경
                lng: 0, // d.lng ?? 0 → 0으로 변경
                address: d.address,
                roadAddress: d.roadAddress,
              },
              summary: d.aiSummary,
              description: d.aiSummary,
            });
          } else {
            list.push({
              placeId: pid,
              name: `place #${pid}`,
              location: { lat: 0, lng: 0 },
            } as Restaurant);
          }
        }
        if (alive) setItems(list);
      } catch {
        if (alive) setError('후보 상세 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getCandidates]);



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

        {/* 후보 결과 */}
        {!isLoading && !error && items.length > 0 && (
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
                      />
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && getCandidates().length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.candidate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePanel;
