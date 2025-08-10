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
import type { Restaurant } from '../../types';
import styles from './RestaurantCard.module.css';

interface Props {
  data: Restaurant;
  className?: string;
  actions?: React.ReactNode;
}

const RestaurantCard: React.FC<Props> = ({ data, className, actions }) => {
  return (
    <div className={`${styles.restaurantCard} ${className || ''}`}>
      <div className={styles.header}>
        <h3 className={styles.name}>{data.name}</h3>
      <span className={styles.category}>{data.category}</span>
    </div>
    
    <div className={styles.details}>
      <div className={styles.infoRow}>
        <span className={styles.address}>{data.location.roadAddress || data.location.address || ''}</span>
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

        {data.description && <p className={styles.description}>{data.description}</p>}
      </div>
    
      {data.summary && (
        <div className={styles.summary}>
          <h4 className={styles.summaryTitle}>AI 요약</h4>
          <p className={styles.summaryText}>{data.summary}</p>
        </div>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
    )}

export default RestaurantCard; 