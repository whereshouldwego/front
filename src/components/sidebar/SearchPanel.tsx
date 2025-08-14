/**
 * SearchPanel.tsx
 *
 * - IntersectionObserver 기반 무한 스크롤(바닥 근처 sentinel 관찰)
 * - 검색 제출 시에만 performSearch() 호출 → 드래그(mapCenter 변경)는 요청 X
 * - “우수수 로딩” 방지: Context의 isLoadingMore + inFlightRef로 가드
 * - CSS Module 스타일 유지
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import styles from './SidebarPanels.module.css';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import { useSidebar } from '../../stores/SidebarContext';
import type { MapCenter } from '../../types';

const DEFAULT_CENTER: MapCenter = { lat: 36.35369004484255, lng: 127.34132312554642 };

interface Props {
  userId?: number;
  roomCode?: string; // 현재는 내부에서 사용하지 않지만, 시그니처 유지(호환성)
  center?: MapCenter; // 상위에서 내려줄 경우 초기 검색에 사용 가능
}

const SearchPanel: React.FC<Props> = ({ userId, center }) => {
  const {
    searchResults,
    isLoading,
    isLoadingMore,
    hasMore,
    performSearch,
    loadMore,
    mapCenter,
    // 선택 상태 setter 사용
    setSelectedRestaurantId,
  } = useSidebar();

  const [inputValue, setInputValue] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
    // const panelBodyRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 초기 로딩: 위치 기반(현재 mapCenter 있으면 사용, 없으면 DEFAULT_CENTER 또는 props.center)
  useEffect(() => {
    void performSearch({
      query: '',
      center: mapCenter ?? center ?? DEFAULT_CENTER,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver 설치: 바닥 sentinel이 보이면 loadMore()
  useEffect(() => {
    if (!sentinelRef.current) return;

    // 기존 옵저버 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    // const rootEl = panelBodyRef.current || undefined;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // ✅ sentinel이 보이고, 아직 더 불러올 게 있고, 추가 로딩 중이 아닐 때만
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          void loadMore();
        }
      },
      {
        root: document.querySelector(`.${styles.panelBody}`) || undefined, // 패널 스크롤 영역 기준
        rootMargin: '200px', // 🔸 미리 로딩(약간 위에서 트리거)
        threshold: 0.01,
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  // 검색 제출 시 → 현재 mapCenter 기준으로 요청
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void performSearch({
        query: inputValue.trim(),
        center: mapCenter ?? center ?? DEFAULT_CENTER,
      });
    },
    [inputValue, performSearch, mapCenter, center]
  );

  // 토글 후 리스트를 새로고침하고 싶을 때 사용할 수 있는 콜백(선택)
  const handleStateChange = useCallback(() => {
    void performSearch({
      query: inputValue.trim(),
      center: mapCenter ?? center ?? DEFAULT_CENTER,
    });
  }, [performSearch, inputValue, mapCenter, center]);

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

      {/* 바디 (스크롤 컨테이너) */}
      <div className={styles.panelBody}>
        {/* 검색 폼 */}
        <form onSubmit={onSubmit} className={styles.searchField}>
          <input
            className={styles.searchInput}
            placeholder={PANEL_CONFIGS.search.searchPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </form>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.SEARCHING}</p>
          </div>
        )}

        {/* 결과 */}
        {!isLoading && searchResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>검색 결과 ({searchResults.length}개)</span>
            </div>

            <div className={styles.restaurantCards}>
              {searchResults.map((r) => (
                // 카드 클릭 시 선택된 placeId를 전역 상태로 저장
                <div
                  key={r.placeId}
                  className={styles.searchItem}
                  onClick={() => setSelectedRestaurantId(String(r.placeId))}
                >
                  <RestaurantCard
                    data={r}
                    className={styles.restaurantCard}
                    actions={
                      userId ? (
                        <ActionButtons
                          userId={userId}
                          placeId={r.placeId}
                          showFavoriteButton
                          showCandidateButton
                          onStateChange={handleStateChange}
                        />
                      ) : null
                    }
                  />
                </div>
              ))}
            </div>

            {/* 추가 로딩 표시 */}
            {isLoadingMore && (
              <div className={styles.loadingIndicator}>
                <div className={styles.spinner}></div>
                <span className="text-center text-gray-400 text-sm py-2">추가 결과를 불러오는 중...</span>
              </div>
            )}

            {!hasMore && (
              <div className={styles.loadingIndicator}>
                <span className="text-center text-gray-400 text-sm py-2">모든 결과를 불러왔습니다</span>
              </div>
            )}

            {/* ✅ 무한스크롤 sentinel (화면 하단 관찰 대상) */}
            <div ref={sentinelRef} style={{ height: 1 }} />
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && searchResults.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.search}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
