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

import React, { useEffect, useState } from 'react';
import { EMPTY_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar'; // LOADING_MESSAGES 추후 사용
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import type { PlaceDetail, RestaurantWithStatus } from '../../types';
import styles from './SidebarPanels.module.css';

const toRestaurantWithStatus = (p: PlaceDetail): RestaurantWithStatus => ({
  placeId: p.placeId,
  name: p.placeName,
  category: p.categoryDetail || '',
  location: {
    address: p.address || '',
    roadAddress: p.roadAddress || '',
    lat: p.y != null ? Number(p.y) : 0,  // 문자열 → 숫자 변환
    lng: p.x != null ? Number(p.x) : 0,
  },
  phone: p.phone || '',
  menu: p.menu || [],
  mood: p.mood || [],
  feature: p.feature || [],
  place_url: p.kakaoUrl,

  // ✅ RestaurantCard가 요구하는 상태 필드 기본값
  isFavorite: false,
  isCandidate: false,
  isVoted: false,
  voteCount: 0,
});

interface Props { userId: number; roomCode?: string }

const RecommendPanel: React.FC<Props> = ({ userId, roomCode }) => {
  // 🆕 이전 응답 유지 → 새 payload가 올 때만 갱신
  const [reply, setReply] = useState<string>('');
  const [items, setItems] = useState<RestaurantWithStatus[]>([]);
  
  useEffect(() => {
    const onPayload = (e: Event) => {
      const detail = (e as CustomEvent<{ reply: string; items: PlaceDetail[] }>).detail;
      if (!detail) return;
      setReply(detail.reply || '');
      setItems(detail.items.map(toRestaurantWithStatus));
    };
    window.addEventListener('recommend:payload', onPayload);
    return () => window.removeEventListener('recommend:payload', onPayload);
  }, []);

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

      <div className={styles.panelBody}>
        {reply && (
          <div className={styles.resultsHeader}>
            <span>{reply}</span>
          </div>
        )}

        {items.length > 0 ? (
          <div className={styles.restaurantCards}>
            {items.map((r) => (
              <div key={r.placeId} className={styles.searchItem}>
                <RestaurantCard
                  data={r}                         // ✅ RestaurantWithStatus 전달
                  className={styles.restaurantCard}
                  actions={
                    userId && roomCode ? (
                      <ActionButtons
                        userId={userId}
                        placeId={r.placeId}
                        showFavoriteButton
                        showCandidateButton
                        onStateChange={() => {}}
                        roomCode={roomCode}
                      />
                    ) : null
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.recommend}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendPanel;
