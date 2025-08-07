/**
 * useCandidate.ts
 *
 * 후보 관련 커스텀 훅
 *
 * 기능:
 * - 후보 상태 관리
 * - 투표 데이터 가져오기
 * - 투표 기능
 */

import { useState, useCallback } from 'react';
import { useSidebar } from '../stores/SidebarContext';
import type { Restaurant, VoteRequest } from '../types';

interface UseCandidateReturn {
  candidates: Restaurant[];
  isLoading: boolean;
  error: string | null;
  toggleVote: (request: VoteRequest) => Promise<void>;
  clearCandidates: () => void;
}

export const useCandidate = (): UseCandidateReturn => {
  const {
    votes,
    voteLoading,
    voteError,
    toggleVote: contextToggleVote
  } = useSidebar();

  const [localError, setLocalError] = useState<string | null>(null);

  const toggleVote = useCallback(async (request: VoteRequest) => {
    setLocalError(null);
    try {
      await contextToggleVote(request);
    } catch (error) {
      setLocalError('투표 처리 중 오류가 발생했습니다.');
    }
  }, [contextToggleVote]);

  const clearCandidates = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    candidates: votes,
    isLoading: voteLoading,
    error: localError || voteError,
    toggleVote,
    clearCandidates
  };
};
