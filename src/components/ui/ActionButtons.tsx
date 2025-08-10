import React from 'react';
import styles from './ActionButtons.module.css';
import { useRestaurantStore } from '../../stores/RestaurantStore';

interface Props {
  userId: number;           // 찜/투표에 필요
  placeId: number;          // 숫자 ID 표준
  showFavoriteButton?: boolean;
  showVoteButton?: boolean;
  showCandidateButton?: boolean;
}

const ActionButtons: React.FC<Props> = ({
  userId,
  placeId,
  showFavoriteButton, showVoteButton, showCandidateButton,
}) => {
  const {
    isFavorited,
    isVoted,
    isCandidate,
    toggleFavorite,
    toggleVote,
    toggleCandidate,
  } = useRestaurantStore();

  const favOn = isFavorited(placeId);
  const voteOn = isVoted(placeId);
  const candOn = isCandidate(placeId);

  return (
    <div className={styles.actionButtons}>
      {showFavoriteButton && (
        <button
          className={`${styles.actionButton} ${styles.favoriteButton} ${isFavorited(placeId) ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            void toggleFavorite(placeId, userId);
          }}
          title={favOn ? '찜해제' : '찜하기'}
        >
          {favOn ? '❤️' : '🤍'}
        </button>
      )}
      
      {showVoteButton && (
        <button
          className={`${styles.actionButton} ${styles.voteButton} ${isVoted(placeId) ? styles.active : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleVote(placeId); // 서버 미구현: 로컬만
          }}
          title={voteOn ? '투표취소' : '투표하기'}
        >
          {voteOn ? '✅' : '🗳️'}
        </button>
      )}
      
      {showCandidateButton && (
        <button
        className={`${styles.actionButton} ${styles.candidateButton} ${candOn ? styles.active : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleCandidate(placeId); // 서버 미구현: 일단 경고 or no-op로 설계 가능
        }}
        title={candOn ? '후보제거' : '후보추가'}
      >
        {candOn ? '⭐' : '☆'}
      </button>
    )}
    </div>
  );
};

export default ActionButtons;