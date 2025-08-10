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
  setActivePanel: (panel: SidebarButtonType) => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  performSearch: (params: { query: string; location?: string; category?: string; limit?: number }) => Promise<void>;
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
    limit?: number 
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
      
      setSearchResults(restaurants);
      console.log('검색 완료:', restaurants.length, '개 결과');
      
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchResults([]);
    }
  }, []);

  const value: SidebarContextType = {
    activePanel,
    isOpen,
    searchResults,
    recommendations,
    favorites,
    votes,
    setActivePanel,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    performSearch,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContext;
