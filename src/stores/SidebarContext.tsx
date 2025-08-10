/**
 * SidebarContext.tsx
 * 
 * 사이드바 상태를 관리하는 Context
 * - 현재 활성화된 패널 관리
 * - 사이드바 열림/닫힘 상태 관리
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Restaurant, SidebarButtonType } from '../types';
import { integratedSearchAPI } from '../lib/api';

interface SidebarContextType {
  activePanel: SidebarButtonType;
  isOpen: boolean;
  searchResults: Restaurant[];
  recommendations: Restaurant[];
  favorites: Restaurant[];
  votes: Restaurant[];
  // 페이지네이션 상태
  currentPage: number;
  hasMoreResults: boolean;
  isLoadingMore: boolean;
  setActivePanel: (panel: SidebarButtonType) => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  performSearch: (params: { query: string; location?: string; category?: string; limit?: number; append?: boolean }) => Promise<void>;
  loadMoreResults: (params: { query: string; location?: string; category?: string }) => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [activePanel, setActivePanelState] = useState<SidebarButtonType>('search');
  const [isOpen, setIsOpen] = useState(true);
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [recommendations] = useState<Restaurant[]>([]);
  const [favorites] = useState<Restaurant[]>([]);
  const [votes] = useState<Restaurant[]>([]);
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const setActivePanel = useCallback((panel: SidebarButtonType) => {
    setActivePanelState(panel);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const performSearch = useCallback(async (params: { 
    query: string; 
    location?: string; 
    category?: string; 
    limit?: number;
    append?: boolean; // 결과를 기존 결과에 추가할지 여부
  }) => {
    try {
      let restaurants: Restaurant[] = [];
      
      if (params.query.trim()) {
        // 키워드 검색
        const center = params.location ? {
          lat: parseFloat(params.location.split(',')[0]),
          lng: parseFloat(params.location.split(',')[1])
        } : undefined;
        
        restaurants = await integratedSearchAPI.searchAndEnrich(
          params.query,
          center,
          { roomCode: undefined }
        );
      } else if (params.location) {
        // 위치 기반 검색
        const center = {
          lat: parseFloat(params.location.split(',')[0]),
          lng: parseFloat(params.location.split(',')[1])
        };
        
        restaurants = await integratedSearchAPI.searchByLocation(
          center,
          { roomCode: undefined, radiusKm: 3 }
        );
      }
      
      // 결과 수 제한
      if (params.limit) {
        restaurants = restaurants.slice(0, params.limit);
      }
      
      // 결과 설정 (추가 모드인지 새 검색인지에 따라)
      if (params.append) {
        setSearchResults(prev => [...prev, ...restaurants]);
      } else {
        setSearchResults(restaurants);
        setCurrentPage(1);
        setHasMoreResults(true);
      }
      
      console.log('검색 완료:', restaurants.length, '개 결과', params.append ? '(추가됨)' : '(새 검색)');
      
    } catch (error) {
      console.error('검색 실패:', error);
      if (!params.append) {
        setSearchResults([]);
      }
    }
  }, []);

  // 더 많은 결과 로드 (페이지네이션)
  const loadMoreResults = useCallback(async (params: {
    query: string;
    location?: string;
    category?: string;
  }) => {
    if (isLoadingMore || !hasMoreResults) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      let restaurants: Restaurant[] = [];
      
      if (params.query.trim()) {
        // 키워드 검색 - 다음 페이지
        const center = params.location ? {
          lat: parseFloat(params.location.split(',')[0]),
          lng: parseFloat(params.location.split(',')[1])
        } : undefined;
        
        restaurants = await integratedSearchAPI.searchAndEnrich(
          params.query,
          center,
          { roomCode: undefined, page: nextPage }
        );
      } else if (params.location) {
        // 위치 기반 검색 - 다음 페이지
        const center = {
          lat: parseFloat(params.location.split(',')[0]),
          lng: parseFloat(params.location.split(',')[1])
        };
        
        restaurants = await integratedSearchAPI.searchByLocation(
          center,
          { roomCode: undefined, radiusKm: 3, page: nextPage }
        );
      }

      if (restaurants.length > 0) {
        // 기존 결과에 추가
        setSearchResults(prev => [...prev, ...restaurants]);
        setCurrentPage(nextPage);
        setHasMoreResults(restaurants.length >= 10); // 10개 미만이면 더 이상 결과 없음
        console.log(`✅ ${nextPage}페이지 결과 ${restaurants.length}개 추가됨`);
      } else {
        setHasMoreResults(false);
        console.log('더 이상 결과가 없습니다.');
      }
      
    } catch (error) {
      console.error('추가 결과 로드 실패:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMoreResults, isLoadingMore]);

  const value: SidebarContextType = {
    activePanel,
    isOpen,
    searchResults,
    recommendations,
    favorites,
    votes,
    // 페이지네이션 상태
    currentPage,
    hasMoreResults,
    isLoadingMore,
    setActivePanel,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    performSearch,
    loadMoreResults,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContext;
