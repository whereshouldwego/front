/**
 * SidebarContext.tsx
 *
 * 사이드바 + 검색/페이지네이션 + mapCenter 전역 상태
 * - 드래그로 mapCenter만 갱신 (네트워크 X)
 * - performSearch() 호출 시에만 네트워크 요청
 * - IntersectionObserver와 연동되는 loadMore()는
 *   동시 호출 방지용 in-flight ref로 "우수수 로딩"을 차단
 * - 검색 결과 상태 영속화 (localStorage)
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Restaurant, SidebarButtonType, MapCenter } from '../types';
import { integratedSearchAPI } from '../lib/api';

type LastQuery = { query: string; category?: string } | null;

interface SidebarContextType {
  // 패널/사이드바
  activePanel: SidebarButtonType;
  isOpen: boolean;
  setActivePanel: (panel: SidebarButtonType) => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;

  // 결과
  searchResults: Restaurant[];
  recommendations: Restaurant[];
  favorites: Restaurant[];
  votes: Restaurant[];

  // 페이지네이션
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;

  // 지도 중심 (드래그로 갱신, 네트워크 X)
  mapCenter: MapCenter | null;
  setMapCenter: (c: MapCenter) => void;

  // 선택된 레스토랑 (마커 확대용)
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;

  // 검색
  performSearch: (params: { query: string; center?: MapCenter; category?: string; location?: string; limit?: number }) => Promise<void>;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 패널/사이드바
  const [activePanel, setActivePanelState] = useState<SidebarButtonType>('search');
  const [isOpen, setIsOpen] = useState(true);
  // 초기 검색 플래그
  const [hasInitialSearch, setHasInitialSearch] = useState(false);

  // 결과
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [recommendations] = useState<Restaurant[]>([]);
  const [favorites] = useState<Restaurant[]>([]);
  const [votes] = useState<Restaurant[]>([]);

  // 페이지네이션
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 마지막 검색 파라미터
  const [lastQuery, setLastQuery] = useState<LastQuery>(null);

  // 지도 중심 (드래그 → 값만 갱신, 네트워크 X)
  const [mapCenter, _setMapCenter] = useState<MapCenter | null>(null);
  const setMapCenter = useCallback((c: MapCenter) => {
    _setMapCenter(c);
  }, []);

  // 선택 상태
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);

  // 🆕 검색 결과 영속화 관련 상수
  const SEARCH_RESULTS_KEY = 'sidebar_search_results';
  const SEARCH_RESULTS_EXPIRE_TIME = 30 * 60 * 1000; // 30분

  // 사이드바 컨트롤
  const setActivePanel = useCallback((panel: SidebarButtonType) => setActivePanelState(panel), []);
  const toggleSidebar = useCallback(() => setIsOpen(v => !v), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // 🆕 검색 결과를 localStorage에 저장
  const saveSearchResults = useCallback(() => {
    if (searchResults.length > 0) {
      localStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify({
        results: searchResults,
        hasMore,
        page,
        lastQuery,
        timestamp: Date.now()
      }));
    }
  }, [searchResults, hasMore, page, lastQuery]);

  // 🆕 localStorage에서 검색 결과 복원
  const restoreSearchResults = useCallback(() => {
    const savedResults = localStorage.getItem(SEARCH_RESULTS_KEY);
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        const isExpired = Date.now() - parsed.timestamp > SEARCH_RESULTS_EXPIRE_TIME;
        
        if (!isExpired) {
          setSearchResults(parsed.results || []);
          setHasMore(parsed.hasMore !== false);
          setPage(parsed.page || 1);
          setLastQuery(parsed.lastQuery || null);
        } else {
          // 만료된 데이터 삭제
          localStorage.removeItem(SEARCH_RESULTS_KEY);
        }
      } catch (e) {
        console.warn('Failed to restore search results:', e);
        localStorage.removeItem(SEARCH_RESULTS_KEY);
      }
    }
  }, []);

  // 🆕 검색 결과 초기화
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setHasMore(true);
    setPage(1);
    setLastQuery(null);
    setSelectedRestaurantId(null);
    localStorage.removeItem(SEARCH_RESULTS_KEY);
  }, []);

  // 🆕 컴포넌트 마운트 시 저장된 검색 결과 복원
  useEffect(() => {
    restoreSearchResults();
  }, [restoreSearchResults]);

  // 🆕 검색 결과가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    saveSearchResults();
  }, [saveSearchResults]);

  // ✅ loadMore가 연속 호출되는 것을 1차로 막는 ref
  const loadMoreInFlightRef = useRef(false);

  /**
   * 검색 실행(폼 제출/버튼 클릭 시): page=1부터 새로 불러오기
   */
  const performSearch = useCallback(async (params: { query: string; center?: MapCenter; category?: string; location?: string; limit?: number }) => {
    setIsLoading(true);
    try {
      const center = params.center ?? mapCenter ?? { lat: 36.35369004484255, lng: 127.34132312554642 };
      
      // 키워드 검색 vs 위치 검색 분기
      const data = params.query.trim()
        ? await integratedSearchAPI.searchAndEnrich(params.query, center, { page: 1, size: pageSize, saveToDb: true } as any)
        : await integratedSearchAPI.searchByLocation(center, { page: 1, size: pageSize } as any);

      setSearchResults(data);
      setPage(1);
      setHasMore(data.length >= pageSize);
      setLastQuery({ query: params.query.trim(), category: params.category });
      setActivePanel('search');

      // 새 검색 시 선택 초기화 
      setSelectedRestaurantId(null);
    } catch (e) {
      console.error('[performSearch] 실패:', e);
      setSearchResults([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      loadMoreInFlightRef.current = false;
      setIsLoadingMore(false);
    }
  }, [mapCenter, pageSize, setActivePanel]);

  // 컴포넌트 마운트 시 한 번만 초기 검색 실행
  useEffect(() => {
    if (!hasInitialSearch) {
      const defaultCenter = { lat: 36.35369004484255, lng: 127.34132312554642 };
      void performSearch({
        query: '',
        center: defaultCenter,
      });
      setHasInitialSearch(true);
    }
  }, [hasInitialSearch, performSearch]);
  /**
   * 무한 스크롤: 동일 파라미터로 page+1 호출해서 5개 추가
   */
  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || loadMoreInFlightRef.current) return;

    setIsLoadingMore(true);
    loadMoreInFlightRef.current = true;
    try {
      const nextPage = page + 1;
      const center = mapCenter ?? { lat: 36.35369004484255, lng: 127.34132312554642 };

      const delay = new Promise<void>(res => setTimeout(res, 1000));
      const fetchPromise = (lastQuery?.query ?? '').trim()
        ? integratedSearchAPI.searchAndEnrich(lastQuery!.query, center, { page: nextPage, size: pageSize } as any)
        : integratedSearchAPI.searchByLocation(center, { page: nextPage, size: pageSize } as any);

      const [data] = await Promise.all([fetchPromise, delay]) as [Restaurant[], void];

      if (data.length > 0) {
        setSearchResults(prev => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length >= pageSize);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('[loadMore] 실패:', e);
    } finally {
      setIsLoadingMore(false);
      loadMoreInFlightRef.current = false;
    }
  }, [isLoading, isLoadingMore, hasMore, page, pageSize, lastQuery, mapCenter]);

  const value: SidebarContextType = {
    activePanel,
    isOpen,
    setActivePanel,
    toggleSidebar,
    openSidebar,
    closeSidebar,

    searchResults,
    recommendations,
    favorites,
    votes,

    page,
    pageSize,
    hasMore,
    isLoading,
    isLoadingMore,

    mapCenter,
    setMapCenter,

    selectedRestaurantId,
    setSelectedRestaurantId,

    performSearch,
    loadMore,
    clearSearch,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export default SidebarContext;