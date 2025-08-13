/**
 * SidebarContext.tsx
 *
 * 사이드바 + 검색/페이지네이션 + mapCenter 전역 상태
 * - 드래그로 mapCenter만 갱신 (네트워크 X)
 * - performSearch() 호출 시에만 네트워크 요청
 * - IntersectionObserver와 연동되는 loadMore()는
 *   동시 호출 방지용 in-flight ref로 “우수수 로딩”을 차단
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
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
  selectedRestaurantId: string | null; // placeId를 문자열로 저장
  setSelectedRestaurantId: (id: string | null) => void;

  // 검색
  performSearch: (params: { query: string; center?: MapCenter; category?: string; location?: string; limit?: number }) => Promise<void>;
  loadMore: () => Promise<void>;
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

  // 사이드바 컨트롤
  const setActivePanel = useCallback((panel: SidebarButtonType) => setActivePanelState(panel), []);
  const toggleSidebar = useCallback(() => setIsOpen(v => !v), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // ✅ loadMore가 연속 호출되는 것을 1차로 막는 ref
  const loadMoreInFlightRef = useRef(false);

  /**
   * 검색 실행(폼 제출/버튼 클릭 시): page=1부터 새로 불러오기
   * - hasMore/page 초기화
   * - isLoading 활성화
   */
  const performSearch = useCallback(async (params: { query: string; center?: MapCenter; category?: string; location?: string; limit?: number }) => {
    setIsLoading(true);
    try {
      const center = params.center ?? mapCenter ?? { lat: 37.5002, lng: 127.0364 };

      // 키워드 검색 vs 위치 검색 분기
      const data = params.query.trim()
        ? await integratedSearchAPI.searchAndEnrich(params.query, center, { page: 1, size: pageSize } as any)
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
      // 안전빵: 새 검색 시 in-flight 상태 초기화
      loadMoreInFlightRef.current = false;
      setIsLoadingMore(false);
    }
  }, [mapCenter, pageSize]);

  /**
   * 무한 스크롤: 동일 파라미터로 page+1 호출해서 5개 추가
   * - isLoading / isLoadingMore / inFlightRef 로 3중 가드
   */
  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || loadMoreInFlightRef.current) return;

    setIsLoadingMore(true);
    loadMoreInFlightRef.current = true; // ✅ 동시에 여러번 들어오는 것 차단
    try {
      const nextPage = page + 1;
      const center = mapCenter ?? { lat: 37.5002, lng: 127.0364 };

      const delay = new Promise<void>(res => setTimeout(res, 1000)); // ⭐ 1초 지연
      const fetchPromise = (lastQuery?.query ?? '').trim()
        ? integratedSearchAPI.searchAndEnrich(lastQuery!.query, center, { page: nextPage, size: pageSize } as any)
        : integratedSearchAPI.searchByLocation(center, { page: nextPage, size: pageSize } as any);

      // 두 작업을 동시에 기다리되, 결과는 fetchPromise의 반환값 사용
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
      loadMoreInFlightRef.current = false; // ✅ 호출 종료
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

    // 선택 상태 제공
    selectedRestaurantId,
    setSelectedRestaurantId,

    performSearch,
    loadMore,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export default SidebarContext;
