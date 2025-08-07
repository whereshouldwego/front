/**
 * index.ts
 *
 * 사이드바 컴포넌트 인덱스 파일
 *
 * 기능:
 * - 사이드바 관련 컴포넌트들을 한 곳에서 export
 * - 깔끔한 import 경로 제공
 *
 * 사용법:
 * ```tsx
 * import { Sidebar, SearchPanel, RecommendPanel } from '@/components/sidebar';
 * ```
 */

// 메인 컴포넌트
export { default as Sidebar } from './Sidebar';
export { default as SidebarPanels } from './SidebarPanels';

// 개별 패널 컴포넌트
export { default as SearchPanel } from '../sidebar/SearchPanel';
export { default as RecommendPanel } from '../sidebar/RecommendPanel';
export { default as CandidatePanel } from '../sidebar/CandidatePanel';
export { default as FavoritePanel } from '../sidebar/FavoritePanel'; 