/**
 * SidebarPanels.tsx
 *
 * 패널 라우팅 컴포넌트
 * - SearchPanel 외 패널은 기존 구조 유지
 * - roomCode/center/userId는 실제 상위(RoomPage/Sidebar)에서 주입하는 것을 권장
 *   (여기선 하드코딩 대신 최소한의 예시만 남김)
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
  // TODO: 실제 앱에선 상위에서 내려받아 사용
  const userId = Number(localStorage.getItem('userId') || 0);
  const roomCode = localStorage.getItem('roomCode') || undefined;
  const center = undefined;

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'search':
        return <SearchPanel roomCode={roomCode} center={center} userId={userId} />;
      case 'recommend':
        return <RecommendPanel userId={userId} />;
      case 'candidate':
        return <CandidatePanel roomCode={roomCode} userId={userId} />;
      case 'favorite':
        return <FavoritePanel userId={userId} />;
      default:
        return <SearchPanel roomCode={roomCode} center={center} userId={userId} />;
    }
  };

  return <div className={`${styles.sidebarPanel} ${styles.active}`}>{renderActivePanel()}</div>;
};

export default SidebarPanels;
