/**
 * useCandidates
 * - /candidate/history/{roomCode}를 가져와
 *   candidate 카드와 voteCount 표시를 바로 사용
 */
import { useCallback, useEffect, useState } from 'react';
import { candidateAPI } from '../lib/api';
import type { RestaurantWithStatus } from '../types';
import { useRestaurantStore } from '../stores/RestaurantStore';
import { localDetailToRestaurant } from '../utils/location';

export function useCandidates(roomCode: string | undefined, userId?: number) {
  const [items, setItems] = useState<RestaurantWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isFavorited, isVoted, getVoteCount } = useRestaurantStore();

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await candidateAPI.history(roomCode);
      if (res.success) {
        const enrichedItems: RestaurantWithStatus[] = res.data.map(item => ({
          ...localDetailToRestaurant(item.place),
          isFavorite: isFavorited(item.place.id),
          isCandidate: true,
          isVoted: isVoted(item.place.id),
          voteCount: item.voteCount
        }));
        setItems(enrichedItems);
      } else {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || '후보 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [roomCode, isFavorited, isVoted]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, error, refresh };
}