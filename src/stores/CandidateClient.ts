import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import type { RestaurantWithStatus } from '../types';
import { useRestaurantStore } from './RestaurantStore';

type CandidateActionType = 'ADD_PLACE' | 'REMOVE_PLACE' | 'ADD_VOTE' | 'REMOVE_VOTE';

export interface CandidatePlaceResponse {
  id: number;                    // 백엔드: id (Long)
  name?: string | null;          // 백엔드: name (String)
  kakaoUrl?: string | null;      // 백엔드: kakaoUrl (String)
  lat?: number | null;           // 백엔드: lat (Double)
  lng?: number | null;           // 백엔드: lng (Double)
  address?: string | null;       // 백엔드: address (String)
  roadAddress?: string | null;   // 백엔드: roadAddress (String)
  phone?: string | null;         // 백엔드: phone (String)
  categoryName?: string | null;  // 백엔드: categoryName (String)
  categoryDetail?: string | null;// 백엔드: categoryDetail (String)
  menu?: string[] | null;        // 백엔드: menu (List<String>)
  mood?: string[] | null;        // 백엔드: mood (List<String>)
  feature?: string[] | null;     // 백엔드: feature (List<String>)
  purpose?: string[] | null;     // 백엔드: purpose (List<String>)
}

interface CandidateMessageResponseDto {
  roomCode: string;
  place: CandidatePlaceResponse;
  votedUserIds: number[];
  voteCount: number;
}

export function candidateToRestaurant(p: CandidatePlaceResponse): RestaurantWithStatus {
  console.log('[candidateToRestaurant] 백엔드 PlaceResponse 데이터:', p);
  
  return {
    placeId: p.id,                                    // id → placeId
    name: p.name ?? `place #${p.id}`,                // name → name
    category: p.categoryDetail ?? null,              // categoryDetail (null 가능)
    phone: p.phone ?? undefined,
    location: {
      lat: p.lat ?? 0,                               // lat (이미 number)
      lng: p.lng ?? 0,                               // lng (이미 number)
      address: p.address ?? undefined,
      roadAddress: p.roadAddress ?? undefined,
    },
    place_url: p.kakaoUrl ?? undefined,
    menu: p.menu ?? [],
    mood: p.mood ?? [],
    feature: p.feature ?? [],
    purpose: p.purpose ?? [],
    isFavorite: false,
    isCandidate: true,
    isVoted: false,
    voteCount: 0,
  };
}

class CandidateClientSingleton {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private currentRoomCode: string | null = null;
  private listeners: Set<(items: RestaurantWithStatus[]) => void> = new Set();
  private lastItems: RestaurantWithStatus[] = [];
  private pendingFrames: { destination: string; body: string }[] = [];

  /**
   * Initialize connection (or switch room) and register a listener.
   * Returns an unsubscribe function to remove the listener.
   */
  init(roomCode: string, onUpdate: (items: RestaurantWithStatus[]) => void): () => void {
    // Register listener first so it can receive immediate snapshot
    const unsubscribe = this.addListener(onUpdate);
    if (this.currentRoomCode !== roomCode || !this.client?.connected) {
      this.currentRoomCode = roomCode;
      this.lastItems = [];
      this.connect(roomCode);
    }
    return unsubscribe;
  }

  /** Add a listener and immediately emit last snapshot if available */
  private addListener(fn: (items: RestaurantWithStatus[]) => void): () => void {
    this.listeners.add(fn);
    if (this.lastItems && this.lastItems.length > 0) {
      try { fn(this.lastItems); } catch {}
    }
    return () => {
      try { this.listeners.delete(fn); } catch {}
    };
  }

