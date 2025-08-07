/**
 * CandidatePanel.tsx
 *
 * 후보 패널 컴포넌트
 *
 * 기능:
 * - 투표 후보 맛집 표시
 * - 투표 기능
 * - 로딩 및 에러 상태 처리
 */

import React, { useEffect, useState } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';

const CandidatePanel: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedRestaurants, setVotedRestaurants] = useState<Set<string>>(new Set());

  const handleVoteClick = (restaurantId: string) => {
    setVotedRestaurants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(restaurantId)) {
        newSet.delete(restaurantId);
      } else {
        newSet.add(restaurantId);
      }
      return newSet;
    });
  };

  // 컴포넌트 마운트 시 후보 데이터 가져오기
  useEffect(() => {
    const getCandidates = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 실제 API 호출 대신 임시 데이터 사용
        const mockCandidates = [
          {
            id: 'cand1',
            name: '투표 후보 1',
            category: '한식',
            category_group_code: 'FD6',
            category_group_name: '음식점',
            phone: '02-4444-5555',
            address: '서울 강남구 강남대로 123',
            road_address: '서울 강남구 강남대로 123',
            location: { lat: 37.5002, lng: 127.0364 },
            place_url: 'https://place.map.kakao.com/4444444444',
            distance: '100m',
            voteCount: 5
          },
          {
            id: 'cand2',
            name: '투표 후보 2',
            category: '양식',
            category_group_code: 'FD6',
            category_group_name: '음식점',
            phone: '02-5555-6666',
            address: '서울 강남구 강남대로 456',
            road_address: '서울 강남구 강남대로 456',
            location: { lat: 37.5005, lng: 127.0368 },
            place_url: 'https://place.map.kakao.com/5555555555',
            distance: '200m',
            voteCount: 3
          }
        ];
        
        // 로딩 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setCandidates(mockCandidates);
      } catch (err) {
        setError('후보 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    getCandidates();
  }, []);

  const handleVote = async (restaurantId: string) => {
    try {
      // 실제로는 API 호출을 통해 투표 처리
      console.log('투표 처리:', restaurantId);
      
      // 임시로 투표 수 증가
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === restaurantId 
            ? { ...candidate, voteCount: candidate.voteCount + 1 }
            : candidate
        )
      );
    } catch (err) {
      console.error('투표 처리 중 오류:', err);
    }
  };

  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.candidate.title}</h2>
          </div>
        </div>
      </div>

      {/* 패널 바디 */}
      <div className={styles.panelBody}>
        {/* 로딩 상태 */}
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.LOADING}</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {/* 후보 결과 */}
        {!isLoading && !error && candidates.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>투표 후보 ({candidates.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {candidates.map((restaurant) => (
                <div key={restaurant.id} className={styles.candidateItem}>
                  <RestaurantCard
                    restaurant={restaurant}
                    className={styles.restaurantCard}
                  >
                    <ActionButtons
                      restaurantId={restaurant.id}
                      showVoteButton={true}
                      onVoteClick={handleVoteClick}
                      isVoted={(votedRestaurants as Set<string>).has(restaurant.id)}
                      voteCount={restaurant.voteCount || 0}
                    />
                  </RestaurantCard>
                  <button
                    onClick={() => handleVote(restaurant.id)}
                    className={styles.voteButton}
                  >
                    투표하기 ({restaurant.voteCount})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && candidates.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.candidate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePanel;
