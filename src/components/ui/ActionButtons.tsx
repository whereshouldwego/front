import React from 'react';
import styles from './ActionButtons.module.css';
import { useRestaurantStore } from '../../stores/RestaurantStore';
import { CandidateClient } from '../../stores/CandidateClient';

interface Props {
  userId: number;
  placeId: number;
  showFavoriteButton?: boolean;
  showVoteButton?: boolean;
  showCandidateButton?: boolean;
  onStateChange?: (placeId?: number) => void;
  // 후보 패널에서 사용될 때 버튼 의미 변경
  isInCandidatePanel?: boolean;
}

const ActionButtons: React.FC<Props> = ({
  userId,
  placeId,
  showFavoriteButton, 
  showVoteButton, 
  showCandidateButton,
  onStateChange,
  isInCandidatePanel = false
}) => {
  const {
    isFavorited,
    isVoted,
    isCandidate,
    toggleFavorite,
    toggleVote,
    toggleCandidate,
  } = useRestaurantStore();

  /* ✅ [추가] 방별 후보 삭제 톰브스톤 관리 유틸 (localStorage + 커스텀 이벤트)
     - 삭제 시 addTombstone, 추가 시 removeTombstone
     - SearchPanel/RoomPage/CandidatePanel이 이 값을 보고 서버 스냅샷에 남은 항목을 필터링 */
  const TOMB_EVENT = 'candidate:tombstones-changed'; // 이벤트명
  const getRoomCode = () => localStorage.getItem('roomCode') || 'default';
  const keyFor = (room: string) => `__candidate_tombstones__::${room}`;
  const readTombs = (room: string): number[] => {
    try {
      const raw = localStorage.getItem(keyFor(room));
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map((v) => Number(v)).filter((v) => Number.isFinite(v)) : [];
    } catch { return []; }
  };
  const writeTombs = (room: string, ids: number[]) => {
    const uniq = Array.from(new Set(ids.filter((v) => Number.isFinite(v))));
    localStorage.setItem(keyFor(room), JSON.stringify(uniq));
    window.dispatchEvent(new CustomEvent(TOMB_EVENT, { detail: { roomCode: room } }));
  };
  const addTombstone = (room: string, id: number) => {
    const prev = readTombs(room);
    if (!prev.includes(id)) writeTombs(room, [...prev, id]);
  };
  const removeTombstone = (room: string, id: number) => {
    const prev = readTombs(room);
    if (prev.includes(id)) writeTombs(room, prev.filter((v) => v !== id));
  };
  /* === [추가 끝] === */

  const handleFavoriteToggle = async () => {
    try {
      await toggleFavorite(placeId);
      onStateChange?.();
    } catch (error: any) {
      const errorMessage = error?.message?.includes('로그인 후 이용해주세요')
      ? '로그인 후 이용해주세요.'
      : (error?.message ?? '찜 처리 중 오류가 발생했습니다.');
      alert(errorMessage);
    }
  };

  const handleVoteToggle = () => {
    const currentlyVoted = isVoted(placeId);
    // 로컬 낙관적 토글
    toggleVote(placeId);
    // 서버 브로드캐스트로 동기화 (투표 추가/제거)
    CandidateClient.sendAction({
      placeId,
      userId: Number.isFinite(Number(userId)) ? Number(userId) : undefined,
      actionType: currentlyVoted ? 'REMOVE_VOTE' : 'ADD_VOTE',
    });
    // 투표도 실시간 동기화되므로 onStateChange 호출하지 않음
    // onStateChange?.();
  };

  const handleCandidateToggle = () => {
    const userIdNum = Number(userId);
    const currentlyOn = isCandidate(placeId);

    toggleCandidate(placeId);

    // ✅ [추가] 후보 on/off에 따라 톰브스톤 갱신
    const room = getRoomCode();
    if (currentlyOn) {
      // 후보 → 제거 : tombstone 추가
      addTombstone(room, placeId); // [추가]
    } else {
      // 후보 아님 → 추가 : tombstone 제거
      removeTombstone(room, placeId); // [추가]
    }

    // 모든 패널에서 항상 onStateChange 호출
    if (onStateChange) {
      onStateChange(placeId);
    }

    CandidateClient.sendAction({
      placeId,
      userId: Number.isFinite(userIdNum) ? userIdNum : undefined,
      actionType: currentlyOn ? 'REMOVE_PLACE' : 'ADD_PLACE',
    });
  };

  return (
    <div className={styles.actionButtons}>
      {showFavoriteButton && (
        <button
          className={`${styles.actionButton} ${styles.favoriteButton} ${isFavorited(placeId) ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleFavoriteToggle();
          }}
          title={isFavorited(placeId) ? '찜해제' : '찜하기'}
        >
          {isFavorited(placeId) ? '❤️' : '🤍'}
        </button>
      )}
      
      {showVoteButton && (
        <div className={styles.voteContainer}>
          <button
            className={`${styles.actionButton} ${styles.voteButton} ${isVoted(placeId) ? styles.active : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVoteToggle();
            }}
            title={
              isInCandidatePanel 
                ? (isVoted(placeId) ? '투표 취소' : '투표하기')
                : (isVoted(placeId) ? '좋아요 취소' : '좋아요')
            }
          >
            {isInCandidatePanel 
              ? (isVoted(placeId) ? '🗳️' : '🗳️')
              : (isVoted(placeId) ? '👍🏿' : '👍🏻')
            }
          </button>
        </div>
      )}
      
      {showCandidateButton && (
        <button
          className={`${styles.actionButton} ${styles.candidateButton} ${isCandidate(placeId) ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCandidateToggle();
          }}
          title={
            isInCandidatePanel 
              ? '후보에서 삭제하기'
              : (isCandidate(placeId) ? '후보제거' : '후보추가')
          }
        >
          {isInCandidatePanel 
            ? '🗑️'
            : (isCandidate(placeId) ? '🗑️' : '✅')
          }
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
