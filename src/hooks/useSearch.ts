/**
 * useSearch.ts
 *
 * 검색 관련 커스텀 훅
 *
 * 기능:
 * - 검색 상태 관리
 * - 디바운스된 검색
 * - 검색 히스토리 관리
 * - 초기 위치 기반 검색 (카페와 식당만)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce, isValidSearchQuery, SearchHistory } from '../utils/search';
import type { Restaurant, MapCenter, SearchFilter } from '../types';
import { integratedSearchAPI } from '../lib/api';

interface UseSearchReturn {
  searchQuery: string;
  searchResults: Restaurant[];
  isLoading: boolean;
  error: string | null;
  searchHistory: string[];
  performSearch: (query: string) => Promise<void>;
  searchByLocation: (center: MapCenter, filter?: SearchFilter) => Promise<void>;
  clearSearch: () => void;
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null);

  // 검색 히스토리 로드
  useEffect(() => {
    setSearchHistory(SearchHistory.get());
  }, []);

  // 디바운스된 검색 함수 생성
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (query: string) => {
      if (!isValidSearchQuery(query)) {
        setError('검색어를 2글자 이상 입력해주세요.');
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const restaurants = await integratedSearchAPI.searchAndEnrich(query);
        setSearchResults(restaurants);
        setSearchQuery(query);
        
        // 검색 히스토리에 추가
        SearchHistory.add(query);
        setSearchHistory(SearchHistory.get());
      } catch (error) {
        setError('검색 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      // cleanup
    };
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current(query);
    }
  }, []);

  // 위치 기반 검색 (초기 검색용) - 카페와 식당만
  const searchByLocation = useCallback(async (center: MapCenter, filter?: SearchFilter) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 실제 카카오맵 API 호출 (카페와 식당만)
      const restaurants = await integratedSearchAPI.searchByLocation(center, filter);
      setSearchResults(restaurants);
    } catch (err) {
      setError('주변 맛집을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  const addToHistory = useCallback((query: string) => {
    SearchHistory.add(query);
    setSearchHistory(SearchHistory.get());
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    SearchHistory.remove(query);
    setSearchHistory(SearchHistory.get());
  }, []);

  const clearHistory = useCallback(() => {
    SearchHistory.clear();
    setSearchHistory([]);
  }, []);

  return {
    searchQuery,
    searchResults,
    isLoading,
    error,
    searchHistory,
    performSearch,
    searchByLocation,
    clearSearch,
    addToHistory,
    removeFromHistory,
    clearHistory
  };
}; 