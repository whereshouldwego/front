/**
 * useCandidates
 * - /candidate/history/{roomCode}를 가져와
 *   candidate 카드와 voteCount 표시를 바로 사용
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { candidateAPI } from '../lib/api';
import type { RestaurantWithStatus } from '../types';
import { useRestaurantStore } from '../stores/RestaurantStore';
import { localDetailToRestaurant } from '../utils/location';
import { CandidateClient } from '../stores/CandidateClient';

export function useCandidates(roomCode: string | undefined) {
  const [items, setItems] = useState<RestaurantWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const { isFavorited, isVoted } = useRestaurantStore();

  const refresh = useCallback(async () => {
    if (!roomCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await candidateAPI.history(roomCode);
      if (res.success) {
        // RestaurantStore의 투표 정보도 함께 업데이트
        const voteCounts: Record<number, number> = {};
        const votedSet = new Set<number>();
        const candidateIds = new Set<number>();
        
        res.data.forEach(item => {
          const placeId = item.place.id;
          candidateIds.add(placeId);
          voteCounts[placeId] = item.voteCount;
          
          // 현재 사용자가 투표했는지 확인
          const currentUserId = Number(localStorage.getItem('userId') || '');
          if (item.votedUserIds && item.votedUserIds.includes(currentUserId)) {
            votedSet.add(placeId);
          }
        });
        
        // RestaurantStore 업데이트
        useRestaurantStore.setState({
          candidates: candidateIds,
          voteCounts,
          votedRestaurants: votedSet
        });
        
        const enrichedItems: RestaurantWithStatus[] = res.data.map(item => ({
          ...localDetailToRestaurant(item.place),
          isFavorite: isFavorited(item.place.id),
          isCandidate: true,
          isVoted: votedSet.has(item.place.id),
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

  useEffect(() => {
    if (!roomCode) return;
    localStorage.setItem('roomCode', roomCode);
    
    if (!initializedRef.current) {
      // CandidateClient를 먼저 초기화하여 실시간 업데이트를 받을 준비
      CandidateClient.init(roomCode, (list) => {
        setItems(list);
        // CandidateClient가 데이터를 받으면 로딩 상태 해제
        setLoading(false);
      });
      initializedRef.current = true;
      
      // 초기 로딩 상태 설정
      setLoading(true);
      
      // CandidateClient 초기화 후 약간의 지연을 두고 API 호출
      // 이렇게 하면 STOMP 연결이 안정화된 후 데이터를 가져올 수 있음
      setTimeout(() => {
        void refresh();
      }, 100);
    } else {
      // 이미 초기화된 경우는 바로 새로고침
      void refresh();
    }
  }, [roomCode, refresh]);

  return { items, loading, error, refresh };
}