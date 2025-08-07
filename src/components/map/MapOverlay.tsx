/**
 * MapOverlay.tsx
 *
 * 지도 오버레이 컴포넌트
 *
 * 기능:
 * - 출발지 검색
 * - 현재 위치 버튼
 * - 지도 컨트롤
 */

import React, { useState, useCallback } from 'react';
import { debounce } from '../../utils/search';
import type { MapOverlayConfig } from '../../types';
import styles from './MapOverlay.module.css';

interface MapOverlayProps {
  config: MapOverlayConfig;
  onDepartureSearch: (query: string) => void;
  onCurrentLocation: () => void;
  className?: string;
}

const MapOverlay: React.FC<MapOverlayProps> = ({
  config,
  onDepartureSearch,
  onCurrentLocation,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(config.departureLocation);

  // 디바운스된 검색 함수
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onDepartureSearch(query);
    }, 300),
    [onDepartureSearch]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleCurrentLocation = () => {
    onCurrentLocation();
  };

  return (
    <div className={`${styles.mapOverlay} ${className}`}>
      {/* 출발지 검색 */}
      {config.showDepartureSearch && (
        <div className={styles.searchContainer}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="출발지를 입력하세요"
            className={styles.searchInput}
          />
        </div>
      )}

      {/* 현재 위치 버튼 */}
      <button
        onClick={handleCurrentLocation}
        className={styles.currentLocationButton}
        title={config.currentLocationButtonText}
      >
        📍
      </button>
    </div>
  );
};

export default MapOverlay; 