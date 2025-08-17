import { create } from 'zustand';
import type { RestaurantWithStatus } from '../types';

interface CandidateOptimisticStore {
  optimisticItems: RestaurantWithStatus[] | null;
  setOptimisticItems: (items: RestaurantWithStatus[] | null | ((prev: RestaurantWithStatus[] | null) => RestaurantWithStatus[] | null)) => void;
}

export const useCandidateOptimisticStore = create<CandidateOptimisticStore>((set) => ({
  optimisticItems: null,
  setOptimisticItems: (items) =>
    set((state) => ({
      optimisticItems: typeof items === 'function' ? (items as any)(state.optimisticItems) : items,
    })),
}));
