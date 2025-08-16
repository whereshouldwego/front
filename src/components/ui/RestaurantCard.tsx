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
        <span className={styles.category}>{getSecondCategory(data.category)}</span>
      </div>
    
      <div className={styles.details}>
        <div className={styles.infoRow}>
          <span className={styles.address}>
            {data.location.roadAddress || data.location.address || ''}
          </span>
        </div>
      
      {data.phone && (
        <div className={styles.infoRow}>
          <span className={styles.phone}>{data.phone}</span>
        </div>
      )}
      
      {data.distanceText && (
          <div className={styles.infoRow}>
            <span className={styles.distance}>{data.distanceText}</span>
          </div>
        )}
        
        {menuPreview.length > 0 && (
          <div className={styles.menuPreview}>
            <div className={styles.menuTitle}>주요 메뉴</div>
            <div className={styles.menuList}>
              {menuPreview.join(', ')}
            </div>
          </div>
        )}
        
        {moodTags.length > 0 && (
          <div className={styles.tags}>
            <span className={styles.tagLabel}>분위기:</span>
            {moodTags.map((tag, idx) => (
              <span key={idx} className={`${styles.tag} ${styles.moodTag}`}>{tag}</span>
            ))}
          </div>
        )}
        
        {featureTags.length > 0 && (
          <div className={styles.tags}>
            <span className={styles.tagLabel}>특징:</span>
            {featureTags.map((tag, idx) => (
              <span key={idx} className={`${styles.tag} ${styles.featureTag}`}>{tag}</span>
            ))}
          </div>
        )}
        {data.place_url && (
          <div className={styles.placeUrl}>
            <a href={data.place_url} target="_blank" rel="noopener noreferrer">
              카카오맵으로 이동
            </a>
          </div>
        )}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

export default RestaurantCard; 