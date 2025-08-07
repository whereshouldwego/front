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
  currentLocationButtonText?: string;
  showCurrentLocationButton?: boolean;
}

// MapOverlay props 인터페이스에 추가
export interface MapOverlayProps {
  users?: UserProfile[];
  config?: MapOverlayConfig;
  onDepartureSubmit?: (location: string) => void;
  onDepartureCancel?: () => void;
  onUserProfileClick?: (userId: string) => void;
  // ✅ 새로 추가
  onCurrentLocationSearch?: (center: MapCenter) => void;
  showCurrentLocationButton?: boolean;
  className?: string;
}

// 레스토랑 카드 클릭 핸들러
export type RestaurantCardClickHandler = (restaurantId: string) => void;

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

// ===== 카카오맵 관련 타입들 =====

// 카카오맵 전역 타입
declare global {
  interface Window {
    kakao: any;
  }
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
  rating: number;
  price: string;
  distance: string;
  description?: string;
  tags?: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images?: string[];
  phone?: string;
  hours?: string;
  isFavorite?: boolean;
}

// 검색 요청 타입
export interface SearchRequest {
  query: string;
  location?: string;
  category?: string;
  priceRange?: 'low' | 'medium' | 'high';
  radius?: number; // km
  limit?: number;
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

// 추천 요청 타입
export interface RecommendRequest {
  userId: string;
  location: string;
  preferences?: {
    categories?: string[];
    priceRange?: 'low' | 'medium' | 'high';
    rating?: number;
  };
  limit?: number;
}

// 추천 응답 타입
export interface RecommendResponse {
  success: boolean;
  data: Restaurant[];
  reason: string;
  message?: string;
}

// 찜하기 요청 타입
export interface FavoriteRequest {
  userId: string;
  restaurantId: string;
  action: 'add' | 'remove';
}

// 찜하기 응답 타입
export interface FavoriteResponse {
  success: boolean;
  data: {
    isFavorite: boolean;
    favoriteCount: number;
  };
  message?: string;
}

// 투표 요청 타입
export interface VoteRequest {
  userId: string;
  restaurantId: string;
  action: 'vote' | 'unvote';
}

// 투표 응답 타입
export interface VoteResponse {
  success: boolean;
  data: {
    voteCount: number;
    hasVoted: boolean;
  };
  message?: string;
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
export type ApiResponse<T> = T | ApiError;

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