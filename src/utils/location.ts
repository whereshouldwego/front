// src/utils/location.ts
import type { PlaceDetail, Restaurant } from '../types';

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
  
  export function placeDetailToRestaurant(d: PlaceDetail): Restaurant {
    console.log('[DEBUG] placeDetailToRestaurant 입력:', d);
    return {
      placeId: d.placeId,
      name: d.placeName,
      category: d.categoryDetail,
      phone: d.phone,
      location: {
        lat: parseFloat(d.y),
        lng: parseFloat(d.x),
        address: d.address,
        roadAddress: d.roadAddress,
      },
      place_url: d.kakaoUrl,
      menu: d.menu,
      mood: d.mood,
      feature: d.feature,
      purpose: d.purpose,
    };
  }
  