/**
 * useSearch.ts
 * - 카카오 키워드/위치 검색
 * - 후보 제외 필터링 (roomCode 기반)
 * - place 상세(백엔드)로 보강
 */

import { useCallback, useState } from 'react';
import { integratedSearchAPI } from '../lib/api';
import type { MapCenter, Restaurant } from '../types';

export function useSearch(roomCode?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [results, setResults] = useState<Restaurant[]>([]);

  // 키워드 검색
  const searchByKeyword = useCallback(async (q: string, center?: MapCenter) => {
    setLoading(true); setError(null);
    const data = await integratedSearchAPI.searchAndEnrich(q, center, { roomCode });
    setResults(data);
    setLoading(false);
    return data;
  }, [roomCode]);

  // 위치 기반(초기/현위치)
  const searchByLocation = useCallback(async (center: MapCenter) => {
    setLoading(true); setError(null);
    const data = await integratedSearchAPI.searchByLocation(center, { roomCode });
    setResults(data);
    setLoading(false);
    return data;
  }, [roomCode]);

  return {
    results,
    loading,
    error,
    searchByKeyword,
    searchByLocation,
  };
}