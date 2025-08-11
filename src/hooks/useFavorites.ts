// src/hooks/useFavorites.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { favoriteAPI, placeAPI } from '../lib/api';
import type { LocalDetail, RestaurantWithStatus } from '../types';
import { localDetailToRestaurant } from '../utils/location';
import { useRestaurantStore } from '../stores/RestaurantStore';

/**
 * useFavorites
 * - curl 명세 그대로: GET /api/favorites/{userId}, DELETE /api/favorites/{favoriteId}
 * - 목록 → place 상세 보강(간단)까지 처리
 * - FavoritePanel에서 그대로 사용 가능
 */
export function useFavorites(userId?: number) {
  const uid = userId ?? 1;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RestaurantWithStatus[]>([]); // 타입 수정

  const { isCandidate, isVoted, getVoteCount } = useRestaurantStore();

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await favoriteAPI.listByUser(uid);
      if (!res.success) throw new Error(res.error.message);

      // 서버가 준 favorites: FavoriteInfo[] → place 상세 보강
      const list = await Promise.all(
        res.data.map(async (f) => {
          const d = await placeAPI.getPlaceById(f.placeId);
          if (d.success) {
            const restaurant = localDetailToRestaurant(d.data as LocalDetail);
          // 상세 실패 시 최소 보정
            return {
              ...restaurant,
              isFavorite: true,
              isCandidate: isCandidate(restaurant.placeId),
              isVoted: isVoted(restaurant.placeId),
              voteCount: getVoteCount(restaurant.placeId)
            };
          }
          return null;
        })
      );
      const validItems = list.filter((item): item is RestaurantWithStatus => item !== null);
      setItems(validItems);
    } catch (e: any) {
      setError(e?.message || '찜 목록을 불러오는 중 오류가 발생했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [uid, isCandidate, isVoted, getVoteCount]);

  useEffect(() => { void fetchFavorites(); }, [fetchFavorites]);

  const placeIds = useMemo(() => items.map(r => r.placeId), [items]);

  return { items, placeIds, loading, error, refresh: fetchFavorites };
}


export type UseFavoritesReturn = ReturnType<typeof useFavorites>;
