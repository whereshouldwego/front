/**
 * Sidebar.tsx
 * 
 * 기존 파일: src/backup/SidebarToggle.html
 * 변환 내용:
 * - 사이드바 토글 기능을 React state로 관리
 * - 닫힌 사이드바: 로고, 검색, 추천, 후보, 찜 버튼들
 * - 열린 사이드바: 패널 영역 (SidebarPanels.html에서 로드되던 내용)
 * - 반응형 디자인 적용
 * 
 * 기존 CSS: src/backup/SidebarToggle.css, SidebarPanels.css
 * - 사이드바 너비: 90px (닫힌 상태), 397px (열린 상태)
 * - transition 효과
 * - 반응형 breakpoint 적용
 */

import React, { useState } from 'react';
import { useSidebar } from '../../stores/SidebarContext';
import type { SidebarButtonConfig, SidebarButtonType } from '../../types';
import KakaoLoginModal from '../auth/KakaoLoginModal';
import styles from './Sidebar.module.css';
import SidebarPanels from './SidebarPanels';

// Sidebar 컴포넌트 props 인터페이스
interface SidebarProps {
  logoUrl?: string;
  logoAlt?: string;
  logoWidth?: number;
  logoHeight?: number;
  buttons?: SidebarButtonConfig[];
  onLogoClick?: () => void;
  onButtonClick?: (buttonType: SidebarButtonType) => void;
  className?: string;
}

// 기본 버튼 설정
const defaultButtons: SidebarButtonConfig[] = [
  {
    type: 'search',
    label: '검색',
    baseIcon: '/images/search-base.png',
    selectedIcon: '/images/search-selected.png',
    position: 0
  },
  {
    type: 'recommend',
    label: '추천',
    baseIcon: '/images/matdol-base.png',
    selectedIcon: '/images/matdol-selected.png',
    position: 52.5 // 75px * 0.7
  },
  {
    type: 'candidate',
    label: '후보',
    baseIcon: '/images/vote-base.png',
    selectedIcon: '/images/vote-selected.png',
    position: 105 // 150px * 0.7
  },
  {
    type: 'favorite',
    label: '찜',
    baseIcon: '/images/jjim-base.png',
    selectedIcon: '/images/jjim-selected.png',
    position: 157.5 // 225px * 0.7
  }
];

const Sidebar: React.FC<SidebarProps> = ({
  logoUrl = '/images/logo.png',
  logoAlt = '로고',
  logoWidth = 28,
  logoHeight = 28,
  buttons = defaultButtons,
  onLogoClick,
  onButtonClick,
  className = ''
}) => {
  const { isExpanded, toggleSidebar, setActivePanel, activePanel } = useSidebar();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
      setActivePanel('');
    }
    onLogoClick?.();
  };

  const getButtonImage = (buttonType: SidebarButtonType) => {
    const button = buttons.find(btn => btn.type === buttonType);
    if (!button) return '/images/search-base.png';
    
    const isActive = activePanel === buttonType;
    return isActive ? button.selectedIcon : button.baseIcon;
  };

  const getSliderPosition = () => {
    if (!activePanel) {
      return 'translateY(-150px)'; // 로고 클릭 시 슬라이더를 화면 밖으로 이동
    }
    
    const button = buttons.find(btn => btn.type === activePanel);
    return button ? `translateY(${button.position}px)` : 'translateY(-100px)';
  };

  const handleLoginSuccess = (userData: any) => {
    console.log('로그인 성공:', userData);
    // 여기에 로그인 성공 후 처리 로직 추가
  };

  return (
    <div className={`${styles.sidebarToggleContainer} ${className}`}>
      {/* 닫힌 사이드바 (고정) */}
      <div className={`${styles.sidebarClosed} ${!isExpanded ? 'block' : 'hidden'}`}>
        <div className={styles.logo} onClick={handleLogoClick}>
          <img 
            src={logoUrl} 
            alt={logoAlt} 
            width={logoWidth} 
            height={logoHeight} 
          />
        </div>
        
        {/* 동적으로 버튼들 렌더링 */}
        {buttons.map((button) => (
          <div 
            key={button.type}
            className={`${styles.toggleBtnClosed} ${activePanel === button.type ? styles.active : ''}`} 
            onClick={() => openSidebarWithPanel(button.type)}
          >
            <img 
              src={getButtonImage(button.type)} 
              alt={button.label} 
              width={20} 
              height={20} 
              className={styles.btnIcon} 
            />
            <span className={styles.btnText}>{button.label}</span>
          </div>
        ))}
        
        {/* 카카오톡 로그인 버튼 */}
        <div 
          className={`${styles.toggleBtnClosed} ${styles.loginButton}`}
          onClick={() => setIsLoginModalOpen(true)}
        >
          <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 7.955c.084.13.084.27 0 .4-.084.13-.252.195-.42.195H9.42c-.168 0-.336-.065-.42-.195-.084-.13-.084-.27 0-.4.084-.13.252-.195.42-.195h8.067c.168 0 .336.065.42.195z"/>
          </svg>
          <span className={styles.btnText}>로그인</span>
        </div>
        
        <div 
          className={styles.toggleSlider} 
          style={{ transform: getSliderPosition() }}
        ></div>
      </div>
      
      {/* 열린 사이드바 (패널만 슬라이드) */}
      <div className={`${styles.sidebarOpened} ${isExpanded ? styles.visible : ''}`}>
        <div className={styles.sidebarContent}>
          {/* 오른쪽 패널 영역 (슬라이드) */}
          <div className={styles.sidebarPanels}>
            <SidebarPanels />
          </div>
        </div>
      </div>

      {/* 카카오톡 로그인 모달 */}
      <KakaoLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default Sidebar; 