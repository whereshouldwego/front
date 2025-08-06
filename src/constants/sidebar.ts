/**
 * sidebar.ts
 *
 * 사이드바 관련 상수 정의
 *
 * 기능:
 * - 패널 설정 상수
 * - 버튼 설정 상수
 * - API 관련 상수
 * - 스타일 관련 상수
 */

// 패널 타입 정의
export const PANEL_TYPES = {
  SEARCH: 'search',
  RECOMMEND: 'recommend',
  CANDIDATE: 'candidate',
  FAVORITE: 'favorite'
} as const;

// 패널 설정
export const PANEL_CONFIGS = {
  [PANEL_TYPES.SEARCH]: {
    title: 'Stroll Around',
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

// 패널 버튼 설정
export const PANEL_BUTTONS = [
  { 
    id: PANEL_TYPES.SEARCH, 
    icon: '🔍', 
    label: '검색',
    description: '키워드로 맛집 검색'
  },
  { 
    id: PANEL_TYPES.RECOMMEND, 
    icon: '⭐', 
    label: '추천',
    description: '여기갈래 추천 맛집'
  },
  { 
    id: PANEL_TYPES.CANDIDATE, 
    icon: '🗳️', 
    label: '후보',
    description: '투표 후보 맛집'
  },
  { 
    id: PANEL_TYPES.FAVORITE, 
    icon: '❤️', 
    label: '찜',
    description: '찜한 맛집 목록'
  }
] as const;

// 사이드바 크기 설정
export const SIDEBAR_SIZES = {
  COLLAPSED_WIDTH: '63px',
  EXPANDED_WIDTH: '229px',
  TRANSITION_DURATION: '0.3s'
} as const;

// 검색 관련 상수
export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 15,
  MAX_LIMIT: 45,
  DEBOUNCE_DELAY: 300
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
  NO_RESULTS: '검색 결과가 없습니다.'
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