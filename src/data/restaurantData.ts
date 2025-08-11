// src/data/restaurantData.ts

import type { Restaurant } from '../types';

export const restaurantData: Record<string, Restaurant[]> = {
  search: [
    {
      placeId: 123456,
      name: '강남 한식당',
      category: '한식',
      distanceText: '0.3km',
      description: '전통 한식의 맛을 느낄 수 있는 곳',
      location: {
        lat: 37.5002,
        lng: 127.0364,
        address: '서울 강남구 역삼동 123-45'
      },
      phone: '02-1234-5678',
      summary: '전통 한식의 맛을 느낄 수 있는 곳',
      reviewCount: 100,
    },
    {
      placeId: 123457,
      name: '이탈리안 키친',
      category: '양식',
      distanceText: '0.5km',
      description: '정통 이탈리안 파스타와 피자',
      location: {
        lat: 37.5010,
        lng: 127.0370,
        address: '서울 강남구 역삼동 234-56'
      },
      phone: '02-2345-6789',
      summary: '정통 이탈리안 파스타와 피자',
      reviewCount: 100,
    },
    {
      placeId: 123458,
      name: '스시로',
      category: '일식',
      distanceText: '0.8km',
      description: '신선한 회와 초밥',
      location: {
        lat: 37.5020,
        lng: 127.0380,
        address: '서울 강남구 역삼동 345-67'
      },
      phone: '02-3456-7890',
      summary: '신선한 회와 초밥',
      reviewCount: 100,
    }
  ],
  recommend: [
    {
      placeId: 123459,
      name: '맛돌 추천 맛집',
      category: '퓨전',
      distanceText: '0.2km',
      description: 'AI가 추천하는 최고의 맛집',
      location: {
        lat: 37.4990,
        lng: 127.0350,
        address: '서울 강남구 역삼동 456-78'
      },
      phone: '02-4567-8901',
      summary: 'AI가 추천하는 최고의 맛집',
      reviewCount: 100,
    },
    {
      placeId: 123460,
      name: '오늘의 특별 메뉴',
      category: '한식',
      distanceText: '0.4km',
      description: '매일 바뀌는 특별 메뉴',
      location: {
        lat: 37.5015,
        lng: 127.0375,
        address: '서울 강남구 역삼동 567-89'
      },
      phone: '02-5678-9012',
      summary: '매일 바뀌는 특별 메뉴',
      reviewCount: 100,
    },
    {
      placeId: 123461,
      name: '분위기 좋은 카페',
      category: '카페',
      distanceText: '0.6km',
      description: '커피와 디저트가 맛있는 곳',
      location: {
        lat: 37.5025,
        lng: 127.0390,
        address: '서울 강남구 역삼동 678-90'
      },
      phone: '02-6789-0123',
      summary: '커피와 디저트가 맛있는 곳',
      reviewCount: 100,
    }
  ],
  candidate: [
    {
      placeId: 123462,
      name: '투표 후보 1호',
      category: '중식',
      distanceText: '0.3km',
      description: '투표 후보로 선정된 맛집',
      location: {
        lat: 37.5005,
        lng: 127.0368,
        address: '서울 강남구 역삼동 789-01'
      },
      phone: '02-7890-1234',
      summary: '투표 후보로 선정된 맛집',
      reviewCount: 100,
    },
    {
      placeId: 123463,
      name: '투표 후보 2호',
      category: '양식',
      distanceText: '0.7km',
      description: '투표 후보로 선정된 맛집',
      location: {
        lat: 37.5030,
        lng: 127.0395,
        address: '서울 강남구 역삼동 890-12'
      },
      phone: '02-8901-2345',
      summary: '투표 후보로 선정된 맛집',
      reviewCount: 100,
    }
  ],
  favorite: [
    {
      placeId: 123464,
      name: '찜한 맛집 1',
      category: '한식',
      distanceText: '0.4km',
      description: '사용자가 찜한 맛집',
      location: {
        lat: 37.5012,
        lng: 127.0372,
        address: '서울 강남구 역삼동 901-23'
      },
      phone: '02-9012-3456',
      summary: '사용자가 찜한 맛집',
      reviewCount: 100,
    },
    {
      placeId: 123465,
      name: '찜한 맛집 2',
      category: '카페',
      distanceText: '0.5km',
      description: '사용자가 찜한 카페',
      location: {
        lat: 37.5018,
        lng: 127.0378,
        address: '서울 강남구 역삼동 012-34'
      },
      phone: '02-0123-4567',
      summary: '사용자가 찜한 카페',
      reviewCount: 100,
    }
  ]
}; 