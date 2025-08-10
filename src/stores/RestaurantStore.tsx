import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { RestaurantStore } from '../types';
import { favoriteAPI, candidateAPI } from '../lib/api';

export const useRestaurantStore = create<RestaurantStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        favorites: new Set<number>(),
        favoriteIndex: {} as Record<number, number>,
        candidates: new Set<number>(), // 이 줄 추가 필요
        votedRestaurants: new Set<number>(),
        voteCounts: {} as Record<number, number>,

        // --- 서버 동기화 액션들 (필수) ---
        // 즐겨찾기 초기 동기화
        hydrateFavorites: async (userId: number) => {
          const res = await favoriteAPI.listByUser(userId);
          if (res.success) {
            const ids = res.data.map((f) => f.placeId);
            const index: Record<number, number> = {};
            res.data.forEach((f) => (index[f.placeId] = f.favoriteId));
            set({ favorites: new Set(ids), favoriteIndex: index });
          }
        },
        // 후보 초기 동기화 (roomCode 기반 history)
        hydrateCandidates: async (roomCode: string) => {
          const res = await candidateAPI.history(roomCode);
          if (res.success) {
            const ids = res.data.map(item => Number(item.place.id));
            set({ candidates: new Set(ids) });
          }
        },
        /** 투표 초기 동기화: 서버 미구현 → 보류 */
        hydrateVotes: async (_roomCode: string) => {
          // (추후 명세 확인 요망) : vote 조회/집계 API 확정되면 여기서 동기화
          // 예: const res = await voteAPI.list(_roomCode)
        },

        // 액션들
        /**
         * 즐겨찾기 토글 (낙관적 업데이트 + 실패 시 롤백) => api 명세 보여주고 다시 요청
         * @param restaurantId placeId 문자열(카카오 id 기반)
         * @param userId 서버 요청에 필요
         */
        toggleFavorite: async (placeId: number, userId: number) => {
          const { favorites, favoriteIndex } = get();
          const isOn = favorites.has(placeId);

          // 스냅샷
          const prevFavorites = new Set(favorites);
          const prevIndex = { ...favoriteIndex };

          if (!isOn) {
            // 1) 낙관적 추가
            const optimistic = new Set(favorites);
            optimistic.add(placeId);
            set({ favorites: optimistic });

            try {
              // 2) POST
              const res = await favoriteAPI.create({ userId, placeId });
              if (!res.success) throw new Error(res.error.message);
              // 3) favoriteId 업데이트
              set((s) => ({
                favoriteIndex: { ...s.favoriteIndex, [placeId]: res.data.favoriteId },
              }));
            } catch (e) {
              // 4) 롤백
              set({ favorites: prevFavorites, favoriteIndex: prevIndex });
              throw e;
            }
          } else {
            // 1) 낙관적 삭제
            const optimistic = new Set(favorites);
            optimistic.delete(placeId);
            const { [placeId]: willDelete, ...rest } = favoriteIndex;
            set({ favorites: optimistic, favoriteIndex: rest });

            try {
              // 2) DELETE
              const favId = prevIndex[placeId];
              if (!favId) throw new Error('favoriteId 매핑이 없습니다.');
              const res = await favoriteAPI.remove(favId);
              if (!res.success) throw new Error(res.error.message);
            } catch (e) {
              // 3) 롤백
              set({ favorites: prevFavorites, favoriteIndex: prevIndex });
              throw e;
            }
          }
        },

        /**
         * 후보 토글
         * 현재 스웨거에 생성/삭제 API 없음 → 로컬 변경 금지
         * 후보는 /candidate/history/{roomCode} 로만 동기화해서 사용.
         */
        toggleCandidate: (_placeId: number) => {
          console.warn('[candidate] 토글 미구현 - 서버 명세 확인 필요'); // (추후 명세 확인 요망)
          // 의도적으로 no-op
        },

        /**
         * 투표 토글(표시용 로컬 상태)
         * 서버 POST/DELETE 미구현 → 로컬에서만 증감
         */
        toggleVote: (placeId: number) => {
          set((state) => {
            const id = placeId;
            const voted = new Set(state.votedRestaurants);
            const counts = { ...state.voteCounts };
            if (voted.has(id)) {
              voted.delete(id);
              counts[id] = Math.max(0, (counts[id] || 0) - 1);
            } else {
              voted.add(id);
              counts[id] = (counts[id] || 0) + 1;
            }
            return { votedRestaurants: voted, voteCounts: counts };
          });
          // (추후 명세 확인 요망) : voteAPI.create / voteAPI.delete 연동
        },

        isFavorited: (placeId: number) => get().favorites.has(placeId),
        isCandidate: (placeId: number) => get().candidates.has(placeId),
        isVoted: (placeId: number) => get().votedRestaurants.has(placeId),
        getVoteCount: (placeId: number) => get().voteCounts[placeId] || 0,

        getFavorites: () => Array.from(get().favorites),
        getCandidates: () => Array.from(get().candidates),
        getVotedRestaurants: () => Array.from(get().votedRestaurants),

        resetState: () => {
          set({
            favorites: new Set<number>(), // string → number
            favoriteIndex: {},
            candidates: new Set<number>(), // string → number
            votedRestaurants: new Set<number>(), // string → number
            voteCounts: {} as Record<number, number> // string → number
          });
        }
      }),
      {
        name: 'restaurant-store',
        partialize: (state: RestaurantStore) => ({
          favorites: Array.from(state.favorites),
          favoriteIndex: state.favoriteIndex,
          candidates: Array.from(state.candidates),
          votedRestaurants: Array.from(state.votedRestaurants),
          voteCounts: state.voteCounts
        }),
        onRehydrateStorage: () => (state: any) => {
          if (state) {
            state.favorites = new Set<string>(state.favorites ?? []);
            state.candidates = new Set<string>(state.candidates ?? []);
            state.votedRestaurants = new Set<string>(state.votedRestaurants ?? []);
          }
        }
      }
    ),
    {
      name: 'restaurant-store'
    }
  )
);