/**
 * SearchPanel.tsx
 *
 * 검색 패널 컴포넌트
 *
 * 기능:
 * - 검색 입력 필드
 * - 검색 결과 표시
 * - 검색 히스토리
 * - 초기 위치 기반 주변 맛집 표시 (카페와 식당만)
 * - 로딩 및 에러 상태 처리
 */

import React, { useState, useEffect } from 'react';
import { PANEL_CONFIGS, LOADING_MESSAGES, EMPTY_MESSAGES } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import styles from './SidebarPanels.module.css';

interface SearchPanelProps {
  searchResults: any[];
  onSearchResultsChange: (results: any[]) => void;
}

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

const SearchPanel: React.FC<SearchPanelProps> = ({ searchResults, onSearchResultsChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showInitialResults, setShowInitialResults] = useState(true);

  // 컴포넌트 마운트 시 초기 위치 기반 검색 (카페와 식당만)
  useEffect(() => {
    const defaultCenter = { lat: 37.5002, lng: 127.0364 }; // 강남역 근처
    searchByLocation(defaultCenter);
  }, []);

  const searchByLocation = async (location: { lat: number; lng: number }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 실제 API 호출 대신 임시 데이터 사용
      const mockResults = [
        {
          id: '1',
          name: '스타벅스 강남점',
          category: '카페',
          category_group_code: 'CE7',
          category_group_name: '카페',
          phone: '02-1234-5678',
          address: '서울 강남구 강남대로 123',
          road_address: '서울 강남구 강남대로 123',
          location: { lat: 37.5002, lng: 127.0364 },
          place_url: 'https://place.map.kakao.com/1234567890',
          distance: '100m'
        },
        {
          id: '2',
          name: '맥도날드 강남점',
          category: '패스트푸드',
          category_group_code: 'FD6',
          category_group_name: '음식점',
          phone: '02-2345-6789',
          address: '서울 강남구 강남대로 456',
          road_address: '서울 강남구 강남대로 456',
          location: { lat: 37.5005, lng: 127.0368 },
          place_url: 'https://place.map.kakao.com/2345678901',
          distance: '200m'
        }
      ];
      
      onSearchResultsChange(mockResults);
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 실제 API 호출 대신 임시 데이터 사용
      const mockResults = [
        {
          id: '3',
          name: `${query} 맛집`,
          category: '한식',
          category_group_code: 'FD6',
          category_group_name: '음식점',
          phone: '02-3456-7890',
          address: '서울 강남구 강남대로 789',
          road_address: '서울 강남구 강남대로 789',
          location: { lat: 37.5002, lng: 127.0364 },
          place_url: 'https://place.map.kakao.com/3456789012',
          distance: '150m'
        }
      ];
      
      onSearchResultsChange(mockResults);
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = (query: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== query);
      return [query, ...filtered].slice(0, 10); // 최대 10개 유지
    });
  };

  const removeFromHistory = (query: string) => {
    setSearchHistory(prev => prev.filter(item => item !== query));
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  const clearSearch = () => {
    onSearchResultsChange([]);
    setInputValue('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      performSearch(inputValue);
      addToHistory(inputValue);
      setShowInitialResults(false);
    }
  };

  const handleHistoryClick = (query: string) => {
    setInputValue(query);
    performSearch(query);
    setShowInitialResults(false);
  };

  const handleClearHistory = () => {
    clearHistory();
  };

  const handleRemoveHistory = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeFromHistory(query);
  };

  const handleClearSearch = () => {
    clearSearch();
    setShowInitialResults(true);
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

        {/* 검색 히스토리 */}
        {searchHistory.length > 0 && !inputValue && showInitialResults && (
          <div className={styles.searchHistory}>
            <div className={styles.historyHeader}>
              <span>최근 검색어</span>
              <button onClick={handleClearHistory} className={styles.clearHistoryButton}>
                전체 삭제
              </button>
            </div>
            <div className={styles.historyList}>
              {searchHistory.map((query, index) => (
                <div
                  key={index}
                  className={styles.historyItem}
                  onClick={() => handleHistoryClick(query)}
                >
                  <span>{query}</span>
                  <button
                    onClick={(e) => handleRemoveHistory(e, query)}
                    className={styles.removeHistoryButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* 초기 위치 기반 결과 (카페와 식당만) */}
        {!isLoading && !error && showInitialResults && searchResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>주변 식사자리 ({searchResults.length}개)</span>
            </div>
            <div className={styles.restaurantCards}>
              {searchResults.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  className={styles.restaurantCard}
                >
                  <ActionButtons
                    restaurantId={restaurant.id}
                    showFavoriteButton={true}
                    showCandidateButton={true}
                    onFavoriteClick={handleFavoriteClick}
                    onCandidateClick={handleCandidateClick}
                    isFavorited={favorites.has(restaurant.id)}
                    isCandidate={candidates.has(restaurant.id)}
                  />
              </RestaurantCard>
              ))}
            </div>
          </div>
        )}

        {/* 검색 결과 */}
        {!isLoading && !error && !showInitialResults && searchResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>검색 결과 ({searchResults.length}개)</span>
              <button onClick={handleClearSearch} className={styles.clearSearchButton}>
                초기화
              </button>
            </div>
            <div className={styles.restaurantCards}>
              {searchResults.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  className={styles.restaurantCard}
                />
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !error && !showInitialResults && inputValue && searchResults.length === 0 && (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.search}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
