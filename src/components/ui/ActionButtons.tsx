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
}

const ActionButtons: React.FC<Props> = ({
  userId,
  placeId,
  showFavoriteButton, 
  showVoteButton, 
  showCandidateButton,
  onStateChange
}) => {
  const {
    isFavorited,
    isVoted,
    isCandidate,
    toggleFavorite,
    voteOnce,
    toggleCandidate,
    getVoteCount,
  } = useRestaurantStore();

  const handleFavoriteToggle = async () => {
    try {
      await toggleFavorite(placeId, userId);
      onStateChange?.();
    } catch (error: any) {
      alert(error?.message ?? '찜 처리 중 오류가 발생했습니다.');
    }
  };

  const handleVoteOnce = () => {
    if (isVoted(placeId)) return; // 이미 눌렀으면 무시
    // 로컬 낙관적 증가
    voteOnce(placeId);
    // 서버 브로드캐스트로 동기화 (투표 추가)
    CandidateClient.sendAction({
      placeId,
      userId: Number.isFinite(Number(userId)) ? Number(userId) : undefined,
      actionType: 'ADD_VOTE',
    });
    onStateChange?.();
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
    onStateChange?.();
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
              handleVoteOnce();
            }}
            title={isVoted(placeId) ? '좋아요 완료' : '좋아요'}
            disabled={isVoted(placeId)}
          >
            {isVoted(placeId) ? '👍🏿' : '👍🏻'}
          </button>
          <span className={styles.voteCount}>{getVoteCount(placeId)}</span>
        </div>
      )}
      
      {showCandidateButton && (
        <button
          className={`${styles.actionButton} ${styles.candidateButton} ${isCandidate(placeId) ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCandidateToggle();
          }}
          title={isCandidate(placeId) ? '후보제거' : '후보추가'}
        >
          {isCandidate(placeId) ? '✅' : '☑️'}
        </button>
      )}
    </div>
  );
};

export default ActionButtons;