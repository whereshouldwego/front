import React from 'react';
import styles from './ActionButtons.module.css';
import { useRestaurantStore } from '../../stores/RestaurantStore';

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
    toggleVote,
    toggleCandidate,
  } = useRestaurantStore();

  const handleFavoriteToggle = async () => {
    try {
      await toggleFavorite(placeId, userId);
      onStateChange?.();
    } catch (error: any) {
      alert(error?.message ?? '찜 처리 중 오류가 발생했습니다.');
    }
  };

  const handleVoteToggle = () => {
    toggleVote(placeId);
    onStateChange?.();
  };

  const handleCandidateToggle = () => {
    toggleCandidate(placeId);
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
        <button
          className={`${styles.actionButton} ${styles.voteButton} ${isVoted(placeId) ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleVoteToggle();
          }}
          title={isVoted(placeId) ? '투표취소' : '투표하기'}
        >
          {isVoted(placeId) ? '✅' : '☑️'}
        </button>
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
          {isCandidate(placeId) ? '📤' : '📥'}
        </button>
      )}
    </div>
  );
};

export default ActionButtons;