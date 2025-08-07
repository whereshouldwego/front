/**
 * useRecommend.ts
 *
 * 추천 관련 커스텀 훅
 *
 * 기능:
 * - 추천 상태 관리
 * - 추천 데이터 가져오기
 * - 추천 결과 필터링 및 정렬
 */

import { useState, useCallback } from 'react';
import { useSidebar } from '../stores/SidebarContext';
import type { Restaurant, RecommendRequest } from '../types';

interface UseRecommendReturn {
  recommendations: Restaurant[];
  isLoading: boolean;
  error: string | null;
  getRecommendations: (request: RecommendRequest) => Promise<void>;
  clearRecommendations: () => void;
}

export const useRecommend = (): UseRecommendReturn => {
  const {
    recommendations,
    recommendLoading,
    recommendError,
    getRecommendations: contextGetRecommendations
  } = useSidebar();

  const [localError, setLocalError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (request: RecommendRequest) => {
    setLocalError(null);
    try {
      await contextGetRecommendations(request);
    } catch (error) {
      setLocalError('추천을 가져오는 중 오류가 발생했습니다.');
    }
  }, [contextGetRecommendations]);

  const clearRecommendations = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    recommendations,
    isLoading: recommendLoading,
    error: localError || recommendError,
    getRecommendations,
    clearRecommendations
  };
};
