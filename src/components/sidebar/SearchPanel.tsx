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
import type { MapCenter, Restaurant, RestaurantWithStatus } from '../../types'; // ✅ [추가] 상태가 포함된 타입 임포트
/* 후보 토글 후 현재 상태 확인용 */
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
  } = useSidebar();

  const [inputValue, setInputValue] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 방 코드 결정: 부모 prop → localStorage → 'default'
  const room = roomCode || localStorage.getItem('roomCode') || 'default';

  // ✅ 방별 후보 삭제 톰브스톤 상태 (이벤트 구독 포함)
  const TOMB_EVENT = 'candidate:tombstones-changed';
  const keyFor = (r: string) => `__candidate_tombstones__::${r}`;
  const readTombs = (r: string): Set<number> => {
    try {
      const raw = localStorage.getItem(keyFor(r));
      const arr: any[] = raw ? JSON.parse(raw) : [];
      return new Set(arr.map((v) => Number(v)).filter((v) => Number.isFinite(v)));
    } catch { return new Set(); }
  };
  const [candidateTombstones, setCandidateTombstones] = useState<Set<number>>(() => readTombs(room));
  useEffect(() => { setCandidateTombstones(readTombs(room)); }, [room]);
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

  // 후보 상태 훅을 "현재 방"으로 구독하고, 낙관적 setter까지 가져온다
  const { items, optimisticItems, setOptimisticItems } = useCandidates(room);

  // 현재 placeId의 상태를 읽기 위해 사용
  const { isCandidate, isFavorited, isVoted, getVoteCount } = useRestaurantStore(); // ✅ [추가] 상태 계산용 함수들

  // IntersectionObserver 설치: 바닥 sentinel이 보이면 loadMore()
  useEffect(() => {
    if (!sentinelRef.current) return;

    // 기존 옵저버 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // sentinel이 보이고, 아직 더 불러올 게 있고, 추가 로딩 중이 아닐 때만
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          void loadMore();
        }
      },
      {
        root: document.querySelector(`.${styles.panelBody}`) || undefined, // 패널 스크롤 영역 기준
        rootMargin: '200px', // 미리 로딩(약간 위에서 트리거)
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

  /* ✅ [핵심 FIX: 타입 일치]
     setOptimisticItems의 업데이터는 반드시 RestaurantWithStatus[] | null 을 반환해야 함.
     - prev/items를 RestaurantWithStatus[]로 정규화
     - 후보 추가 시, searchResults에서 pick한 Restaurant를 RestaurantWithStatus로 변환해 넣음
       (isFavorite/isCandidate/isVoted/voteCount 채워 넣기) */
  const handleStateChange = useCallback((changedPlaceId?: number) => {
    if (!changedPlaceId) return;

    const nowOn = isCandidate(changedPlaceId); // 토글 이후 최신 상태
    setOptimisticItems((prev) => {
      const prevArr: RestaurantWithStatus[] = Array.isArray(prev) ? (prev as RestaurantWithStatus[]) : [];
      const itemsArr: RestaurantWithStatus[] = Array.isArray(items) ? (items as RestaurantWithStatus[]) : [];
      const base: RestaurantWithStatus[] = prevArr.length ? prevArr : itemsArr;

      const exists = base.some((r) => r.placeId === changedPlaceId);

      if (nowOn) {
        // 후보 추가된 상태 → 이미 있으면 그대로, 없으면 상태필드 포함하여 prepend
        if (exists) return base;

        const picked: Restaurant | undefined =
          (searchResults ?? []).find((r) => r.placeId === changedPlaceId);

        if (!picked) return base;

        const withStatus: RestaurantWithStatus = {
          ...picked,
          isFavorite: isFavorited(changedPlaceId), // ✅ [추가] 상태 필드 채움
          isCandidate: true,
          isVoted: isVoted(changedPlaceId),
          voteCount: getVoteCount(changedPlaceId),
        };

        return [withStatus, ...base]; // ✅ 반환 타입: RestaurantWithStatus[]
      } else {
        // 후보 해제된 상태 → 낙관 목록에서 제거
        if (!exists) return base;
        return base.filter((r) => r.placeId !== changedPlaceId);
      }
    });
  }, [isCandidate, isFavorited, isVoted, getVoteCount, setOptimisticItems, items, searchResults]); // ✅ 의존성 보강

  // 후보 등록/취소 등 상태 변화가 있을 때 최신 optimisticItems를 반영하여 렌더링
  // room 단위로 받은 items/optimisticItems 사용
  const baseIds = (!optimisticItems || optimisticItems === items || optimisticItems.length === 0)
    ? new Set((items ?? []).map(r => r.placeId))
    : new Set(optimisticItems.map(r => r.placeId));

  // tombstone에 있는 placeId는 후보로 간주하지 않음(삭제 즉시 반영)
  candidateTombstones.forEach(id => baseIds.delete(id));

  const mergedResults = (searchResults ?? []).map(r => ({
    ...r,
    isCandidate: baseIds.has(r.placeId),
  }));

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
        {!isLoading && mergedResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>검색 결과 ({mergedResults.length}개)</span>
            </div>

            <div className={styles.restaurantCards}>
              {mergedResults.map((r) => (
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
                          onStateChange={handleStateChange}  // ✅ 낙관적 반영(타입 정합성 유지)
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

            {/* 무한스크롤 sentinel (화면 하단 관찰 대상) */}
            <div ref={sentinelRef} style={{ height: 1 }} />
          </div>
        )}

        {/* 빈 상태 */}
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
