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
}

const SidebarPanels: React.FC<SidebarPanelsProps> = ({ activePanel }) => {
  const userId = Number(localStorage.getItem('userId') || 0); // 예시
  const roomCode = 'ROOM-123'; // 예시: 상위에서 가져오세요
  const center = undefined;    // 지도 센터 있으면 넣기
  // 활성 패널에 따른 컴포넌트 렌더링
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'search':
        return <SearchPanel roomCode={roomCode} center={center} userId={userId} />;
      case 'recommend':
        return <RecommendPanel />;
      case 'candidate':
        return <CandidatePanel />;
      case 'favorite':
        return <FavoritePanel userId={userId} />;
      default:
        return <SearchPanel />;
    }
  };

  return (
    <div className={`${styles.sidebarPanel} ${styles.active}`}>
      {renderActivePanel()}
    </div>
  );
};

export default SidebarPanels; 