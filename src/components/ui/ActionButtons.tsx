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
  onStateChange?: () => void;
  // 후보 패널에서 사용될 때 버튼 의미 변경
  isInCandidatePanel?: boolean;
  roomCode?: string;
}

const ActionButtons: React.FC<Props> = ({
  userId,
  placeId,
  showFavoriteButton, 
  showVoteButton, 
  showCandidateButton,
  onStateChange,
  isInCandidatePanel = false,
}) => {
  const {
    isFavorited,
    isVoted,
    isCandidate,
    toggleFavorite,
    toggleVote,
    toggleCandidate,
    getVoteCount,
  } = useRestaurantStore();

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
    // 낙관적 표시(아이콘 토글용) — 서버 브로드캐스트가 곧 동기화함
    toggleCandidate(placeId);
    // STOMP로 서버에 통지 → 서버가 전체 후보 목록을 브로드캐스트함
    CandidateClient.sendAction({
      placeId,
      userId: Number.isFinite(userIdNum) ? userIdNum : undefined,
      actionType: currentlyOn ? 'REMOVE_PLACE' : 'ADD_PLACE',
    });
    // 후보 관련 액션은 실시간 동기화되므로 onStateChange 호출하지 않음
    // onStateChange?.();
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
          <span className={styles.voteCount}>
            {isInCandidatePanel ? `${getVoteCount(placeId)}표` : getVoteCount(placeId)}
          </span>
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
            : (isCandidate(placeId) ? '✅' : '☑️')
          }
        </button>
      )}
    </div>
  );
};

export default ActionButtons;