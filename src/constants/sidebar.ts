/**
 * sidebar.ts
 *
 * 사이드바 관련 상수 정의
 *
 * 기능:
 * - 패널 설정 상수
 * - 버튼 설정 상수 (아이콘 경로 포함)
 * - API 관련 상수
 * - 스타일 관련 상수
 * - 메시지 상수
 */

import type { SidebarButtonConfig, SidebarPanelConfig } from '../types';

// 패널 타입 정의
export const PANEL_TYPES = {
  SEARCH: 'search',
  RECOMMEND: 'recommend',
  CANDIDATE: 'candidate',
  FAVORITE: 'favorite'
} as const;

// 패널 설정
export const PANEL_CONFIGS: Record<string, SidebarPanelConfig> = {
  [PANEL_TYPES.SEARCH]: {
    title: '여기갈래 검색',
    searchPlaceholder: '위치를 입력하세요',
    showSearchField: true
  },
  [PANEL_TYPES.RECOMMEND]: {
    title: '여기갈래 추천',
    searchPlaceholder: '음식 종류를 입력하세요',
    showSearchField: false
  },
  [PANEL_TYPES.CANDIDATE]: {
    title: '투표 후보',
    searchPlaceholder: '후보를 검색하세요',
    showSearchField: false
  },
  [PANEL_TYPES.FAVORITE]: {
    title: '찜한 맛집',
    searchPlaceholder: '찜한 맛집을 검색하세요',
    showSearchField: false
  }
} as const;

// 버튼 설정 (아이콘 경로 포함)
export const BUTTON_CONFIGS: SidebarButtonConfig[] = [
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

// 패널별 데이터 키 매핑
export const PANEL_DATA_KEYS = {
  [PANEL_TYPES.SEARCH]: {
    dataKey: 'searchResults',
    loadingKey: 'searchLoading',
    errorKey: 'searchError'
  },
  [PANEL_TYPES.RECOMMEND]: {
    dataKey: 'recommendations',
    loadingKey: 'recommendLoading',
    errorKey: 'recommendError'
  },
  [PANEL_TYPES.CANDIDATE]: {
    dataKey: 'votes',
    loadingKey: 'voteLoading',
    errorKey: 'voteError'
  },
  [PANEL_TYPES.FAVORITE]: {
    dataKey: 'favorites',
    loadingKey: 'favoriteLoading',
    errorKey: 'favoriteError'
  }
} as const;

// 사이드바 크기 설정
export const SIDEBAR_SIZES = {  
  COLLAPSED_WIDTH: '63px',
  EXPANDED_WIDTH: '229px',
  TRANSITION_DURATION: '0.3s',
  BUTTON_HEIGHT: '52.5px',
  BUTTON_SPACING: '52.5px',
} as const;

// 검색 관련 상수
export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 15,
  MAX_LIMIT: 45,
  DEBOUNCE_DELAY: 300,
  DEFAULT_LOCATION: 'current',
  DEFAULT_CATEGORY: ''
} as const;

// API 관련 상수
export const API_CONFIG = {
  KAKAO_SEARCH_URL: 'https://dapi.kakao.com/v2/local/search/keyword.json',
  KAKAO_CATEGORY_URL: 'https://dapi.kakao.com/v2/local/search/category.json',
  DEFAULT_RADIUS: 5000, // 5km
  MAX_RADIUS: 50000 // 50km
} as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  SEARCH_EMPTY: '검색어를 입력해주세요.',
  SEARCH_FAILED: '검색 중 오류가 발생했습니다.',
  API_KEY_MISSING: '카카오 API 키가 설정되지 않았습니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  NO_RESULTS: '검색 결과가 없습니다.',
  LOGIN_REQUIRED: '로그인 후 이용해주세요.',
} as const;

// 로딩 메시지
export const LOADING_MESSAGES = {
  SEARCHING: '검색 중...',
  LOADING: '로딩 중...',
  FETCHING: '데이터를 가져오는 중...'
} as const;

// 빈 상태 메시지
export const EMPTY_MESSAGES = {
  [PANEL_TYPES.SEARCH]: '검색 결과가 없습니다.',
  [PANEL_TYPES.RECOMMEND]: '추천할 맛집이 없습니다.',
  [PANEL_TYPES.CANDIDATE]: '투표 후보가 없습니다.',
  [PANEL_TYPES.FAVORITE]: '찜한 맛집이 없습니다.'
} as const;

// 로고 설정
export const LOGO_CONFIG = {
  URL: '/images/logo.png',
  ALT: '로고',
  WIDTH: 28,
  HEIGHT: 28
} as const;

// 기본 검색 요청 설정
export const DEFAULT_SEARCH_REQUEST = {
  location: SEARCH_CONFIG.DEFAULT_LOCATION,
  category: SEARCH_CONFIG.DEFAULT_CATEGORY,
  limit: SEARCH_CONFIG.DEFAULT_LIMIT
} as const; 