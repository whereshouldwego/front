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

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
  children?: React.ReactNode;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, className, children }) => (
  <div className={`${styles.restaurantCard} ${className || ''}`}>
    <div className={styles.header}>
      <h3 className={styles.name}>{restaurant.name}</h3>
      <span className={styles.category}>{restaurant.category}</span>
    </div>
    
    <div className={styles.details}>
      <div className={styles.infoRow}>
        <span className={styles.address}>{restaurant.location.address}</span>
      </div>
      
      {restaurant.phone && (
        <div className={styles.infoRow}>
          <span className={styles.phone}>{restaurant.phone}</span>
        </div>
      )}
      
      <div className={styles.infoRow}>
        <span className={styles.distance}>{restaurant.distance}</span>
      </div>
      
      {restaurant.description && (
        <p className={styles.description}>{restaurant.description}</p>
      )}
      
      {restaurant.tags && restaurant.tags.length > 0 && (
        <div className={styles.tags}>
          {restaurant.tags.map((tag, index) => (
            <span key={index} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}
    </div>
    
    {restaurant.summary && (
      <div className={styles.summary}>
        <h4 className={styles.summaryTitle}>AI 요약</h4>
        <ul className={styles.summaryList}>
          {restaurant.summary.menu && restaurant.summary.menu.length > 0 && (
            <li className={styles.summaryItem}>
              <strong>메뉴:</strong> {restaurant.summary.menu.join(', ')}
            </li>
          )}
          {restaurant.summary.mood && restaurant.summary.mood.length > 0 && (
            <li className={styles.summaryItem}>
              <strong>분위기:</strong> {restaurant.summary.mood.join(', ')}
            </li>
          )}
          {restaurant.summary.feature && restaurant.summary.feature.length > 0 && (
            <li className={styles.summaryItem}>
              <strong>특징:</strong> {restaurant.summary.feature.join(', ')}
            </li>
          )}
          {restaurant.summary.purpose && restaurant.summary.purpose.length > 0 && (
            <li className={styles.summaryItem}>
              <strong>목적:</strong> {restaurant.summary.purpose.join(', ')}
            </li>
          )}
        </ul>
      </div>
    )}
    
    {children && (
      <div className={styles.actions}>
        {children}
      </div>
    )}
  </div>
);

export default RestaurantCard; 