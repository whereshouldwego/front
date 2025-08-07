/**
 * Sidebar.tsx
 *
 * 사이드바 메인 컴포넌트
 *
 * 기능:
 * - 사이드바 토글 버튼
 * - 패널 전환 버튼들
 * - 패널 컨테이너
 * - 반응형 디자인
 * - 내부 상태 관리 (Context 제거)
 */

import React, { useState } from 'react';
import { BUTTON_CONFIGS, LOGO_CONFIG } from '../../constants/sidebar';
import type { SidebarButtonType } from '../../types';
import styles from './Sidebar.module.css';
import SidebarPanels from './SidebarPanels';

interface SidebarProps {
  onExpandedChange?: (expanded: boolean) => void;
  onLogoClick?: () => void;
  onButtonClick?: (buttonType: SidebarButtonType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onExpandedChange,
  onLogoClick,
  onButtonClick,
 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<SidebarButtonType>('search');

  const toggleSidebar = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  };

  const openSidebarWithPanel = (panel: SidebarButtonType) => {
    setActivePanel(panel);
    if (!isExpanded) {
      toggleSidebar();
    }
    onButtonClick?.(panel);
  };

  const handleLogoClick = () => {
    if (!isExpanded) {
      // 닫혀있는 상태에서 로고 클릭 시 search 패널 열기
      openSidebarWithPanel('search');
    } else {
      // 열려있는 상태에서 로고 클릭 시 사이드바 닫기
      toggleSidebar();
      setActivePanel('' as any);
    }
    onLogoClick?.();
  };

  const buttons = BUTTON_CONFIGS;
  const getSliderPosition = () => {
    if (!activePanel) {
      return 'translateY(-300px)';
    }
    
    const button = buttons.find(btn => btn.type === activePanel);
    return button ? `translateY(${button.position}px)` : 'translateY(-100px)';
  };

  return (
    <div className={styles.sidebarToggleContainer}>
      {/* 축소된 사이드바 */}
      <div className={styles.sidebarClosed}>
        {/* 로고 */}
        <div className={styles.logo} onClick={handleLogoClick}>
          <img 
            src={LOGO_CONFIG.URL} 
            alt={LOGO_CONFIG.ALT}
            width={LOGO_CONFIG.WIDTH}
            height={LOGO_CONFIG.HEIGHT}
          />
        </div>

        {/* 버튼들 */}
        {BUTTON_CONFIGS.map((button) => (
          <button
            key={button.type}
            className={`${styles.toggleBtnClosed} ${
              activePanel === button.type ? styles.active : ''
            }`}
            onClick={() => openSidebarWithPanel(button.type)}
          >
            <img
              src={activePanel === button.type ? button.selectedIcon : button.baseIcon}
              alt={button.label}
              className={styles.btnIcon}
            />
            <span className={styles.btnText}>{button.label}</span>
          </button>
        ))}

        {/* 토글 슬라이더 */}
        <div 
          className={styles.toggleSlider}
          style={{ transform: getSliderPosition() }}></div>
        </div>

      {/* 확장된 사이드바 */}
      <div className={`${styles.sidebarOpened} ${isExpanded ? styles.visible : ''}`}>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarPanels}>
            <SidebarPanels 
              activePanel={activePanel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 