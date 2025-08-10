// API 서비스 파일
import type {
  Restaurant,
  ChatRequest,
  ChatResponse,
  LocationUpdateRequest,
  LocationUpdateResponse,
  ApiResponse,
  ApiError,
  KakaoMapApiResponse,
  KakaoSearchRequest,
  KakaoCategorySearchRequest,
  MapCenter,
  PlaceDetail,
  FavoriteCreateBody,
  FavoriteInfo,
  CandidateHistoryItem,
} from '../types';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_REST_API_KEY;

// ===== 공통 유틸: 안전 JSON 파서 =====
async function safeJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ===== 공통 API 요청 함수들 =====

// 백엔드 API 요청 함수
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API REQ] ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body as string) : '');
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await safeJson<ApiResponse<T>>(response);
    console.log(`[API RES] ${response.status} ${url}`, data);

    if (!response.ok) {
      const message =
        (data as any)?.error?.message ||
        (data as any)?.message ||
        `API 요청 실패 (${response.status})`;
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message,
          details: data ?? null,
        },
      };
    }
    // 서버가 {success:true,data} 형태를 반환한다고 가정.
    // 만약 서버가 순수 데이터만 반환한다면 여기서 래핑.
    if (data && typeof (data as any).success === 'boolean') {
      return data as ApiResponse<T>;
    }
    return { success: true, data: (data as unknown as T) ?? (null as T) };
  } catch (error) {
    console.error(`[API ERR] ${endpoint}`, error);
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
  /** GET /api/places/{placeId} */
  getPlaceById: async (placeId: number): Promise<ApiResponse<PlaceDetail>> => {
    return apiRequest<PlaceDetail>(`/api/places/${placeId}`, { method: 'GET' });
  },
};

// 카카오맵 결과를 Restaurant 타입으로 변환
const toRestaurant = (doc: any): Restaurant => ({
  placeId: Number(doc.id),
  name: doc.place_name,
  category: doc.category_name,
  distanceText: doc.distance ? `${(Number(doc.distance) / 1000).toFixed(1)}km` : '거리 정보 없음',
  location: { lat: Number(doc.y), lng: Number(doc.x), address: doc.address_name, roadAddress: doc.road_address_name },
  phone: doc.phone,
  summary: doc.aiSummary,
  description: doc.aiSummary ?? undefined,
});

// 통합 검색 API
export const integratedSearchAPI = {
  // 키워드 검색 및 데이터 보강
  searchAndEnrich: async (
    query: string,
    center?: MapCenter,
    opts?: { roomCode?: string }
  ): Promise<Restaurant[]> => {
    try {
      // 1) 후보 제외용 집합
      let excluded = new Set<number>();
      if (opts?.roomCode) {
        const hist = await candidateAPI.history(opts.roomCode);
        if (hist.success) excluded = new Set(hist.data.map(i => Number(i.place.id)));
      }

      // 2) 카카오에서 10개
      const kakao = await kakaoMapAPI.searchByKeyword({
        query,
        category_group_code: 'FD6',
        x: center?.lng ? String(center.lng) : undefined,
        y: center?.lat ? String(center.lat) : undefined,
        size: 10,
        sort: center ? 'distance' : 'accuracy',
      });

      // 3) 후보 제외
      const docs = kakao.documents.filter(d => !excluded.has(Number(d.id)));

      // 4) 백엔드 상세 보강
      const base = docs.map(toRestaurant);
      const enriched = await Promise.all(
        base.map(async (r) => {
          const detail = await placeAPI.getPlaceById(r.placeId);
          if (detail.success) {
            const d = detail.data;
            return {
              ...r,
              name: d.name || r.name,
              category: d.categoryName || r.category,
              phone: d.phone || r.phone,
              location: {
                ...r.location,
                address: d.address ?? r.location.address,
                roadAddress: d.roadAddress ?? r.location.roadAddress,
              },
              summary: d.aiSummary,
              description: d.aiSummary ?? undefined,
            } as Restaurant;
          }
          return r;
        })
      );
      return enriched;
    } catch (e) {
      console.warn('[integratedSearchAPI] 실패:', e);
      return [];
    }
  },

  /** 위치 기반(초기) + 보강 */
  searchByLocation: async (
    center: MapCenter,
    opts?: { roomCode?: string; radiusKm?: number }
  ): Promise<Restaurant[]> => {
    try {
      let excluded = new Set<number>();
      if (opts?.roomCode) {
        const hist = await candidateAPI.history(opts.roomCode);
        if (hist.success) excluded = new Set(hist.data.map(i => Number(i.place.id)));
      }

      const kakao = await kakaoMapAPI.searchByCategoryWithParams({
        category_group_code: 'FD6',
        x: String(center.lng),
        y: String(center.lat),
        radius: (opts?.radiusKm ?? 3) * 1000,
        size: 10,
        sort: 'distance',
      });

      const docs = kakao.documents.filter(d => !excluded.has(Number(d.id)));
      const base = docs.map(toRestaurant);

      const enriched = await Promise.all(
        base.map(async (r) => {
          const detail = await placeAPI.getPlaceById(r.placeId);
          if (detail.success) {
            const d = detail.data;
            return {
              ...r,
              name: d.name || r.name,
              category: d.categoryName || r.category,
              phone: d.phone || r.phone,
              location: { ...r.location, address: d.address, roadAddress: d.roadAddress },
              summary: d.aiSummary,
              description: d.aiSummary || r.description,
            } as Restaurant;
          }
          return r;
        })
      );
      return enriched;
    } catch (e) {
      console.warn('[integratedSearchAPI] 위치 기반 실패:', e);
      return [];
    }
  },
};

