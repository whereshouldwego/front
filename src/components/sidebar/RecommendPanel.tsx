/**
 * RecommendPanel.tsx
 *
 * 추천 패널 컴포넌트
 *
 * 기능:
 * - AI 추천 맛집 표시 (두 소스 모두 대응)
 *   1) 기존 검색 기반 결과(useSidebar.searchResults)
 *   2) 새 이벤트 기반 결과(window 'recommend:payload' 커스텀 이벤트)
 * - 핀/카드 선택 시 강조 및 패널 내 스크롤 포커스
 * - 상태 변경 시 재조회(필요 시)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'; // ✅ [병합해결] useRef/useState 추가
import { EMPTY_MESSAGES, PANEL_CONFIGS } from '../../constants/sidebar';
import RestaurantCard from '../ui/RestaurantCard';
import ActionButtons from '../ui/ActionButtons';
import styles from './SidebarPanels.module.css';
import { useSidebar } from '../../stores/SidebarContext';
import type { MapCenter, PlaceDetail, RestaurantWithStatus } from '../../types'; // ✅ [병합해결] 타입 정리

/* =========================
 * 기본 센터 (기존 유지)
 * ========================= */
const DEFAULT_CENTER: MapCenter = {
  lat: 37.5002,
  lng: 127.0364,
};

/* =========================
 * 이벤트 payload → RestaurantWithStatus 매핑
 * ========================= */
const toRestaurantWithStatus = (p: PlaceDetail): RestaurantWithStatus => ({
  placeId: p.id,
  name: p.name,
  category: p.categoryDetail || '',
  location: {
    address: p.address || '',
    roadAddress: p.roadAddress || '',
    lat: p.lat,
    lng: p.lng,
  },
  phone: p.phone || '',
  menu: p.menu || [],
  mood: p.mood || [],
  feature: p.feature || [],
  place_url: p.kakaoUrl,

  // RestaurantCard가 요구하는 상태 필드 기본값
  isFavorite: false,
  isCandidate: false,
  isVoted: false,
  voteCount: 0,
});

interface RecommendPanelProps {
  userId: number;
  center?: MapCenter;
  roomCode?: string; // ✅ [병합해결] 새 props 호환
}

const RecommendPanel: React.FC<RecommendPanelProps> = ({ userId, center, roomCode }) => {
  const { searchResults, performSearch, setSelectedRestaurantId, selectedRestaurantId } = useSidebar();

  // ✅ [병합해결] 새 이벤트 기반 추천 결과 상태(있으면 우선 사용)
  const [reply, setReply] = useState<string>('');
  const [eventItems, setEventItems] = useState<RestaurantWithStatus[]>([]);

  // 스크롤 컨테이너 ref
  const panelBodyRef = useRef<HTMLDivElement | null>(null);

  /* =========================
   * 선택 강조 스타일 (검색/찜과 동일)
   * ========================= */
  const selectedStyle: React.CSSProperties = {
    boxShadow:
      'inset 0 0 0 2px rgba(59,130,246,0.65), 0 12px 20px rgba(0,0,0,0.12), 0 5px 10px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'visible',
  };

  // (후보 패널만 글로우 제거 요청이 있었음. 추천은 기존 유지)
  const gradientGlowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: -6,
    borderRadius: 12,
    background:
      'radial-gradient(60% 80% at 50% 0%, rgba(59,130,246,0.28), rgba(59,130,246,0) 70%), linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.22))',
    filter: 'blur(12px)',
    opacity: 1,
    zIndex: 0,
    pointerEvents: 'none',
  };

  /* =========================
   * 추천 로딩(기존 방식 유지)
   * ========================= */
  useEffect(() => {
    if (center) {
      const searchCenter = center || DEFAULT_CENTER;
      performSearch({
        query: '',
        location: `${searchCenter.lat},${searchCenter.lng}`,
        limit: 10,
      });
    }
  }, [center, performSearch]);

  // 상태 변경 후 재조회(필요 시)
  const handleStateChange = useCallback(async () => {
    try {
      if (center) {
        const searchCenter = center || DEFAULT_CENTER;
        await performSearch({
          query: '',
          location: `${searchCenter.lat},${searchCenter.lng}`,
          limit: 10,
        });
      }
      // 이벤트 기반 추천은 서버/호스트가 다시 payload를 쏘는 구조라 여기선 별도 처리 없음
    } catch (error) {
      console.error('추천 데이터 새로고침 중 오류 발생:', error);
    }
  }, [center, performSearch]);

  /* =========================
   * 🆕 이벤트 기반 추천 결과 수신
   *  - detail: { reply: string; items: PlaceDetail[] }
   *  - 수신 시 eventItems/ reply 갱신
   * ========================= */
  useEffect(() => {
    const onPayload = (e: Event) => {
      const detail = (e as CustomEvent<{ reply: string; items: PlaceDetail[] }>).detail;
      if (!detail) return;
      setReply(detail.reply || '');
      setEventItems((detail.items || []).map(toRestaurantWithStatus));
    };
    window.addEventListener('recommend:payload', onPayload);
    return () => window.removeEventListener('recommend:payload', onPayload);
  }, []);

  /* =========================
   * 렌더 소스 통합:
   *  - eventItems 가 있으면 우선 사용
   *  - 없으면 기존 searchResults 사용
   * ========================= */
  const list: RestaurantWithStatus[] =
    (eventItems && eventItems.length > 0 ? eventItems : (searchResults ?? [])) as RestaurantWithStatus[];

  /* =========================
   * 선택된 카드로 스크롤 포커스 이동
   * ========================= */
  useEffect(() => {
    if (!selectedRestaurantId || !panelBodyRef.current) return;
    const target = panelBodyRef.current.querySelector(
      `[data-place-id="${selectedRestaurantId}"]`
    ) as HTMLElement | null;
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedRestaurantId, list.length]); // ✅ [병합해결] 데이터 소스 통합 후 의존성 정리

  /* =========================
   * 렌더
   * ========================= */
  return (
    <div className={styles.panelContent}>
      {/* 헤더 */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div className={styles.titleContainer}>
            <h2 className={styles.titleText}>{PANEL_CONFIGS.recommend.title}</h2>
          </div>
        </div>
      </div>

      {/* 패널 바디 */}
      <div className={styles.panelBody} ref={panelBodyRef}>
        {/* 이벤트 메시지(reply) 노출 */}
        {reply && (
          <div className={styles.resultsHeader}>
            <span>{reply}</span>
          </div>
        )}

        {/* 결과 */}
        {list && list.length > 0 ? (
          <div className={styles.resultsContainer}>
            {!reply && (
              <div className={styles.resultsHeader}>
                <span>추천 맛집 ({list.length}개)</span>
              </div>
            )}
            <div className={styles.restaurantCards}>
              {list.map((r) => {
                const selected = String(selectedRestaurantId) === String(r.placeId);
                return (
                  <div
                    key={r.placeId}
                    className={styles.restaurantCard}
                    data-place-id={r.placeId}
                    style={selected ? selectedStyle : undefined}
                    onClick={() => setSelectedRestaurantId(String(r.placeId))}
                  >
                    {selected && <div style={gradientGlowStyle} aria-hidden />}{/* 추천은 글로우 유지 */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <RestaurantCard
                        data={r}
                        className={styles.restaurantCard}
                        actions={
                          userId ? (
                            <ActionButtons
                              userId={userId}
                              placeId={r.placeId}
                              showFavoriteButton
                              showCandidateButton
                              onStateChange={handleStateChange}
                              roomCode={roomCode}
                            />
                          ) : null
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{EMPTY_MESSAGES.recommend}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendPanel;
