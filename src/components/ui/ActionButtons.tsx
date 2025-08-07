import React from 'react';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  restaurantId: string;
  showFavoriteButton?: boolean;
  showVoteButton?: boolean;
  showCandidateButton?: boolean;
  onFavoriteClick?: (restaurantId: string) => void;
  onVoteClick?: (restaurantId: string) => void;
  onCandidateClick?: (restaurantId: string) => void;
  isFavorited?: boolean;
  isVoted?: boolean;
  isCandidate?: boolean;
  voteCount?: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  showFavoriteButton = false,
  showVoteButton = false,
  showCandidateButton = false,
  onFavoriteClick,
  onVoteClick,
  onCandidateClick,
  isFavorited = false,
  isVoted = false,
  isCandidate = false,
  restaurantId
}) => {
  return (
    <div className={styles.actionButtons}>
      {showFavoriteButton && (
        <button
          className={`${styles.actionButton} ${styles.favoriteButton} ${isFavorited ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick?.(restaurantId);
          }}
          title={isFavorited ? '찜 해제' : '찜하기'}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>
      )}
      
      {showVoteButton && (
        <button
          className={`${styles.actionButton} ${styles.voteButton} ${isVoted ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onVoteClick?.(restaurantId);
          }}
          title={isVoted ? '투표 취소' : '투표하기'}
        >
          {isVoted ? '✅' : '🗳️'}
        </button>
      )}
      
      {showCandidateButton && (
        <button
          className={`${styles.actionButton} ${styles.candidateButton} ${isCandidate ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onCandidateClick?.(restaurantId);
          }}
          title={isCandidate ? '후보에서 제거' : '후보에 추가'}
        >
          {isCandidate ? '⭐' : '☆'}
        </button>
      )}
    </div>
  );
};

export default ActionButtons;