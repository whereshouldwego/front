/**
 * AppContainer.tsx
 *
 * 앱 메인 컨테이너 컴포넌트
 */

import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import InitialScreen from '../initial/InitialScreen';
import RoomPage from '../room/RoomPage';
// [추가] 배경을 뷰포트 전체에 강제로 붙이기 위해 포털 사용
import { createPortal } from 'react-dom';


/* [추가] 뷰포트 전체 고정 배경 레이어를 body에 직접 렌더링 */
const BackgroundLayer: React.FC = () => {
  if (typeof document === 'undefined') return null; // SSR 안전 가드

  return createPortal(
    <div
      className="fixed inset-0 z-[0] pointer-events-none" // 화면 최상단에 고정(클릭 방해 X)
    >
      <div className="w-screen h-screen">
        {/* 화면을 꽉 채우기: object-cover (잘림 허용). 잘림 없이 보려면 contain 으로 변경 */}
        <img
          src="/images/map-background.png"
          alt="배경 지도"
          className="w-full h-full object-cover object-center block select-none"
          draggable={false}
        />
      </div>
    </div>,
    document.body
  );
};

// 앱 컨테이너 컴포넌트
const MainPage: React.FC = () => {
  return (
    <div className="relative">
      {/* [변경] 기존 내부 fixed 배경을 제거하고, 포털 기반 전역 배경 레이어로 교체 */}
      <BackgroundLayer /> {/* [추가] 뷰포트 전체에 깔리는 전역 배경 */}

      {/* 오버레이로 초기 화면 */}
      <div className="relative z-[10] pointer-events-auto">{/* [추가] 배경 위로 올려 보장 */}
        <InitialScreen />
      </div>
    </div>
  );
};

// 404 페이지 컴포넌트
const NotFoundPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">페이지를 찾을 수 없습니다</h2>
        <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          메인으로 돌아가기
        </a>
      </div>
    </div>
  );
};

// 라우팅 포함 앱 엔트리 (원본 유지)
const AppContainer: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/rooms/:roomCode" element={<RoomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default AppContainer;
