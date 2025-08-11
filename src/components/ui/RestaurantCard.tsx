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
import { parseAiSummary, pickFeatureTags } from '../../utils/aiSummary';

interface Props {
  data: Restaurant | RestaurantWithStatus;
  className?: string;
  actions?: React.ReactNode;
}

const RestaurantCard: React.FC<Props> = ({ data, className, actions }) => {
  // const hasStatus = 'isFavorite' in data;

  const getSecondCategory = (category: string): string => {
    const parts = category.split(' > ');
    return parts.length >= 2 ? parts[1] : category;
  };

  const ai = parseAiSummary(data.summary);
  const featureTags = pickFeatureTags(ai?.feature);
  const menuPreview = (ai?.menu ?? []).slice(0, 2); // 메뉴 2개

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
        
      {/* ✅ 해시태그(특정 feature만) + 메뉴 2개 */}
      {(featureTags.length > 0 || menuPreview.length > 0) && (
        <div className={styles.hashAndMenu}>
          {/* feature 해시태그 */}
          {/* 메뉴 2개 */}
          {menuPreview.length > 0 && (
            <div className={styles.menuPreview}>
            <div style={{ fontSize: '11px', color: '#666' }}>
              <span className={styles.menuTitle}>주요 메뉴</span>
            </div>
              {menuPreview.join(', ')}
            </div>
          )}
      {featureTags.length > 0 && (
        <div className={styles.tags}>
          {featureTags.map((tag, idx) => (
            <span key={idx} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}
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