// src/utils/location.ts
import type { LocalDetail, Restaurant } from '../types';

export async function getStartLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('브라우저가 위치 정보를 지원하지 않습니다.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }
  
  export function localDetailToRestaurant(d: LocalDetail): Restaurant {
    return {
      placeId: d.id,
      name: d.name ?? `place #${d.id}`,
      category: d.categoryName ?? '',      // ← 필수 string 보정
      phone: d.phone ?? undefined,
      location: {
        lat: typeof d.lat === 'number' ? d.lat : Number.NaN, // ← number 보정
        lng: typeof d.lng === 'number' ? d.lng : Number.NaN, // ← number 보정
        address: d.address ?? undefined,
        roadAddress: d.roadAddress ?? undefined,
      },
      summary: d.aiSummary ?? undefined,
      description: d.aiSummary ?? undefined,
    };
  }
  