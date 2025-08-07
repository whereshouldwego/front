// 공통 타입 정의

// 사이드바 버튼 타입
export type SidebarButtonType = 'search' | 'recommend' | 'candidate' | 'favorite';

// 사이드바 버튼 설정
export interface SidebarButtonConfig {
  type: SidebarButtonType;
  label: string;
  baseIcon: string;
  selectedIcon: string;
  position: number; // 슬라이더 위치 (px)
}

// 채팅 메시지 타입
export type MessageType = 'bot' | 'user';

// 채팅 메시지 인터페이스
export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

// 사용자 프로필 인터페이스
export interface UserProfile {
  id: string;
  name: string;
  location: string;
  avatarColor: string;
  isCurrentUser?: boolean;
}

// 지도 오버레이 설정
export interface MapOverlayConfig {
  showDepartureSearch: boolean;
  departureLocation: string;
  currentLocationButtonText: string;
}

// 레스토랑 카드 클릭 핸들러
export type RestaurantCardClickHandler = (restaurant: Restaurant) => void;

// 사이드바 패널 설정
export interface SidebarPanelConfig {
  title: string;
  searchPlaceholder: string;
  showSearchField: boolean;
}

// 컴포넌트 공통 props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// ===== 카카오맵 API 관련 타입들 =====

// 카카오맵 전역 타입
declare global {
  interface Window {
    kakao: any;
  }
}

// 카카오맵 API 응답 타입
export interface KakaoMapApiResponse {
  meta: {
    same_name: {
      region: string[];
      keyword: string;
      selected_region: string;
    } | null;
    pageable_count: number;
    total_count: number;
    is_end: boolean;
  };
  documents: KakaoPlaceDocument[];
}

// 카카오맵 장소 문서 타입
export interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
}
// 카카오맵 검색 요청 타입
export interface KakaoSearchRequest {
  query: string;
  x?: string;
  y?: string;
  radius?: number;
  rect?: string;
  page?: number;
  size?: number;
  sort?: 'accuracy' | 'distance';
  category_group_code?: string;
}

// 카카오맵 카테고리 검색 요청 타입
export interface KakaoCategorySearchRequest {
  category_group_code: string; // 카테고리 그룹 코드
  x?: string; // 경도
  y?: string; // 위도
  radius?: number; // 반경 (미터)
  rect?: string; // 사각형 영역
  page?: number;
  size?: number;
  sort?: 'accuracy' | 'distance';
}

// 카카오맵 카테고리 그룹 코드
export type KakaoCategoryGroupCode = 
  | 'FD6' // 음식점
  | 'CE7' // 카페
  | 'AD5' // 숙박
  | 'CS2' // 편의점
  | 'SC4' // 학교
  | 'HP8' // 병원
  | 'PM9' // 약국
  | 'AT4' // 관광명소
  | 'SW8' // 지하철역
  | 'PK6' // 주차장
  | 'OL7' // 주유소
  | 'MT1' // 대형마트
  | 'AG2' // 중개업소
  | 'PO3' // 공공기관
  | 'CT1' // 문화시설
  | 'PS3' // 유치원
  | 'AC5' // 학원
  | 'BB1' // 은행
  | 'SP2' // 스포츠시설
  | 'PK1' // 주차장
  | 'LD5' // 숙박
  | 'HP1' // 병원
  | 'PM1' // 약국
  | 'SW1' // 지하철역
  | 'OL1' // 주유소
  | 'MT1' // 대형마트
  | 'AG1' // 중개업소
  | 'PO1' // 공공기관
  | 'CT1' // 문화시설
  | 'PS1' // 유치원
  | 'AC1' // 학원
  | 'BB1' // 은행
  | 'SP1'; // 스포츠시설

// 카테고리 필터 타입
export type CategoryFilter = 'all' | 'restaurant' | 'cafe';

// 검색 필터 인터페이스
export interface SearchFilter {
  category: CategoryFilter;
  radius?: number; // km
  sort?: 'accuracy' | 'distance';
}

// ===== 백엔드 Place API 관련 타입들 =====

// 백엔드 Place API 응답 타입
export interface PlaceApiResponse {
  success: boolean;
  data: PlaceDetail;
  message?: string;
}

// AI 요약 정보 타입(백엔드에서 제공하는 정보)
export interface AiSummary {
  menu: string[];
  mood: string[];
  feature: string[];
  purpose: string[];
}

