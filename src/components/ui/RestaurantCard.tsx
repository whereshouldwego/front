// src/components/ui/RestaurantCard.tsx

import React from 'react';
import type { Restaurant } from '../../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: (restaurantId: string) => void;
  className?: string;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  onClick,
  className = ''
}) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400 text-xs">★</span>); // 크기 줄임
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400 text-xs">☆</span>); // 크기 줄임
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300 text-xs">☆</span>); // 크기 줄임
    }

    return stars;
  };

  const handleClick = () => {
    onClick?.(restaurant.id);
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer ${className}`}
      onClick={handleClick}
      style={{ minHeight: '120px' }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{restaurant.name}</h3>
          <p className="text-xs text-gray-500 mb-2 font-medium">{restaurant.category}</p>
        </div>
        <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
          {renderStars(restaurant.rating)}
          <span className="text-xs text-gray-700 font-semibold ml-1">({restaurant.rating})</span>
        </div>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-medium">가격</span>
          <span className="text-gray-900 font-bold">{restaurant.price}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-medium">거리</span>
          <span className="text-gray-900 font-bold">{restaurant.distance}</span>
        </div>
      </div>
      
      {restaurant.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">{restaurant.description}</p>
      )}
      
      {restaurant.tags && restaurant.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {restaurant.tags.slice(0, 3).map((tag: string, index: number) => (
            <span 
              key={index} 
              className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full font-medium shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantCard; 