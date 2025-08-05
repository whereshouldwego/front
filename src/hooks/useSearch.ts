/**
 * useSearch.ts
 *
 * 검색 관련 커스텀 훅
 *
 * 기능:
 * - 검색 상태 관리
 * - 디바운스된 검색
 * - 검색 히스토리 관리
 * - 검색 결과 필터링 및 정렬
 *
 * 사용법:
 * ```tsx
 * const {
 *   searchQuery,
 *   searchResults,
 *   isLoading,
 *   error,
 *   performSearch,
 *   clearSearch
 * } = useSearch();
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSidebar } from '../stores/SidebarContext';
import { debounce, isValidSearchQuery, SearchHistory } from '../utils/search';
import type { Restaurant } from '../types';

interface UseSearchReturn {
  searchQuery: string;
  searchResults: Restaurant[];
  isLoading: boolean;
  error: string | null;
  searchHistory: string[];
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const {
    searchResults,
    searchLoading,
    searchError,
    performSearch: contextPerformSearch
  } = useSidebar();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null);

  // 검색 히스토리 로드
  useEffect(() => {
    setSearchHistory(SearchHistory.get());
  }, []);

  // 디바운스된 검색 함수 생성
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (query: string) => {
      if (!isValidSearchQuery(query)) {
        setLocalError('검색어를 2글자 이상 입력해주세요.');
        return;
      }

      setLocalError(null);
      try {
        await contextPerformSearch({
          query,
          location: 'current', // 실제로는 현재 위치를 가져와야 함
          category: '',
          limit: 15
        });
        
        // 검색 히스토리에 추가
        SearchHistory.add(query);
        setSearchHistory(SearchHistory.get());
      } catch (error) {
        setLocalError('검색 중 오류가 발생했습니다.');
      }
    }, 300);

    return () => {
      // cleanup
    };
  }, [contextPerformSearch]);

  const performSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current(query);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setLocalError(null);
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
    isLoading: searchLoading,
    error: localError || searchError,
    searchHistory,
    performSearch,
    clearSearch,
    addToHistory,
    removeFromHistory,
    clearHistory
  };
}; 