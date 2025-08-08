/**
 * SidebarContext.tsx
 * 
 * 사이드바 상태를 관리하는 Context
 * - 현재 활성화된 패널 관리
 * - 사이드바 열림/닫힘 상태 관리
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { SidebarButtonType, Restaurant } from '../types';

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
  const [searchResults] = useState<Restaurant[]>([]);
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
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContext;
