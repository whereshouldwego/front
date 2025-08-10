/**
 * useFavorites
 * - 즐겨찾기 목록 동기화/추가/삭제
 * - 삭제는 favoriteId가 필요 → 목록에서 찾아 매핑
 */
import { useCallback, useEffect, useState } from 'react';
import { favoriteAPI } from '../lib/api';
import type { FavoriteInfo } from '../types';

export function useFavorites(userId: number | undefined) {
  const [items, setItems] = useState<FavoriteInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const res = await favoriteAPI.listByUser(userId);
    if (res.success) setItems(res.data);
    setLoading(false);
  }, [userId]);

  const add = useCallback(async (placeId: number) => {
    if (!userId) return;
    const res = await favoriteAPI.create({ userId, placeId });
    if (res.success) setItems(prev => [res.data, ...prev]);
  }, [userId]);

  const removeByPlaceId = useCallback(async (placeId: number) => {
    // favoriteId 매핑 필요
    const target = items.find(i => i.placeId === placeId);
    if (!target) return;
    const res = await favoriteAPI.remove(target.favoriteId);
    if (res.success) setItems(prev => prev.filter(i => i.favoriteId !== target.favoriteId));
  }, [items]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, refresh, add, removeByPlaceId };
}
