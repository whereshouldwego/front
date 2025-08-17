/**
 * RestaurantCard.tsx
 *
 * 레스토랑 카드 컴포넌트
 *
 * 기능:
 * - 레스토랑 정보 표시
 * - 클릭 이벤트 처리
 * - 반응형 디자인
 * - 액션 버튼 지원
 */

import React from 'react';
import type { Restaurant, RestaurantWithStatus } from '../../types';
import styles from './RestaurantCard.module.css';

interface Props {
  data: Restaurant | RestaurantWithStatus;
  className?: string;
  actions?: React.ReactNode;
}

const RestaurantCard: React.FC<Props> = ({ data, className, actions }) => {
  // const hasStatus = 'isFavorite' in data;

  const getSecondCategory = (category: string | null | undefined): string => {
    if (!category) return '';
    const parts = category.split(' > ');
    return parts.length >= 2 ? parts[1] : category;
  };

  const featureTags = data.feature ? data.feature.slice(0, 3) : []; // 특징 태그 3개까지
  const menuPreview = data.menu ? data.menu.slice(0, 2) : []; // 메뉴 2개까지
  const moodTags = data.mood ? data.mood.slice(0, 2) : []; // 분위기 2개까지

  return (
    <div className={`${styles.restaurantCard} ${className || ''}`}>
      <div className={styles.header}>
        <h3 className={styles.name}>{data.name}</h3>
        <span className={styles.category}>{getSecondCategory(data.category || '')}</span>
      </div>
    
      <div className={styles.details}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>주소</span>
          <span className={styles.address}>
            {data.location.roadAddress || data.location.address || ''}
          </span>
        </div>
      
      {data.phone && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>연락처</span>
          <span className={styles.phone}>{data.phone}</span>
        </div>
      )}
        
        {menuPreview.length > 0 && (
          <div className={styles.menuPreview}>
            <span className={styles.menuLabel}>주요 메뉴</span>
            <span className={styles.menuList}>
              {menuPreview.join('  ')}
            </span>
          </div>
        )}
        
        {moodTags.length > 0 && (
          <div className={styles.tags}>
            <span className={styles.moodLabel}>분위기</span>
            <div className={styles.tagValues}>
              {moodTags.map((tag, idx) => (
                <span key={idx} className={styles.moodValue}>#{tag}</span>
              ))}
            </div>
          </div>
        )}
        
        {featureTags.length > 0 && (
          <div className={styles.tags}>
            <span className={styles.featureLabel}>특징</span>
            <div className={styles.tagValues}>
              {featureTags.map((tag, idx) => (
                <span key={idx} className={styles.featureValue}>#{tag}</span>
              ))}
            </div>
          </div>
        )}

        {data.place_url && (
          <div className={styles.placeUrl}>
            <a href={data.place_url} target="_blank" rel="noopener noreferrer">
              카카오맵으로 이동
            </a>
          </div>
        )}
        {'voteCount' in data && data.voteCount !== undefined && (
          <div className={styles.voteCountDisplay}>
            총 {data.voteCount}표
          </div>
        )}

      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

export default RestaurantCard; 