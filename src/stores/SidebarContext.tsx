/**
 * SidebarContext.tsx
 * 
 * 기존 파일: src/app/SidebarToggle.js
 * 변환 내용:
 * - 사이드바 토글 상태를 전역적으로 관리
 * - React Context API 사용
 * - 하위 컴포넌트들이 사이드바 상태에 접근 가능
 */


import React, { createContext, useCallback, useContext, useState } from 'react';
import { favoriteAPI, recommendAPI, searchAPI, voteAPI } from '../lib/api'; // Updated import
import type { FavoriteRequest, RecommendRequest, Restaurant, SearchRequest, SidebarButtonType, VoteRequest } from '../types';

interface SidebarContextType {
  isExpanded: boolean;
  activePanel: SidebarButtonType | '';
  toggleSidebar: () => void;
  setActivePanel: (panel: SidebarButtonType | '') => void;
  
  // 검색 관련
  searchQuery: string;
  searchResults: Restaurant[];
  searchLoading: boolean;
  searchError: string | null;
  performSearch: (request: SearchRequest) => Promise<void>;
  
  // 추천 관련
  recommendations: Restaurant[];
  recommendLoading: boolean;
  recommendError: string | null;
  getRecommendations: (request: RecommendRequest) => Promise<void>;
  
  // 찜하기 관련
  favorites: Restaurant[];
  favoriteLoading: boolean;
  favoriteError: string | null;
  toggleFavorite: (request: FavoriteRequest) => Promise<void>;
  
  // 투표 관련
  votes: Restaurant[];
  voteLoading: boolean;
  voteError: string | null;
  toggleVote: (request: VoteRequest) => Promise<void>;
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
  const [isExpanded, setIsExpanded] = useState(true); // 앱 시작 시 사이드바 열림
  const [activePanel, setActivePanel] = useState<SidebarButtonType | ''>('search'); // 검색 패널 활성화
  
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // 추천 관련 상태
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);
  
  // 찜하기 관련 상태
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  
  // 투표 관련 상태
  const [votes, setVotes] = useState<Restaurant[]>([]);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const toggleSidebar = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const setActivePanelHandler = useCallback((panel: SidebarButtonType | '') => {
    setActivePanel(panel);
  }, []);

  // 검색 수행
  const performSearch = useCallback(async (request: SearchRequest) => {
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      const response = await searchAPI.search(request);
      if ('success' in response && response.success) {
        setSearchResults(response.data);
        setSearchQuery(request.query);
      } else if ('error' in response) {
        setSearchError(response.error.message || '검색 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setSearchError('검색 중 오류가 발생했습니다.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // 추천 가져오기
  const getRecommendations = useCallback(async (request: RecommendRequest) => {
    setRecommendLoading(true);
    setRecommendError(null);
    
    try {
      const response = await recommendAPI.getRecommendations(request);
      if ('success' in response && response.success) {
        setRecommendations(response.data);
      } else if ('error' in response) {
        setRecommendError(response.error.message || '추천을 가져오는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setRecommendError('추천을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setRecommendLoading(false);
    }
  }, []);

  // 찜하기 토글
  const toggleFavorite = useCallback(async (request: FavoriteRequest) => {
    setFavoriteLoading(true);
    setFavoriteError(null);
    
    try {
      const response = await favoriteAPI.toggleFavorite(request);
      if ('success' in response && response.success) {
        // 찜 목록 업데이트 - 실제로는 API에서 전체 레스토랑 정보를 받아와야 함
        // 여기서는 임시로 처리
        if (request.action === 'add') {
          // 실제로는 API에서 전체 레스토랑 정보를 받아와야 함
          console.log('찜하기 추가:', request.restaurantId);
        } else {
          setFavorites(prev => prev.filter(item => item.id !== request.restaurantId));
        }
      } else if ('error' in response) {
        setFavoriteError(response.error.message || '찜하기 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setFavoriteError('찜하기 처리 중 오류가 발생했습니다.');
    } finally {
      setFavoriteLoading(false);
    }
  }, []);

  // 투표 토글
  const toggleVote = useCallback(async (request: VoteRequest) => {
    setVoteLoading(true);
    setVoteError(null);
    
    try {
      const response = await voteAPI.toggleVote(request);
      if ('success' in response && response.success) {
        // 투표 목록 업데이트 - 실제로는 API에서 전체 레스토랑 정보를 받아와야 함
        // 여기서는 임시로 처리
        if (request.action === 'vote') {
          // 실제로는 API에서 전체 레스토랑 정보를 받아와야 함
          console.log('투표 추가:', request.restaurantId);
        } else {
          setVotes(prev => prev.filter(item => item.id !== request.restaurantId));
        }
      } else if ('error' in response) {
        setVoteError(response.error.message || '투표 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      setVoteError('투표 처리 중 오류가 발생했습니다.');
    } finally {
      setVoteLoading(false);
    }
  }, []);

  const value: SidebarContextType = {
    isExpanded,
    activePanel,
    toggleSidebar,
    setActivePanel: setActivePanelHandler,
    
    // 검색 관련
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    performSearch,
    
    // 추천 관련
    recommendations,
    recommendLoading,
    recommendError,
    getRecommendations,
    
    // 찜하기 관련
    favorites,
    favoriteLoading,
    favoriteError,
    toggleFavorite,
    
    // 투표 관련
    votes,
    voteLoading,
    voteError,
    toggleVote,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}; 