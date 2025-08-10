/**
 * SearchPanel.tsx
 *
 * 검색 패널 컴포넌트
 *
 * 기능:
 * - 검색 입력 필드
 * - 검색 결과 표시
 * - 로딩 및 에러 상태 처리
 * - 카카오 검색 + 후보 제외 + 백엔드 보강
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import type { MapCenter } from '../../types';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
import { useSearch } from '../../hooks/useSearch';

const DEFAULT_CENTER: MapCenter = {
  lat: 37.5002, // 역삼역 위도
  lng: 127.0364 // 역삼역 경도
};

interface Props {
  roomCode?: string;
  center?: MapCenter;
  onRequestShowPanel?: () => void;
  userId?: number; // 로그인/컨텍스트에서 받을 수 있으면 전달
}

const SearchPanel: React.FC<Props> = ({ roomCode, center, onRequestShowPanel, userId }) => {
  const [inputValue, setInputValue] = useState('');
  const { results, loading, error, searchByKeyword, searchByLocation } = useSearch(roomCode);

  // 초기 로딩: 위치 기반
  useEffect(() => {
    const c = center || DEFAULT_CENTER;
    searchByLocation(c);
    onRequestShowPanel?.();
  }, []);

  // 최초 로딩: 위치 기반
  useEffect(() => {
    const c = center || DEFAULT_CENTER;
    void searchByLocation(c);
    onRequestShowPanel?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    await searchByKeyword(q, center || DEFAULT_CENTER);
  }, [inputValue, center, searchByKeyword]);

  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.search.title}</h2>
          </div>
        </div>
      </div>

      {/* 패널 바디 */}
      <div className={styles.panelBody}>
        {/* 검색 폼 */}
        <form onSubmit={handleSubmit} className={styles.searchField}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={PANEL_CONFIGS.search.searchPlaceholder}
            className={styles.searchInput}
          />
        </form>

        {/* 로딩 상태 */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.SEARCHING}</p>
          </div>
        )}

        {/* 에러 상태 */}
        {!loading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {/* 검색 결과 */}
        {!loading && !error && results.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>검색 결과 ({results.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {results.map((restaurant) => (
                <div key={restaurant.placeId} className={styles.searchItem}>
                  <RestaurantCard
                    data={restaurant}
                    className={styles.restaurantCard}
                    actions={
                      userId ? (
                        <ActionButtons
                          userId={userId}
                          placeId={restaurant.placeId}
                          showFavoriteButton
                          showCandidateButton
                          showVoteButton={false} // 필요시 true로 변경
                        />
                      ) : null
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && results.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.search}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;