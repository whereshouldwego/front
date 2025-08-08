/**
 * SearchPanel.tsx
 *
 * 검색 패널 컴포넌트
 *
 * 기능:
 * - 검색 입력 필드
 * - 검색 결과 표시
 * - 로딩 및 에러 상태 처리
 */

import React, { useState, useEffect } from 'react';
import { EMPTY_MESSAGES, LOADING_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import type { Restaurant } from '../../types';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';

const SearchPanel: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const handleCandidateClick = (restaurantId: string) => {
    setCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(restaurantId)) {
        newSet.delete(restaurantId);
      } else {
        newSet.add(restaurantId);
      }
      return newSet;
    });
  };

  const handleFavoriteClick = (restaurantId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(restaurantId)) {
        newSet.delete(restaurantId);
      } else {
        newSet.add(restaurantId);
      }
      return newSet;
    });
  };

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Mock 데이터 로드
        const mockResults: Restaurant[] = [
          {
            id: 'search1',
            name: '스타벅스 강남점',
            category: '카페',
            distance: '100m',
            description: '강남역 근처 스타벅스',
            tags: ['카페', '커피'],
            location: {
              lat: 37.5002,
              lng: 127.0364,
              address: '서울 강남구 강남대로 123'
            },
            phone: '02-1234-5678',
            isFavorite: false,
            isCandidate: false
          },
          {
            id: 'search2',
            name: '맥도날드 강남점',
            category: '패스트푸드',
            distance: '200m',
            description: '강남역 근처 맥도날드',
            tags: ['패스트푸드', '햄버거'],
            location: {
              lat: 37.5005,
              lng: 127.0368,
              address: '서울 강남구 강남대로 456'
            },
            phone: '02-2345-6789',
            isFavorite: false,
            isCandidate: false
          },
          {
            id: 'search3',
            name: '맛있는 한식집',
            category: '한식',
            distance: '300m',
            description: '정갈한 한식과 친절한 서비스',
            tags: ['한식', '가정식'],
            location: {
              lat: 37.5008,
              lng: 127.0372,
              address: '서울 강남구 강남대로 789'
            },
            phone: '02-3456-7890',
            isFavorite: false,
            isCandidate: false
          }
        ];
        
        // 로딩 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSearchResults(mockResults);
      } catch (err) {
        setError('초기 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const mockResults: Restaurant[] = [
        {
          id: `search_${query}_1`,
          name: `${query} 맛집`,
          category: '한식',
          distance: '150m',
          description: `${query} 관련 맛집`,
          tags: ['한식', query],
          location: {
            lat: 37.5002,
            lng: 127.0364,
            address: '서울 강남구 강남대로 789'
          },
          phone: '02-3456-7890',
          isFavorite: false,
          isCandidate: false
        },
        {
          id: `search_${query}_2`,
          name: `${query} 카페`,
          category: '카페',
          distance: '250m',
          description: `${query} 관련 카페`,
          tags: ['카페', query],
          location: {
            lat: 37.5005,
            lng: 127.0368,
            address: '서울 강남구 강남대로 456'
          },
          phone: '02-4567-8901',
          isFavorite: false,
          isCandidate: false
        }
      ];
      
      // 로딩 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSearchResults(mockResults);
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      performSearch(inputValue);
    }
  };

  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.search.title}</h2>
          </div>
        </div>
      </div>

      {/* 패널 바디 */}
      <div className={styles.panelBody}>
        {/* 검색 폼 */}
        <form onSubmit={handleSearch} className={styles.searchField}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={PANEL_CONFIGS.search.searchPlaceholder}
            className={styles.searchInput}
          />
        </form>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{LOADING_MESSAGES.SEARCHING}</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {/* 검색 결과 */}
        {!isLoading && !error && searchResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>검색 결과 ({searchResults.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {searchResults.map((restaurant) => (
                <div key={restaurant.id} className={styles.searchItem}>
                  <RestaurantCard
                    restaurant={restaurant}
                    className={styles.restaurantCard}
                  >
                    <ActionButtons
                      restaurantId={restaurant.id}
                      showFavoriteButton={true}
                      showCandidateButton={true}
                      onFavoriteClick={handleFavoriteClick}
                      onCandidateClick={handleCandidateClick}
                      isFavorited={(favorites as Set<string>).has(restaurant.id)}
                      isCandidate={(candidates as Set<string>).has(restaurant.id)}
                    />
                  </RestaurantCard>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && searchResults.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.search}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;