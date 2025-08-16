/**
 * useCandidates
 * - /candidate/history/{roomCode}를 가져와
 *   candidate 카드와 voteCount 표시를 바로 사용
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCandidateOptimisticStore } from '../stores/CandidateOptimisticStore';
import { candidateAPI } from '../lib/api';
import type { RestaurantWithStatus } from '../types';
import { useRestaurantStore } from '../stores/RestaurantStore';
import { CandidateClient, candidateToRestaurant } from '../stores/CandidateClient';

export function useCandidates(roomCode: string | undefined) {
  const [items, setItems] = useState<RestaurantWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  // zustand 전역 store 사용
  const optimisticItems = useCandidateOptimisticStore((s) => s.optimisticItems);
  const setOptimisticItems = useCandidateOptimisticStore((s) => s.setOptimisticItems);

  const { isFavorited, isVoted } = useRestaurantStore();

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await candidateAPI.history(roomCode);
      if (res.success) {
        const voteCounts: Record<number, number> = {};
        const votedSet = new Set<number>();
        const candidateIds = new Set<number>();
        res.data.forEach(item => {
          const placeId = item.place.id;                   // placeId → id
          candidateIds.add(placeId);
          voteCounts[placeId] = item.voteCount;
          const currentUserId = Number(localStorage.getItem('userId') || '');
          if (item.votedUserIds && item.votedUserIds.includes(currentUserId)) {
            votedSet.add(placeId);
          }
        });
        useRestaurantStore.setState({
          candidates: candidateIds,
          voteCounts,
          votedRestaurants: votedSet
        });
        
        // STOMP와 동일한 candidateToRestaurant 함수 사용
        const enrichedItems: RestaurantWithStatus[] = res.data.map(item => {
          console.log('[useCandidates] API 응답 데이터:', item);
          
          // candidateToRestaurant 함수 사용 (STOMP와 동일한 로직)
          const base = candidateToRestaurant(item.place);
          
          return {
            ...base,
            isFavorite: isFavorited(item.place.id),
            isCandidate: true,
            isVoted: votedSet.has(item.place.id),
            voteCount: item.voteCount
          };
        });
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

  // roomCode가 바뀔 때만 optimisticItems를 초기화 (전역 store)
  const prevRoomCodeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!roomCode) return;
    localStorage.setItem('roomCode', roomCode);
    if (prevRoomCodeRef.current !== roomCode) {
      setOptimisticItems(null);
      prevRoomCodeRef.current = roomCode;
    }
    if (!initializedRef.current) {
      CandidateClient.init(roomCode, (list) => {
        setItems(list);
        setLoading(false);
      });
      initializedRef.current = true;
      setLoading(true);
      setTimeout(() => {
        void refresh();
      }, 100);
    } else {
      void refresh();
    }
  }, [roomCode, refresh, setOptimisticItems]);

  return { items, optimisticItems, setOptimisticItems, loading, error, refresh };
}