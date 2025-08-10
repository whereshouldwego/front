/**
 * useCandidates
 * - /candidate/history/{roomCode}를 가져와
 *   candidate 카드와 voteCount 표시를 바로 사용
 */
import { useCallback, useEffect, useState } from 'react';
import { candidateAPI } from '../lib/api';
import type { CandidateHistoryItem } from '../types';

export function useCandidates(roomCode: string | undefined) {
  const [items, setItems] = useState<CandidateHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    setLoading(true);
    const res = await candidateAPI.history(roomCode);
    if (res.success) setItems(res.data);
    setLoading(false);
  }, [roomCode]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, refresh };
}