// 장소 상세 정보 인터페이스
export interface PlaceDetail {
  id: number;
  name: string;
  category: string;
  categoryGroup: string;
  phone: string;
  address: string;
  roadAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  placeUrl: string;
  // 백엔드에서 제공하는 추가 정보
  reviewCount?: number;
  ai_summary?: AiSummary; // AI 요약 정보
  tags?: string[]; // 태그 정보
}

// Place API 요청 타입
export interface PlaceRequest {
  kakaoPlaceId: string;
  name: string;
  category: string;
  categoryGroup: string;
  phone: string;
  address: string;
  roadAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  placeUrl: string;
}

// 지도 중심점
export interface MapCenter {
  lat: number;
  lng: number;
}

// 지도 마커 정보
export interface MapMarker {
  id: string;
  position: MapCenter;
  title: string;
  category?: string;
  restaurant?: Restaurant;
}

// 지도 설정
export interface MapConfig {
  center: MapCenter;
  level: number;
  draggable: boolean;
  zoomable: boolean;
  scrollwheel: boolean;
}

// 지도 이벤트 핸들러
export interface MapEventHandlers {
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (markerId: string) => void;
  onMapDragEnd?: (center: MapCenter) => void;
  onMapZoomChanged?: (level: number) => void;
}

// ===== API 요청/응답 타입들 =====

// 레스토랑 관련 타입
export interface Restaurant {
  id: string;
  name: string;
  category: string;
  distance: string;
  description: string;
  tags: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  phone: string;
  isFavorite: boolean;
  isCandidate: boolean;
  summary?: AiSummary;
  reviewCount?: number;
  placeUrl?: string;
  category_group_code?: string;
  category_group_name?: string;
  address?: string;
  road_address?: string;
  place_url?: string;
  voteCount?: number;
}

// 검색 요청 타입
export interface SearchRequest {
  query?: string; // 키워드 검색 시에만 사용
  location?: string;
  category?: CategoryFilter;
  radius?: number; // km
  limit?: number;
  center?: MapCenter; // 지도 중심점
  filter?: SearchFilter; // 검색 필터
}

// 검색 응답 타입
export interface SearchResponse {
  success: boolean;
  data: Restaurant[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

export interface VoteInfo {
  voteId: string;
  roomId: string;
  userId: string;
  placeId: string;
}

export interface FavoriteInfo {
  favoriteId: string;
  userId: string;
  placeId: string;
}

export interface RecommendationInfo {
  recommendationId: string;
  roomId: string;
  placeId: string;
}

export interface CandidateInfo {
  candidateId: string;
  roomId: string;
  placeId: string;
}

// 채팅 요청 타입
export interface ChatRequest {
  userId: string;
  message: string;
  context?: {
    location?: string;
    preferences?: string[];
    history?: ChatMessage[];
  };
}

// 채팅 응답 타입
export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    suggestions?: string[];
    restaurants?: Restaurant[];
  };
  message?: string;
}

// 사용자 위치 업데이트 요청 타입
export interface LocationUpdateRequest {
  userId: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// 사용자 위치 업데이트 응답 타입
export interface LocationUpdateResponse {
  success: boolean;
  data: {
    location: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  message?: string;
}

// API 에러 타입
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// API 응답 공통 타입
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

// ===== 상태 관리 타입들 =====

// 앱 전체 상태 타입
export interface AppState {
  user: {
    id: string;
    profile: UserProfile;
    preferences: {
      categories: string[];
      priceRange: 'low' | 'medium' | 'high';
      maxDistance: number;
    };
  };
  search: {
    query: string;
    results: Restaurant[];
    loading: boolean;
    error?: string;
  };
  recommendations: {
    items: Restaurant[];
    loading: boolean;
    error?: string;
  };
  favorites: {
    items: Restaurant[];
    loading: boolean;
    error?: string;
  };
  votes: {
    items: Restaurant[];
    loading: boolean;
    error?: string;
  };
  chat: {
    messages: ChatMessage[];
    loading: boolean;
    error?: string;
  };
}

// ===== 유틸리티 타입들 =====

// 로딩 상태 타입
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 페이지네이션 타입
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 필터 옵션 타입
export interface FilterOptions {
  categories: string[];
  priceRanges: string[];
  ratings: number[];
  distances: number[];
} 