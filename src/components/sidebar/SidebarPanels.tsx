/**
 * SidebarPanels.tsx
 *
 * 사이드바 패널 컨테이너 컴포넌트
 *
 * 기능:
 * - 검색, 추천, 후보, 찜 패널들을 동적으로 렌더링
 * - 카카오맵 API를 통한 실시간 장소 검색
 * - 검색 결과를 지도에 마커로 표시
 * - 패널별 데이터 관리 및 상태 처리
 *
 * 패널 종류:
 * - search: 키워드 기반 장소 검색 (카카오맵 API)
 * - recommend: 추천 맛집 목록
 * - candidate: 투표 후보 맛집 목록
 * - favorite: 찜한 맛집 목록
 *
 * 검색 기능:
 * - 실시간 키워드 검색
 * - 검색 결과를 지도에 마커 표시
 * - 로딩 상태 및 에러 처리
 *
 * Props: 없음 (Context를 통해 상태 관리)
 *
 * 사용된 Context:
 * - SidebarContext: 패널 상태, 검색 결과, 로딩 상태
 *
 * API 연동:
 * - searchAPI: 카카오맵 API 검색
 * - 검색 결과를 지도 이벤트로 전달
 *
 * 스타일:
 * - CSS Modules 사용 (SidebarPanels.module.css)
 * - 반응형 디자인
 * - 스크롤바 숨김 처리
 */

import React, { useState } from 'react';
import { useSidebar } from '../../stores/SidebarContext'; // Updated import
import { restaurantData } from '../../data/restaurantData';
import type { RestaurantCardClickHandler, SidebarPanelConfig, Restaurant } from '../../types';
import RestaurantCard from '../ui/RestaurantCard';
import styles from './SidebarPanels.module.css';

// 기본 패널 설정
const defaultPanelConfigs: Record<string, SidebarPanelConfig> = {
  search: {
    title: 'Stroll Around',
    searchPlaceholder: '위치를 입력하세요',
    showSearchField: true
  },
  recommend: {
    title: '여기갈래 추천',
    searchPlaceholder: '음식 종류를 입력하세요',
    showSearchField: false
  },
  candidate: {
    title: '투표 후보',
    searchPlaceholder: '후보를 검색하세요',
    showSearchField: false
  },
  favorite: {
    title: '찜한 맛집',
    searchPlaceholder: '찜한 맛집을 검색하세요',
    showSearchField: false
  }
};

const SidebarPanels: React.FC = () => { // Simplified props
  const {
    activePanel,
    searchResults,
    searchLoading,
    searchError,
    recommendations,
    recommendLoading,
    recommendError,
    favorites,
    favoriteLoading,
    favoriteError,
    votes,
    voteLoading,
    voteError,
    performSearch // Using specific Kakao search function
  } = useSidebar();

  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  // 검색어 변경 핸들러
  const handleSearchChange = (panelType: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [panelType]: value
    }));
  };

  // 레스토랑 클릭 핸들러
  const handleRestaurantClick: RestaurantCardClickHandler = (restaurant) => {
    console.log('레스토랑 클릭:', restaurant);
    // 지도에 마커 표시 로직
    window.dispatchEvent(new CustomEvent('showRestaurantOnMap', {
      detail: { restaurant }
    }));
  };

  // 검색 제출 핸들러 (카카오맵 API 사용)
  const handleSearchSubmit = async (panelType: string) => {
    const searchTerm = searchTerms[panelType] || '';
    if (!searchTerm.trim()) return;

    // search 패널인 경우 카카오맵 API 검색 수행
    if (panelType === 'search') {
      await performSearch({
        query: searchTerm,
        location: 'current',
        category: '',
        limit: 15
      });
    }
  };

  // 패널 렌더링 함수
  const renderPanel = (panelType: string) => {
    const config = defaultPanelConfigs[panelType];
    if (!config) return null;

    let data: Restaurant[] = [];
    let loading = false;
    let error = '';

    // 패널별 데이터 설정
    switch (panelType) {
      case 'search':
        data = searchResults;
        loading = searchLoading;
        error = searchError || '';
        break;
      case 'recommend':
        data = recommendations;
        loading = recommendLoading;
        error = recommendError || '';
        break;
      case 'candidate':
        data = votes;
        loading = voteLoading;
        error = voteError || '';
        break;
      case 'favorite':
        data = favorites;
        loading = favoriteLoading;
        error = favoriteError || '';
        break;
      default:
        data = restaurantData.search || []; // 기본 데이터
    }

    return (
      <div className={styles.sidebarPanel}>
        {/* 패널 헤더 */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{config.title}</h2>
        </div>

        {/* 패널 본문 */}
        <div className={styles.panelBody}>
          {/* 검색 섹션 */}
          {config.showSearchField && (
            <div className={styles.searchSection}>
              <div className="relative">
                <input
                  type="text"
                  placeholder={config.searchPlaceholder}
                  value={searchTerms[panelType] || ''}
                  onChange={(e) => handleSearchChange(panelType, e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit(panelType)}
                  className={styles.searchInput}
                />
                <button
                  onClick={() => handleSearchSubmit(panelType)}
                  className={styles.searchButton}
                >
                  🔍
                </button>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorMessage}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          {/* 카드 컨테이너 */}
          <div className={styles.cardsContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <span className={styles.loadingText}>로딩 중...</span>
              </div>
            ) : data.length > 0 ? (
              <div className={styles.cardsList}>
                {data.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onClick={handleRestaurantClick}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}>📋</div>
                <p className={styles.emptyText}>
                  {panelType === 'search' && '검색 결과가 없습니다.'}
                  {panelType === 'recommend' && '추천할 맛집이 없습니다.'}
                  {panelType === 'candidate' && '투표 후보가 없습니다.'}
                  {panelType === 'favorite' && '찜한 맛집이 없습니다.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.sidebarPanel}>
      {activePanel ? renderPanel(activePanel) : renderPanel('search')}
    </div>
  );
};

export default SidebarPanels; 