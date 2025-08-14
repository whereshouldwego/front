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

export interface Restaurant {
  placeId: number;
  name: string;
  category: string;
  distanceText?: string;
  description?: string;
  // tags?: string[];
  location: {
    lat: number;
    lng: number;
    address?: string | null;
    roadAddress?: string | null;
  };
  phone?: string;
  summary?: string;
  place_url?: string;
  reviewCount?: number;
  // isFavorite?: boolean;
  // isCandidate?: boolean;
}

// ✅ 백엔드 place 상세 응답 (LocalDetail = 서버 스키마)
export interface LocalDetail {
  id: number;                    // = placeId
  name?: string | null;
  categoryName?: string | null;
  phone?: string | null;
  address?: string | null;
  roadAddress?: string | null;
  lat?: number | null;           // 서버가 줄 수도/안 줄 수도 → optional
  lng?: number | null;
  aiSummary?: string | null;
}

export function localDetailToRestaurant(d: LocalDetail): Restaurant {
  return {
    placeId: d.id,
    name: d.name ?? `place #${d.id}`,
    category: d.categoryName ?? '',
    phone: d.phone ?? undefined,
    location: {
      lat: typeof d.lat === 'number' ? d.lat : Number.NaN,   // 좌표 미존재면 NaN (마커 만들 때 필터)
      lng: typeof d.lng === 'number' ? d.lng : Number.NaN,
      address: d.address ?? undefined,
      roadAddress: d.roadAddress ?? undefined,
    },
    summary: d.aiSummary ?? undefined,
  };
}

// ===== 카카오맵 관련 타입들 =====
// 가장 필요한 필드만 발췌
export interface KakaoDocument {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code?: string | null;
  category_group_name?: string | null;
  distance?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  x: string;
  y: string;    // lat
  place_url?: string;
}

export interface KakaoMeta {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
}
export interface KakaoMapApiResponse {
  documents: KakaoDocument[];
  meta: KakaoMeta;
}

export interface KakaoSearchRequest {
  query: string;
  category_group_code?: string;
  x?: string; y?: string; radius?: number; rect?: string;
  page?: number; size?: number; sort?: 'accuracy' | 'distance';
}
export interface KakaoCategorySearchRequest {
  category_group_code: string;
  x?: string; y?: string; radius?: number; rect?: string;
  page?: number; size?: number; sort?: 'accuracy' | 'distance';
}

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

//  Guest Login 
export interface GuestLoginResponse {
  userId: number;
  nickname: string;
  accessToken: string;
}

// Start Point
export interface UpdateStartPointBody {
  startLocation: string;
}
export interface StartPointInfo {
  userId: number;
  roomCode: string;
  startLocation: string;
}

// 레스토랑 관련 타입
export interface PlaceDetail {
  id: number;
  name: string;
  address: string;
  roadAddress: string;
  phone: string;
  aiSummary: string;
  categoryName: string;
  place_url: string;
}

// Chat History
export interface ChatMessage {
  id: string;
  roomCode: string;
  userId: number;
  username?: string;
  content: string;
  createdAt: string;     // ISO
  type?: 'user' | 'bot';
  timestamp?: string;
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

// 찜 요청 타입
export interface FavoriteCreateBody {
  userId: number;
  placeId: number;
}

// 찜 응답 타입
export interface FavoriteInfo {
  favoriteId: number;
  userId: number;
  placeId: number;
}

// 후보 조회 타입
export interface GetCandidateBody {
  roomCode: string;
}

// 후보 응답 타입
export interface CandidateHistoryItem {
  roomCode: string;
  place: PlaceDetail;
  votedUserIds: number[];
  voteCount: number;
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

// 레스토랑 상태 타입
export interface RestaurantWithStatus extends Restaurant {
  isFavorite: boolean;
  isCandidate: boolean;
  isVoted: boolean;
  voteCount: number;
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


// 백엔드 ensure-batch 요청 1건 스키마 
export interface PlaceEnsureBody {
  address_name?: string | null;
  category_group_code?: string | null;
  category_group_name?: string | null;
  category_name?: string | null;
  distance?: string | null;
  id: number;
  phone?: string | null;
  place_name: string;
  place_url?: string | null;
  road_address_name?: string | null;
  x?: number | null;
  y?: number | null;
}
// 백엔드 ensure-batch 응답 요약 
export interface EnsureBatchResult {
  created?: number;
  updated?: number;
  failed?: number;
}

export interface EnsureItem {
  id: number;
  name: string;
  place_url: string | null;
  x: number | null;
  y: number | null;
  address: string | null;
  roadAddress: string | null;
  phone: string | null;
  categoryCode: string | null;
  categoryName: string | null;
}

export interface EnsureBatchRequest {
  items: EnsureItem[];
}

// API 성공 타입
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

// API 에러 타입
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// API 응답 공통 타입
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
// ===== 상태 관리 타입들 =====

// 앱 전체 상태 타입
// export interface AppState {
//   user: {
//     id: string;
//     profile: UserProfile;
//     preferences: {
//       categories: string[];
//       priceRange: 'low' | 'medium' | 'high';
//       maxDistance: number;
//     };
//   };
//   search: {
//     query: string;
//     results: Restaurant[];
//     loading: boolean;
//     error?: string;
//   };
//   recommendations: {
//     items: Restaurant[];
//     loading: boolean;
//     error?: string;
//   };
//   favorites: {
//     items: Restaurant[];
//     loading: boolean;
//     error?: string;
//   };
//   votes: {
//     items: Restaurant[];
//     loading: boolean;
//     error?: string;
//   };
//   chat: {
//     messages: ChatMessage[];
//     loading: boolean;
//     error?: string;
//   };
// }

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

export interface RestaurantStore {
  favorites: Set<number>;
  favoriteIndex: Record<number, number>; // placeId -> favoriteId
  candidates: Set<number>;
  votedRestaurants: Set<number>;
  voteCounts: Record<number, number>;
  hydrateFavorites: (userId: number) => Promise<void>;
  hydrateCandidates: (roomCode: string) => Promise<void>;
  hydrateVotes: (roomCode: string) => Promise<void>;
  toggleFavorite: (placeId: number, userId: number) => Promise<void>;
  toggleCandidate: (placeId: number) => void;
  toggleVote: (placeId: number) => void;
  voteOnce: (placeId: number) => void;
  isFavorited: (placeId: number) => boolean;
  isCandidate: (placeId: number) => boolean;
  isVoted: (placeId: number) => boolean;
  getVoteCount: (placeId: number) => number;
  getFavorites: () => number[];
  getCandidates: () => number[];
  getVotedRestaurants: () => number[];
  resetState: () => void;
}
