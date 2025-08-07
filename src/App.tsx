/**
 * App.tsx
 * 
 * 기존 파일: src/App.tsx (Vite 기본 템플릿)
 * 변환 내용:
 * - 기존 Vite 기본 템플릿을 맛돌이 앱으로 교체
 * - AppContainer 컴포넌트를 메인 앱으로 사용
 * - 전체 앱 레이아웃 적용
 * - 라우터 설정 추가 (방 생성/참여 시스템)
 */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InitialScreen from './components/initial/InitialScreen';
import RoomPage from './components/room/RoomPage';
import AppContainer from './components/layout/AppContainer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 메인 페이지 - 방 생성/참여 선택 */}
          <Route path="/" element={
            <div className="relative">
              {/* 배경으로 서비스 화면 */}
              <div className="fixed inset-0">
                <AppContainer roomId="DEMO01" />
              </div>
              {/* 오버레이로 초기 화면 */}
              <InitialScreen />
            </div>
          } />
          
          {/* 방 페이지 - 실제 서비스 */}
          <Route path="/rooms/:roomCode" element={<RoomPage />} />
          
          {/* 404 페이지 */}
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">페이지를 찾을 수 없습니다</h2>
                <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  메인으로 돌아가기
                </a>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;