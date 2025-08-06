// src/data/restaurantData.ts

import type { Restaurant } from '../types';

export const restaurantData: Record<string, Restaurant[]> = {
  search: [
    {
      id: 'search-1',
      name: '강남 한식당',
      category: '한식',
      rating: 4.5,
      price: '1-2만원',
      distance: '0.3km',
      description: '전통 한식의 맛을 느낄 수 있는 곳',
      tags: ['한식', '전통', '가족식당'],
      location: {
        lat: 37.5002,
        lng: 127.0364,
        address: '서울 강남구 역삼동 123-45'
      }
    },
    {
      id: 'search-2',
      name: '이탈리안 키친',
      category: '양식',
      rating: 4.3,
      price: '2-3만원',
      distance: '0.5km',
      description: '정통 이탈리안 파스타와 피자',
      tags: ['양식', '파스타', '피자'],
      location: {
        lat: 37.5010,
        lng: 127.0370,
        address: '서울 강남구 역삼동 234-56'
      }
    },
    {
      id: 'search-3',
      name: '스시로',
      category: '일식',
      rating: 4.7,
      price: '3-5만원',
      distance: '0.8km',
      description: '신선한 회와 초밥',
      tags: ['일식', '회', '초밥'],
      location: {
        lat: 37.5020,
        lng: 127.0380,
        address: '서울 강남구 역삼동 345-67'
      }
    }
  ],
  recommend: [
    {
      id: 'rec-1',
      name: '맛돌 추천 맛집',
      category: '퓨전',
      rating: 4.8,
      price: '2-4만원',
      distance: '0.2km',
      description: 'AI가 추천하는 최고의 맛집',
      tags: ['퓨전', '추천', '인기'],
      location: {
        lat: 37.4990,
        lng: 127.0350,
        address: '서울 강남구 역삼동 456-78'
      }
    },
    {
      id: 'rec-2',
      name: '오늘의 특별 메뉴',
      category: '한식',
      rating: 4.6,
      price: '1.5-2.5만원',
      distance: '0.4km',
      description: '매일 바뀌는 특별 메뉴',
      tags: ['한식', '특별메뉴', '신선'],
      location: {
        lat: 37.5015,
        lng: 127.0375,
        address: '서울 강남구 역삼동 567-89'
      }
    },
    {
      id: 'rec-3',
      name: '분위기 좋은 카페',
      category: '카페',
      rating: 4.4,
      price: '1-2만원',
      distance: '0.6km',
      description: '커피와 디저트가 맛있는 곳',
      tags: ['카페', '커피', '디저트'],
      location: {
        lat: 37.5025,
        lng: 127.0390,
        address: '서울 강남구 역삼동 678-90'
      }
    }
  ],
  candidate: [
    {
      id: 'cand-1',
      name: '투표 후보 1호',
      category: '중식',
      rating: 4.2,
      price: '2-3만원',
      distance: '0.3km',
      description: '투표를 기다리는 맛집',
      tags: ['중식', '투표후보', '인기'],
      location: {
        lat: 37.5005,
        lng: 127.0368,
        address: '서울 강남구 역삼동 789-12'
      }
    },
    {
      id: 'cand-2',
      name: '투표 후보 2호',
      category: '한식',
      rating: 4.0,
      price: '1.5-2.5만원',
      distance: '0.7km',
      description: '투표를 기다리는 맛집',
      tags: ['한식', '투표후보', '전통'],
      location: {
        lat: 37.5030,
        lng: 127.0395,
        address: '서울 강남구 역삼동 890-23'
      }
    },
    {
      id: 'cand-3',
      name: '투표 후보 3호',
      category: '양식',
      rating: 4.1,
      price: '3-4만원',
      distance: '0.4km',
      description: '투표를 기다리는 맛집',
      tags: ['양식', '투표후보', '고급'],
      location: {
        lat: 37.5018,
        lng: 127.0385,
        address: '서울 강남구 역삼동 901-34'
      }
    }
  ],
  favorite: [
    {
      id: 'fav-1',
      name: '내가 찜한 맛집 1',
      category: '한식',
      rating: 4.9,
      price: '2-3만원',
      distance: '0.1km',
      description: '정말 맛있는 한식집',
      tags: ['한식', '찜', '인기'],
      location: {
        lat: 37.4995,
        lng: 127.0355,
        address: '서울 강남구 역삼동 012-45'
      }
    },
    {
      id: 'fav-2',
      name: '내가 찜한 맛집 2',
      category: '일식',
      rating: 4.7,
      price: '4-6만원',
      distance: '0.2km',
      description: '정말 맛있는 일식집',
      tags: ['일식', '찜', '고급'],
      location: {
        lat: 37.5008,
        lng: 127.0372,
        address: '서울 강남구 역삼동 123-56'
      }
    },
    {
      id: 'fav-3',
      name: '내가 찜한 맛집 3',
      category: '양식',
      rating: 4.5,
      price: '3-5만원',
      distance: '0.3km',
      description: '정말 맛있는 양식집',
      tags: ['양식', '찜', '로맨틱'],
      location: {
        lat: 37.5022,
        lng: 127.0388,
        address: '서울 강남구 역삼동 234-67'
      }
    }
  ]
}; 