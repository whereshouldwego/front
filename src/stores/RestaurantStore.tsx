import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { RestaurantStore } from '../types';

export const useRestaurantStore = create<RestaurantStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        favorites: new Set(),
        candidates: new Set(),
        votedRestaurants: new Set(),
        voteCounts: {},

        // 액션들
        toggleFavorite: (restaurantId: string) => {
          set((state) => {
            const newFavorites = new Set(state.favorites);
            if (newFavorites.has(restaurantId)) {
              newFavorites.delete(restaurantId);
            } else {
              newFavorites.add(restaurantId);
            }
            return { favorites: newFavorites };
          });
        },

        toggleCandidate: (restaurantId: string) => {
          set((state) => {
            const newCandidates = new Set(state.candidates);
            if (newCandidates.has(restaurantId)) {
              newCandidates.delete(restaurantId);
            } else {
              newCandidates.add(restaurantId);
            }
            return { candidates: newCandidates };
          });
        },

        toggleVote: (restaurantId: string) => {
          set((state) => {
            const newVotedRestaurants = new Set(state.votedRestaurants);
            const newVoteCounts = { ...state.voteCounts };
            
            if (newVotedRestaurants.has(restaurantId)) {
              // 투표 취소
              newVotedRestaurants.delete(restaurantId);
              newVoteCounts[restaurantId] = Math.max(0, (newVoteCounts[restaurantId] || 0) - 1);
            } else {
              // 투표 추가 (한 가게당 한 번만)
              newVotedRestaurants.add(restaurantId);
              newVoteCounts[restaurantId] = (newVoteCounts[restaurantId] || 0) + 1;
            }
            
            return { 
              votedRestaurants: newVotedRestaurants,
              voteCounts: newVoteCounts
            };
          });
        },

        isFavorited: (restaurantId: string) => {
          return get().favorites.has(restaurantId);
        },

        isCandidate: (restaurantId: string) => {
          return get().candidates.has(restaurantId);
        },

        isVoted: (restaurantId: string) => {
          return get().votedRestaurants.has(restaurantId);
        },

        getVoteCount: (restaurantId: string) => {
          return get().voteCounts[restaurantId] || 0;
        },

        getFavorites: () => {
          return Array.from(get().favorites);
        },

        getCandidates: () => {
          return Array.from(get().candidates);
        },

        getVotedRestaurants: () => {
          return Array.from(get().votedRestaurants);
        },

        resetState: () => {
          set({
            favorites: new Set(),
            candidates: new Set(),
            votedRestaurants: new Set(),
            voteCounts: {}
          });
        }
      }),
      {
        name: 'restaurant-store',
        partialize: (state: RestaurantStore) => ({
          favorites: Array.from(state.favorites),
          candidates: Array.from(state.candidates),
          votedRestaurants: Array.from(state.votedRestaurants),
          voteCounts: state.voteCounts
        }),
        onRehydrateStorage: () => (state: any) => {
          if (state) {
            state.favorites = new Set(state.favorites);
            state.candidates = new Set(state.candidates);
            state.votedRestaurants = new Set(state.votedRestaurants);
          }
        }
      }
    ),
    {
      name: 'restaurant-store'
    }
  )
);