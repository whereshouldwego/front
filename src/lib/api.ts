// API 서비스 파일
import type {
  ApiError,
  ApiResponse,
  ChatRequest,
  ChatResponse,
  FavoriteRequest,
  FavoriteResponse,
  LocationUpdateRequest,
  LocationUpdateResponse,
  RecommendRequest,
  RecommendResponse,
  SearchRequest,
  SearchResponse,
  VoteRequest,
  VoteResponse
} from '../types/index';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// 공통 API 요청 함수
async function apiRequest<T extends { success: boolean }>(
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
      } as ApiError;
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
    } as ApiError;
  }
}

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
export const isApiSuccess = <T extends { success: boolean }>(response: ApiResponse<T>): response is T => {
  return 'success' in response && response.success === true;
};

// API 에러인지 확인
export const isApiError = <T extends { success: boolean }>(response: ApiResponse<T>): response is ApiError => {
  return 'success' in response && response.success === false;
};

// 에러 메시지 추출
export const getErrorMessage = <T extends { success: boolean }>(response: ApiResponse<T>): string => {
  if (isApiError(response)) {
    return response.error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}; 