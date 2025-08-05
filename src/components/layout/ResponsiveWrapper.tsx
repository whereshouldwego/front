/**
 * ResponsiveWrapper.tsx
 *
 * 반응형 래퍼 컴포넌트
 *
 * 기능:
 * - 반응형 디자인을 위한 래퍼
 * - 화면 크기에 따른 레이아웃 조정
 * - 모바일/태블릿/데스크톱 대응
 *
 * Props:
 * - children: 자식 컴포넌트들
 * - className: 추가 CSS 클래스
 */

import React, { type ReactNode } from 'react';

interface ResponsiveWrapperProps {
  children: ReactNode;
  className?: string;
}

const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`responsive-wrapper ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveWrapper; 