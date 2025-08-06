/**
 * search.ts
 *
 * 검색 관련 유틸리티 함수들
 *
 * 기능:
 * - 검색어 유효성 검사
 * - 검색 결과 필터링
 * - 거리 계산
 * - 검색어 정규화
 * - 디바운스 함수
 */

export const isValidSearchQuery = (query: string): boolean => {
  return query.trim().length >= 2;
};

export const normalizeSearchQuery = (query: string): string => {
  return query.trim().toLowerCase();
};

export const sanitizeSearchQuery = (query: string): string => {
  return query.trim().replace(/[<>]/g, '');
};

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export const sortByDistance = <T extends { location: { lat: number; lng: number } }>(
  items: T[],
  userLat: number,
  userLng: number
): T[] => {
  return [...items].sort((a, b) => {
    const distanceA = calculateDistance(userLat, userLng, a.location.lat, a.location.lng);
    const distanceB = calculateDistance(userLat, userLng, b.location.lat, b.location.lng);
    return distanceA - distanceB;
  });
};

export const sortByRating = <T extends { rating: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => b.rating - a.rating);
};

export const filterByCategory = <T extends { category: string }>(
  items: T[],
  category: string
): T[] => {
  if (!category) return items;
  return items.filter(item => 
    item.category.toLowerCase().includes(category.toLowerCase())
  );
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  let lastResult: any;
  let lastRan: number;

  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastResult);
      lastResult = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

export class SearchHistory {
  private static readonly STORAGE_KEY = 'search_history';
  private static readonly MAX_ITEMS = 10;

  static add(query: string): void {
    if (!query.trim()) return;
    
    const history = this.get();
    const normalizedQuery = query.trim().toLowerCase();
    
    // 중복 제거
    const filteredHistory = history.filter(item => 
      item.toLowerCase() !== normalizedQuery
    );
    
    // 새 검색어를 맨 앞에 추가
    const newHistory = [query.trim(), ...filteredHistory];
    
    // 최대 개수 제한
    const limitedHistory = newHistory.slice(0, this.MAX_ITEMS);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedHistory));
  }

  static get(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static remove(query: string): void {
    const history = this.get();
    const filteredHistory = history.filter(item => 
      item.toLowerCase() !== query.toLowerCase()
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredHistory));
  }
} 