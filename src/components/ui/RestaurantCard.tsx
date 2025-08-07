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
import type { Restaurant } from '../../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => (
  <div className="restaurant-card">
    <h3>{restaurant.name}</h3>
    <p>{restaurant.category}</p>
    <p>{restaurant.location.address}</p>
    <p>{restaurant.phone}</p>
    <p>{restaurant.distance}</p>
    {/* summary가 있으면 표시 */}
    {restaurant.summary && (
      <div>
        <strong>AI 요약:</strong>
        <ul>
          <li>메뉴: {restaurant.summary.menu.join(', ')}</li>
          <li>분위기: {restaurant.summary.mood.join(', ')}</li>
          <li>특징: {restaurant.summary.feature.join(', ')}</li>
          <li>목적: {restaurant.summary.purpose.join(', ')}</li>
        </ul>
      </div>
    )}
  </div>
);

export default RestaurantCard; 