// src/hooks/useSearch.ts
import { useCallback, useState, useRef } from 'react';
import type { RestaurantWithStatus, MapCenter, Restaurant } from '../types';
import { integratedSearchAPI } from '../lib/api';
import { useRestaurantStore } from '../stores/RestaurantStore';

export function useSearch(roomCode?: string) {
  const [results, setResults] = useState<RestaurantWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { isFavorited, isCandidate, isVoted, getVoteCount } = useRestaurantStore();

  // 검색 결과에 상태 정보 추가
  const enrichResults = useCallback((restaurants: Restaurant[]): RestaurantWithStatus[] => {
    return restaurants.map(restaurant => ({
      ...restaurant,
      isFavorite: isFavorited(restaurant.placeId),
      isCandidate: isCandidate(restaurant.placeId),
      isVoted: isVoted(restaurant.placeId),
      voteCount: getVoteCount(restaurant.placeId)
    }));
  }, [isFavorited, isCandidate, isVoted, getVoteCount]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchByKeyword = useCallback(async (q: string, center?: MapCenter) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(async () => {

    setLoading(true);
    setError(null);
    try {
      const list = await integratedSearchAPI.searchAndEnrich(q, center, { roomCode, page: 1, size: 10 });
      setResults(enrichResults(list));
    } catch (e: any) {
      console.error('[useSearch] location error', e);
      setError('위치 기반 검색 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, 300);
}, [roomCode, enrichResults]);

  const searchByLocation = useCallback(async (center: MapCenter) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    // 300ms 디바운싱
    searchTimeoutRef.current = setTimeout(async () => {

    setLoading(true);
    setError(null);
    try {
      const list = await integratedSearchAPI.searchByLocation(center, { roomCode, radiusKm: 3, page: 1, size: 10 });
      setResults(enrichResults(list));
    } catch (e: any) {
      console.error('[useSearch] location error', e);
      setError('위치 기반 검색 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, 300);
}, [roomCode, enrichResults]);

  const loadMore = useCallback(async (query?: string, center?: MapCenter) => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      let additionalResults: Restaurant[] = [];

      if (query?.trim()) {
        additionalResults = await integratedSearchAPI.searchAndEnrich(
          query,
          center,
          { roomCode, page: nextPage, size: 10 }
        );
      } else if (center) {
        additionalResults = await integratedSearchAPI.searchByLocation(
          center,
          { roomCode, radiusKm: 3, page: nextPage, size: 10 }
        );
      }

      if (additionalResults.length > 0) {
        // 타입 오류 수정: 보강 후 합치기
        const enriched = enrichResults(additionalResults);
        setResults(prev => [...prev, ...enriched]);
        setCurrentPage(nextPage);
        setHasMore(additionalResults.length >= 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('추가 데이터 로드 실패:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore, roomCode, enrichResults]);


  return { results, loading, error, hasMore, isLoadingMore, searchByKeyword, searchByLocation, loadMore };
}
export type UseSearchReturn = ReturnType<typeof useSearch>;
