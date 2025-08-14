import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import type { RestaurantWithStatus } from '../types';
import { useRestaurantStore } from './RestaurantStore';

type CandidateActionType = 'ADD_PLACE' | 'REMOVE_PLACE' | 'ADD_VOTE' | 'REMOVE_VOTE';

interface CandidatePlaceResponse {
  id: number;
  name?: string | null;
  kakaoUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  roadAddress?: string | null;
  phone?: string | null;
  aiSummary?: string | null;
  categoryName?: string | null;
}

interface CandidateMessageResponseDto {
  roomCode: string;
  place: CandidatePlaceResponse;
  votedUserIds: number[];
  voteCount: number;
}

function placeToRestaurant(p: CandidatePlaceResponse): RestaurantWithStatus {
  return {
    placeId: p.id,
    name: p.name ?? `place #${p.id}`,
    category: p.categoryName ?? '',
    phone: p.phone ?? undefined,
    location: {
      lat: typeof p.lat === 'number' ? p.lat : Number.NaN,
      lng: typeof p.lng === 'number' ? p.lng : Number.NaN,
      address: p.address ?? undefined,
      roadAddress: p.roadAddress ?? undefined,
    },
    place_url: p.kakaoUrl ?? undefined,
    summary: p.aiSummary ?? undefined,
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
  private onUpdate: ((items: RestaurantWithStatus[]) => void) | null = null;
  private pendingFrames: { destination: string; body: string }[] = [];

  init(roomCode: string, onUpdate: (items: RestaurantWithStatus[]) => void) {
    this.onUpdate = onUpdate;
    if (this.currentRoomCode === roomCode && this.client?.connected) return;
    this.currentRoomCode = roomCode;
    this.connect(roomCode);
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

    client.onConnect = () => {
      this.subscribe(roomCode);
      this.flushPending();
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
          const base = placeToRestaurant(it.place);
          return {
            ...base,
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

        // Notify hook/component
        this.onUpdate?.(items);
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


