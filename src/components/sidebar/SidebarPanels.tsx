/**
 * SidebarPanels.tsx
 *
 * 사이드바 패널 라우터 컴포넌트
 *
 * 기능:
 * - 활성 패널에 따른 적절한 패널 컴포넌트 렌더링
 * - 패널 간 전환 관리
 * - 일관된 패널 구조 제공
 *
 * 패널 종류:
 * - SearchPanel: 검색 패널
 * - RecommendPanel: 추천 패널
 * - CandidatePanel: 후보 패널
 * - FavoritePanel: 찜 패널
 */

import React from 'react';
import type { SidebarButtonType } from '../../types';
import SearchPanel from './SearchPanel';
import RecommendPanel from './RecommendPanel';
import CandidatePanel from './CandidatePanel';
import FavoritePanel from './FavoritePanel';
import styles from './SidebarPanels.module.css';

interface SidebarPanelsProps {
  activePanel: SidebarButtonType;
  searchResults: any[];
  onSearchResultsChange: (results: any[]) => void;
}

const SidebarPanels: React.FC<SidebarPanelsProps> = ({ 
  activePanel, 
  searchResults, 
  onSearchResultsChange 
}) => {
  // 활성 패널에 따른 컴포넌트 렌더링
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'search':
        return (
          <SearchPanel 
            searchResults={searchResults}
            onSearchResultsChange={onSearchResultsChange}
          />
        );
      case 'recommend':
        return <RecommendPanel />;
      case 'candidate':
        return <CandidatePanel />;
      case 'favorite':
        return <FavoritePanel />;
      default:
        return (
          <SearchPanel 
            searchResults={searchResults}
            onSearchResultsChange={onSearchResultsChange}
          />
        ); // 기본값
    }
  };

  return (
    <div className={`${styles.sidebarPanel} ${styles.active}`}>
      {renderActivePanel()}
    </div>
  );
};

export default SidebarPanels; 