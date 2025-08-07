// API 서비스 파일
import type {
  Restaurant,
  SearchRequest,
  SearchResponse,
  RecommendRequest,
  RecommendResponse,
  FavoriteRequest,
  FavoriteResponse,
  VoteRequest,
  VoteResponse,
  ChatRequest,
  ChatResponse,
  LocationUpdateRequest,
  LocationUpdateResponse,
  PlaceApiResponse,
  ApiResponse,
  ApiError,
  KakaoMapApiResponse,
  KakaoSearchRequest,
  KakaoCategorySearchRequest,
  MapCenter
} from '../types';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_REST_API_KEY;

// ===== 공통 API 요청 함수들 =====

// 백엔드 API 요청 함수
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: data.message || 'API 요청 실패',
          details: data,
        },
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '네트워크 오류가 발생했습니다.',
        details: error,
      },
    };
  }
}

// 카카오맵 API 요청 함수
async function kakaoApiRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  if (!KAKAO_API_KEY) {
    throw new Error('카카오맵 API 키가 설정되지 않았습니다.');
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  const url = `https://dapi.kakao.com/v2/local${endpoint}?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`카카오맵 API 요청 실패: ${response.status}`);
  }

  return response.json();
}

// ===== 카카오맵 API =====

// 카카오맵 API 관련 함수들
export const kakaoMapAPI = {
  // 키워드 검색
  searchByKeyword: async (params: KakaoSearchRequest): Promise<KakaoMapApiResponse> => {
    const queryParams = new URLSearchParams({
      query: params.query,
      ...(params.category_group_code && { category_group_code: params.category_group_code }),
      ...(params.x && { x: params.x }),
      ...(params.y && { y: params.y }),
      ...(params.radius && { radius: params.radius.toString() }),
      ...(params.rect && { rect: params.rect }),
      ...(params.page && { page: params.page.toString() }),
      ...(params.size && { size: params.size.toString() }),
      ...(params.sort && { sort: params.sort })
    });

    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${queryParams}`, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`카카오맵 API 오류: ${response.status}`);
    }

    return response.json();
  },

  // 카테고리 검색 (기존 시그니처 유지)
  searchByCategory: async (
    categoryGroupCode: string,
    x?: string,
    y?: string,
    radius: number = 5000,
    page: number = 1,
    size: number = 15
  ): Promise<KakaoMapApiResponse> => {
    const queryParams = new URLSearchParams({
      category_group_code: categoryGroupCode,
      ...(x && { x }),
      ...(y && { y }),
      radius: radius.toString(),
      page: page.toString(),
      size: size.toString()
    });

    const response = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${queryParams}`, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`카카오맵 API 오류: ${response.status}`);
    }

    return response.json();
  },

  // 새로운 카테고리 검색 함수 (객체 파라미터)
  searchByCategoryWithParams: async (request: KakaoCategorySearchRequest): Promise<KakaoMapApiResponse> => {
    const queryParams = new URLSearchParams({
      category_group_code: request.category_group_code,
      ...(request.x && { x: request.x }),
      ...(request.y && { y: request.y }),
      ...(request.radius && { radius: request.radius.toString() }),
      ...(request.rect && { rect: request.rect }),
      ...(request.page && { page: request.page.toString() }),
      ...(request.size && { size: request.size.toString() }),
      ...(request.sort && { sort: request.sort })
    });

    const response = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${queryParams}`, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`카카오맵 API 오류: ${response.status}`);
    }

    return response.json();
  },

  // 주소로 좌표 검색 (주소-좌표 변환)
  searchAddress: async (address: string): Promise<any> => {
    return kakaoApiRequest('/search/address.json', {
      query: address,
      analyze_type: 'similar'
    });
  },

  // 좌표로 주소 검색 (좌표-주소 변환)
  searchCoord2Address: async (x: string, y: string): Promise<any> => {
    return kakaoApiRequest('/geo/coord2address.json', {
      x,
      y,
      input_coord: 'WGS84'
    });
  }
};

// ===== 백엔드 Place API =====