  private connect(roomCode: string) {
    if (this.client) {
      try { this.subscription?.unsubscribe(); } catch {}
      try { this.client.deactivate(); } catch {}
      this.client = null;
      this.subscription = null;
    }

    const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '';
    const endpoint = `${String(API_BASE_URL).replace(/\/$/, '')}/ws`;
    const token = localStorage.getItem('accessToken') || '';

    const client = new Client({
      webSocketFactory: () => new SockJS(endpoint),
      reconnectDelay: 1500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    // Ensure latest token is attached on every (re)connect attempt
    client.beforeConnect = () => {
      try {
        const latest = localStorage.getItem('accessToken') || '';
        client.connectHeaders = latest ? { Authorization: `Bearer ${latest}` } : {};
      } catch {
        client.connectHeaders = {} as any;
      }
    };

    client.onConnect = () => {
      this.subscribe(roomCode);
      this.flushPending();
      // 연결 후 초기 상태를 요청하기 위해 빈 메시지 전송
      // 백엔드에서 접속 시 자동으로 현재 상태를 보내주지만 확실히 하기 위함
      setTimeout(() => {
        if (this.client?.connected) {
          try {
            // 빈 액션을 보내서 서버가 현재 상태를 다시 브로드캐스트하도록 유도
            // 실제로는 서버에서 접속 시 자동으로 전송하지만, 안전장치 역할
          } catch (e) {
            // 실패해도 문제없음 - STOMP 자동 업데이트에 의존
          }
        }
      }, 100);
    };

    client.onStompError = (frame) => {
      console.error('[Candidate STOMP ERROR]', frame.headers['message'], frame.body);
    };

    client.onWebSocketError = (evt) => {
      console.error('[Candidate WS ERROR]', evt);
    };
    client.onDisconnect = () => {
      // leave subscription reference; will be reset on next connect
    };

    this.client = client;
    client.activate();
  }

  private subscribe(roomCode: string) {
    if (!this.client) return;
    try { this.subscription?.unsubscribe(); } catch {}
    this.subscription = this.client.subscribe(`/topic/candidate.${roomCode}`, (message: IMessage) => {
      try {
        const arr = JSON.parse(message.body) as CandidateMessageResponseDto[];
        if (!Array.isArray(arr)) return;
        const currentUserId = Number(localStorage.getItem('userId') || '');
        const items: RestaurantWithStatus[] = arr.map((it) => {
          const base = candidateToRestaurant(it.place);
          return {
            ...base,
            isFavorite: useRestaurantStore.getState().isFavorited(it.place.id), // 현재 찜 상태 반영
            isCandidate: true,
            voteCount: it.voteCount ?? 0,
            isVoted: (it.votedUserIds || []).includes(currentUserId),
          };
        });

        // Update shared store snapshot (candidate ids + vote counts)
        const ids = items.map((i) => i.placeId);
        const counts = items.reduce<Record<number, number>>((acc, i) => { acc[i.placeId] = i.voteCount; return acc; }, {});
        const votedSet = new Set<number>(
          items.filter((i) => i.isVoted).map((i) => i.placeId)
        );
        useRestaurantStore.setState({ candidates: new Set(ids), voteCounts: counts, votedRestaurants: votedSet });

        // Cache and broadcast to all listeners
        this.lastItems = items;
        for (const listener of Array.from(this.listeners)) {
          try { listener(items); } catch {}
        }
      } catch (e) {
        console.error('Failed to parse candidate update:', e);
      }
    });
  }

  sendAction(params: { roomCode?: string; placeId: number; userId?: number; actionType: CandidateActionType }) {
    const roomCode = params.roomCode || this.currentRoomCode || localStorage.getItem('roomCode') || '';
    if (!roomCode) {
      console.warn('[CandidateClient] roomCode missing');
      return;
    }
    const destination = `/ws/candidate.${roomCode}`;
    const payload: any = {
      placeId: Number(params.placeId),
      actionType: params.actionType,
    };
    if (params.userId != null && (params.actionType === 'ADD_VOTE' || params.actionType === 'REMOVE_VOTE')) {
      payload.userId = Number(params.userId);
    }
    const body = JSON.stringify(payload);
    if (!this.client || !this.client.connected) {
      // Queue and attempt lazy connect. Will flush onConnect.
      this.pendingFrames.push({ destination, body });
      this.connect(roomCode);
      return;
    }
    try {
      this.client.publish({ destination, body });
    } catch (e) {
      // In case of race, queue and try reconnect once
      console.error('Failed to send candidate action:', e);
      this.pendingFrames.push({ destination, body });
      try { this.client.deactivate(); } catch {}
      this.connect(roomCode);
    }
  }

  private flushPending() {
    if (!this.client || !this.client.connected) return;
    const frames = this.pendingFrames.splice(0, this.pendingFrames.length);
    for (const f of frames) {
      try {
        this.client.publish({ destination: f.destination, body: f.body });
      } catch (e) {
        console.error('Failed to flush candidate frame:', e);
        // Re-queue failed frame
        this.pendingFrames.push(f);
        break;
      }
    }
  }
}

export const CandidateClient = new CandidateClientSingleton();


