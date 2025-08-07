/**
 * useFavorite.ts
 *
 * 찜하기 관련 커스텀 훅
 *
 * 기능:
 * - 찜하기 상태 관리
 * - 찜한 맛집 데이터 가져오기
 * - 찜하기 토글 기능
 */

import { useState, useCallback } from 'react';
import { useSidebar } from '../stores/SidebarContext';
import type { Restaurant, FavoriteRequest } from '../types';

interface UseFavoriteReturn {
  favorites: Restaurant[];
  isLoading: boolean;
  error: string | null;
  toggleFavorite: (request: FavoriteRequest) => Promise<void>;
  clearFavorites: () => void;
}

export const useFavorite = (): UseFavoriteReturn => {
  const {
    favorites,
    favoriteLoading,
    favoriteError,
    toggleFavorite: contextToggleFavorite
  } = useSidebar();

  const [localError, setLocalError] = useState<string | null>(null);

  const toggleFavorite = useCallback(async (request: FavoriteRequest) => {
    setLocalError(null);
    try {
      await contextToggleFavorite(request);
    } catch (error) {
      setLocalError('찜하기 처리 중 오류가 발생했습니다.');
    }
  }, [contextToggleFavorite]);

  const clearFavorites = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    favorites,
    isLoading: favoriteLoading,
    error: localError || favoriteError,
    toggleFavorite,
    clearFavorites
  };
};
