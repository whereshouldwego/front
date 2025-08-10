// src/hooks/useSearch.ts
import { useCallback, useState } from 'react';
import type { RestaurantWithStatus, MapCenter, Restaurant } from '../types';
import { integratedSearchAPI } from '../lib/api';
import { useRestaurantStore } from '../stores/RestaurantStore';

export function useSearch(roomCode?: string) {
  const [results, setResults] = useState<RestaurantWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const searchByKeyword = useCallback(async (q: string, center?: MapCenter) => {
    setLoading(true);
    setError(null);
    try {
      const list = await integratedSearchAPI.searchAndEnrich(q, center, { roomCode });
      setResults(enrichResults(list));
    } catch (e: any) {
      console.error('[useSearch] keyword error', e);
      setError('검색 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [roomCode, enrichResults]);

  const searchByLocation = useCallback(async (center: MapCenter) => {
    setLoading(true);
    setError(null);
    try {
      const list = await integratedSearchAPI.searchByLocation(center, { roomCode, radiusKm: 3 });
      setResults(enrichResults(list));
    } catch (e: any) {
      console.error('[useSearch] location error', e);
      setError('위치 기반 검색 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [roomCode, enrichResults]);

  return { results, loading, error, searchByKeyword, searchByLocation };
}
export type UseSearchReturn = ReturnType<typeof useSearch>;