export const placeAPI = {
  // 장소 상세 정보 조회 (카드 클릭 시 사용)
  getPlaceById: async (placeId: string): Promise<ApiResponse<PlaceApiResponse>> => {
    return apiRequest<PlaceApiResponse>(`/places/${placeId}`, {
      method: 'GET',
    });
  },

  // 장소 정보 생성/업데이트
  createOrUpdatePlace: async (request: any): Promise<ApiResponse<PlaceApiResponse>> => {
    return apiRequest<PlaceApiResponse>('/places', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 장소 검색 (백엔드)
  searchPlaces: async (query: string, location?: string): Promise<ApiResponse<PlaceApiResponse>> => {
    return apiRequest<PlaceApiResponse>(`/places/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        ...(location && { 'Location': location }),
      },
    });
  },
};

// 카카오맵 결과를 Restaurant 타입으로 변환
const convertKakaoDocumentToRestaurant = (doc: any): Restaurant => {
  return {
    id: doc.id,
    name: doc.place_name,
    category: doc.category_name,
    distance: doc.distance ? `${(parseInt(doc.distance) / 1000).toFixed(1)}km` : '거리 정보 없음',
    description: '맛있는 맛집입니다.', // 기본값
    tags: [], // 기본값
    location: {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      address: doc.address_name
    },
    phone: doc.phone,
    isFavorite: false,
    isCandidate: false
  };
};

// 통합 검색 API
export const integratedSearchAPI = {
  // 키워드 검색 및 데이터 보강
  searchAndEnrich: async (query: string, center?: MapCenter, filter?: any): Promise<Restaurant[]> => {
    try {
      // 키워드 검색 (카페와 식당만)
      const searchResponse = await kakaoMapAPI.searchByKeyword({
        query,
        x: center?.lng?.toString(),
        y: center?.lat?.toString(),
        radius: filter?.radius ? filter.radius * 1000 : 5000,
        size: 15,
        sort: filter?.sort || 'accuracy'
      });
      
      // 카카오맵 결과를 Restaurant 타입으로 변환
      const restaurants = searchResponse.documents.map(convertKakaoDocumentToRestaurant);
      
      return restaurants;
    } catch (error) {
      console.error('통합 검색 실패:', error);
      return [];
    }
  },

  // 위치 기반 검색 (초기 검색용)
  searchByLocation: async (center: MapCenter, filter?: any): Promise<Restaurant[]> => {
    try {
      const restaurants: Restaurant[] = [];
      
      // 식당 검색
      const restaurantResponse = await kakaoMapAPI.searchByCategoryWithParams({
        category_group_code: 'FD6', // 음식점
        x: center.lng.toString(),
        y: center.lat.toString(),
        radius: filter?.radius ? filter.radius * 1000 : 3000,
        size: 10,
        sort: 'distance'
      });
      
      restaurants.push(...restaurantResponse.documents.map(convertKakaoDocumentToRestaurant));
      
      // 카페 검색
      const cafeResponse = await kakaoMapAPI.searchByCategoryWithParams({
        category_group_code: 'CE7', // 카페
        x: center.lng.toString(),
        y: center.lat.toString(),
        radius: filter?.radius ? filter.radius * 1000 : 3000,
        size: 10,
        sort: 'distance'
      });
      
      restaurants.push(...cafeResponse.documents.map(convertKakaoDocumentToRestaurant));
      
      return restaurants;
    } catch (error) {
      console.error('위치 기반 검색 실패:', error);
      return [];
    }
  }
};

// ===== 검색 관련 API =====

export const searchAPI = {
  // 레스토랑 검색
  search: async (request: SearchRequest): Promise<ApiResponse<SearchResponse>> => {
    return apiRequest<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 카테고리별 검색
  searchByCategory: async (category: string, location?: string): Promise<ApiResponse<SearchResponse>> => {
    return apiRequest<SearchResponse>(`/search/category/${category}`, {
      method: 'GET',
      headers: {
        'Location': location || '',
      },
    });
  },
};

// ===== 추천 관련 API =====

export const recommendAPI = {
  // 개인화 추천
  getRecommendations: async (request: RecommendRequest): Promise<ApiResponse<RecommendResponse>> => {
    return apiRequest<RecommendResponse>('/recommend', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 인기 추천
  getPopular: async (location: string): Promise<ApiResponse<RecommendResponse>> => {
    return apiRequest<RecommendResponse>(`/recommend/popular`, {
      method: 'GET',
      headers: {
        'Location': location,
      },
    });
  },
};

// ===== 찜하기 관련 API =====

export const favoriteAPI = {
  // 찜하기 추가/제거
  toggleFavorite: async (request: FavoriteRequest): Promise<ApiResponse<FavoriteResponse>> => {
    return apiRequest<FavoriteResponse>('/favorites', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 찜한 목록 조회
  getFavorites: async (userId: string): Promise<ApiResponse<FavoriteResponse>> => {
    return apiRequest<FavoriteResponse>(`/favorites/${userId}`, {
      method: 'GET',
    });
  },
};

// ===== 투표 관련 API =====

export const voteAPI = {
  // 투표하기/취소
  toggleVote: async (request: VoteRequest): Promise<ApiResponse<VoteResponse>> => {
    return apiRequest<VoteResponse>('/votes', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 투표 결과 조회
  getVoteResults: async (): Promise<ApiResponse<VoteResponse>> => {
    return apiRequest<VoteResponse>('/votes/results', {
      method: 'GET',
    });
  },
};

// ===== 채팅 관련 API =====

export const chatAPI = {
  // 채팅 메시지 전송
  sendMessage: async (request: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return apiRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 채팅 히스토리 조회
  getHistory: async (userId: string): Promise<ApiResponse<ChatResponse>> => {
    return apiRequest<ChatResponse>(`/chat/history/${userId}`, {
      method: 'GET',
    });
  },
};

// ===== 위치 관련 API =====

export const locationAPI = {
  // 사용자 위치 업데이트
  updateLocation: async (request: LocationUpdateRequest): Promise<ApiResponse<LocationUpdateResponse>> => {
    return apiRequest<LocationUpdateResponse>('/location', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  // 현재 위치 기반 검색
  searchNearby: async (lat: number, lng: number, radius: number = 5): Promise<ApiResponse<SearchResponse>> => {
    return apiRequest<SearchResponse>(`/search/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {
      method: 'GET',
    });
  },
};

// ===== 유틸리티 함수들 =====

// API 응답이 성공인지 확인
export const isApiSuccess = <T>(response: ApiResponse<T>): response is { success: true; data: T } => {
  return response.success === true;
};

// API 에러인지 확인
export const isApiError = <T>(response: ApiResponse<T>): response is { success: false; error: ApiError } => {
  return response.success === false;
};

// 에러 메시지 추출
export const getErrorMessage = <T>(response: ApiResponse<T>): string => {
  if (isApiError(response)) {
    return response.error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}; 