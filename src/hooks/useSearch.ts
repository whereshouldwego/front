// src/hooks/useSearch.ts
import { useCallback, useState } from 'react';
import type { Restaurant, MapCenter } from '../types';
import { integratedSearchAPI } from '../lib/api';

export function useSearch(roomCode?: string) {
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchByKeyword = useCallback(async (q: string, center?: MapCenter) => {
    setLoading(true);
    setError(null);
    try {
      const list = await integratedSearchAPI.searchAndEnrich(q, center, { roomCode });
      setResults(list);
    } catch (e: any) {
      console.error('[useSearch] keyword error', e);
      setError('검색 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  const searchByLocation = useCallback(async (center: MapCenter) => {
    setLoading(true);
    setError(null);
    try {
      const list = await integratedSearchAPI.searchByLocation(center, { roomCode, radiusKm: 3 });
      setResults(list);
    } catch (e: any) {
      console.error('[useSearch] location error', e);
      setError('위치 기반 검색 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  return { results, loading, error, searchByKeyword, searchByLocation };
}
export type UseSearchReturn = ReturnType<typeof useSearch>;