// ===== 찜하기 관련 API =====
export const favoriteAPI = {
  /** POST /api/favorites  body:{ userId, placeId } */
  create: async (body: FavoriteCreateBody): Promise<ApiResponse<FavoriteInfo>> => {
    return apiRequest<FavoriteInfo>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** GET /api/favorites/{userId} */
  listByUser: async (userId: number): Promise<ApiResponse<FavoriteInfo[]>> => {
    return apiRequest<FavoriteInfo[]>(`/api/favorites/${userId}`, { method: 'GET' });
  },

  /** DELETE /api/favorites/{favoriteId} */
  remove: async (favoriteId: number): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
  },
};

// ===== 후보 관련 API =====
export const candidateAPI = {
  /** GET /api/candidate/history/{roomCode} */
  history: async (roomCode: string): Promise<ApiResponse<CandidateHistoryItem[]>> => {
    return apiRequest<CandidateHistoryItem[]>(`/api/candidate/history/${encodeURIComponent(roomCode)}`, {
      method: 'GET',
    });
  },

  /** (참고) 후보 생성/삭제 엔드포인트는 현재 스웨거 캡쳐에 없음 (추후 명세 확인 요망) */
  // createCandidate: ... // (추후 명세 확인 요망)
  // deleteCandidate: ... // (추후 명세 확인 요망)
};

// ===== 투표 관련 API =====

export const voteAPI = {
  // POST /api/votes, DELETE /api/votes/{voteId} 등은 아직 스웨거 미정
  // (추후 명세 확인 요망)
};

// ===== 채팅 관련 API =====

export const chatAPI = {
  // 채팅 메시지 전송
  sendMessage: async (request: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return apiRequest<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // 채팅 히스토리 조회
  getHistory: async (userId: number): Promise<ApiResponse<ChatResponse>> => {
    return apiRequest<ChatResponse>(`/api/chat/history/${userId}`, {
      method: 'GET',
    });
  },
};

// ===== 위치 관련 API =====

export const locationAPI = {
  // 사용자 위치 업데이트
  updateLocation: async (request: LocationUpdateRequest): Promise<ApiResponse<LocationUpdateResponse>> => {
    return apiRequest<LocationUpdateResponse>('/api/location', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  // 현재 위치 기반 검색
  searchNearbyLocal: async (lat: number, lng: number, radiusKm = 5) => {
    const items = await integratedSearchAPI.searchByLocation({ lat, lng }, { radiusKm });
    return { success: true, data: items } as const;
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