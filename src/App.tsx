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
import AppContainer from './components/layout/AppContainer';
import './App.css';

function App() {
  return <AppContainer />;
}

export default App;