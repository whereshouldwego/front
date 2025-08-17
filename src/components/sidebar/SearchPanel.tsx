/**
 * SearchPanel.tsx
 *
 * - IntersectionObserver 기반 무한 스크롤(바닥 근처 sentinel 관찰)
 * - 검색 제출 시에만 performSearch() 호출 → 드래그(mapCenter 변경)는 요청 X
 * - “우수수 로딩” 방지: Context의 isLoadingMore + inFlightRef로 가드
 * - CSS Module 스타일 유지
 * - 전역 상태 사용으로 패널 전환 시에도 검색 결과 유지
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCandidates } from '../../hooks/useCandidates';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import styles from './SidebarPanels.module.css';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import { useSidebar } from '../../stores/SidebarContext';
import type { MapCenter, Restaurant, RestaurantWithStatus } from '../../types';
import { useRestaurantStore } from '../../stores/RestaurantStore';

const DEFAULT_CENTER: MapCenter = { lat: 36.35369004484255, lng: 127.34132312554642 };

interface Props {
  userId?: number;
  roomCode?: string;
  center?: MapCenter;
}

const SearchPanel: React.FC<Props> = ({ userId, center, roomCode }) => {
  const {
    searchResults,
    isLoading,
    isLoadingMore,
    hasMore,
    performSearch,
    loadMore,
    mapCenter,
    setSelectedRestaurantId,
    selectedRestaurantId,
  } = useSidebar();

  const [inputValue, setInputValue] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const panelBodyRef = useRef<HTMLDivElement | null>(null); // ✅ [추가] 스크롤 컨테이너 ref

  // ✅ [추가] 선택 카드 공통 강조 스타일(인셋 파란 보더 + 항상 떠 있음)
  const selectedStyle: React.CSSProperties = {
    boxShadow:
      'inset 0 0 0 2px rgba(59,130,246,0.65), 0 12px 20px rgba(0,0,0,0.12), 0 5px 10px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'visible',
  };

  // ✅ [추가] 푸른 그라데이션 "광(Glow)" 오버레이
  const gradientGlowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: -6,
    borderRadius: 12,
    background:
      'radial-gradient(60% 80% at 50% 0%, rgba(59,130,246,0.28), rgba(59,130,246,0) 70%) , linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.22))',
    filter: 'blur(12px)',
    opacity: 1,
    zIndex: 0,
    pointerEvents: 'none',
  };

  // 방 코드
  const room = roomCode || localStorage.getItem('roomCode') || 'default';

  // tombstones
  const TOMB_EVENT = 'candidate:tombstones-changed';
  const keyFor = (r: string) => `__candidate_tombstones__::${r}`;
  const readTombs = (r: string): Set<number> => {
    try {
      const raw = localStorage.getItem(keyFor(r));
      const arr: any[] = raw ? JSON.parse(raw) : [];
      return new Set(arr.map((v) => Number(v)).filter((v) => Number.isFinite(v)));
    } catch {
      return new Set();
    }
  };
  const [candidateTombstones, setCandidateTombstones] = useState<Set<number>>(() => readTombs(room));
  useEffect(() => {
    setCandidateTombstones(readTombs(room));
  }, [room]);
  useEffect(() => {
    const onChange = (e: any) => {
      if (!e?.detail || e.detail.roomCode === room) setCandidateTombstones(readTombs(room));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key === keyFor(room)) setCandidateTombstones(readTombs(room));
    };
    window.addEventListener(TOMB_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(TOMB_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [room]);

  const { items, optimisticItems, setOptimisticItems } = useCandidates(room);
  const { isCandidate, isFavorited, isVoted, getVoteCount } = useRestaurantStore();

  // IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          void loadMore();
        }
      },
      {
        root: document.querySelector(`.${styles.panelBody}`) || undefined,
        rootMargin: '200px',
        threshold: 0.01,
      }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

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

  // 낙관 갱신 타입 정합성 유지
  const handleStateChange = useCallback(
    (changedPlaceId?: number) => {
      if (!changedPlaceId) return;
      const nowOn = isCandidate(changedPlaceId);
      setOptimisticItems((prev) => {
        const prevArr: RestaurantWithStatus[] = Array.isArray(prev) ? (prev as RestaurantWithStatus[]) : [];
        const itemsArr: RestaurantWithStatus[] = Array.isArray(items) ? (items as RestaurantWithStatus[]) : [];
        const base: RestaurantWithStatus[] = prevArr.length ? prevArr : itemsArr;
        const exists = base.some((r) => r.placeId === changedPlaceId);

        if (nowOn) {
          if (exists) return base;
          const picked: Restaurant | undefined = (searchResults ?? []).find((r) => r.placeId === changedPlaceId);
          if (!picked) return base;
          const withStatus: RestaurantWithStatus = {
            ...picked,
            isFavorite: isFavorited(changedPlaceId),
            isCandidate: true,
            isVoted: isVoted(changedPlaceId),
            voteCount: getVoteCount(changedPlaceId),
          };
          return [withStatus, ...base];
        } else {
          if (!exists) return base;
          return base.filter((r) => r.placeId !== changedPlaceId);
        }
      });
    },
    [isCandidate, isFavorited, isVoted, getVoteCount, setOptimisticItems, items, searchResults]
  );

  const baseIds =
    !optimisticItems || optimisticItems === items || optimisticItems.length === 0
      ? new Set((items ?? []).map((r) => r.placeId))
      : new Set(optimisticItems.map((r) => r.placeId));
  candidateTombstones.forEach((id) => baseIds.delete(id));

  const mergedResults = (searchResults ?? []).map((r) => ({
    ...r,
    isCandidate: baseIds.has(r.placeId),
  }));

  // ✅ [추가] 선택된 카드로 스크롤 포커스 이동
  useEffect(() => {
    if (!selectedRestaurantId || !panelBodyRef.current) return;
    const target = panelBodyRef.current.querySelector(
      `[data-place-id="${selectedRestaurantId}"]`
    ) as HTMLElement | null;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedRestaurantId]);

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

      {/* 바디 */}
      <div className={styles.panelBody} ref={panelBodyRef}>{/* ✅ [추가] ref 부착 */}
        {/* 검색 폼 */}
        <form onSubmit={onSubmit} className={styles.searchField}>
          <input
            className={styles.searchInput}
            placeholder={PANEL_CONFIGS.search.searchPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </form>

        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.SEARCHING}</p>
          </div>
        )}

        {!isLoading && mergedResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>검색 결과 ({mergedResults.length}개)</span>
            </div>

            <div className={styles.restaurantCards}>
              {mergedResults.map((r) => {
                const selected = String(selectedRestaurantId) === String(r.placeId);
                return (
                  <div
                    key={r.placeId}
                    className={styles.searchItem}
                    data-place-id={r.placeId} // ✅ [추가] 스크롤 타깃 식별자
                    style={selected ? selectedStyle : undefined}
                    onClick={() => setSelectedRestaurantId(String(r.placeId))}
                  >
                    {selected && <div style={gradientGlowStyle} aria-hidden />}{/* ✅ [유지] 그라데이션 */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
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
                  </div>
                );
              })}
            </div>

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

            <div ref={sentinelRef} style={{ height: 1 }} />
          </div>
        )}

        {!isLoading && mergedResults.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.search}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
