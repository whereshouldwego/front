/**
 * RestaurantCard.tsx
 *
 * 레스토랑 카드 컴포넌트
 *
 * 기능:
 * - 레스토랑 정보 표시
 * - 클릭 이벤트 처리
 * - 반응형 디자인
 */

import React from 'react';
import type { Restaurant, RestaurantCardClickHandler } from '../../types';
import ActionButtons from './ActionButtons';
import styles from './RestaurantCard.module.css';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: RestaurantCardClickHandler;
  className?: string;
  children?: React.ReactNode;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onClick,
  className = '',
  children
}) => {
  const handleClick = () => {
    onClick?.(restaurant);
  };

  return (
    <div 
      className={`${styles.restaurantCard} ${className}`}
      onClick={handleClick}
    >
      {/* 레스토랑 정보 */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{restaurant.name}</h3>
          {children}
        </div>

        <div className={styles.details}>
          <span className={styles.category}>{restaurant.category}</span>
          <span className={styles.address}>{restaurant.address}</span>
        </div>

        {restaurant.phone && (
          <div className={styles.phone}>
            📞 {restaurant.phone}
          </div>
        )}

        {restaurant.place_url && (
          <div className={styles.placeUrl}>
            <a href={restaurant.place_url} target="_blank" rel="noopener noreferrer">
              카카오맵에서 보기
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantCard; 