import React, { useState, useEffect, useRef } from 'react';
import styles from './UserProfileEdit.module.css';

interface UserProfileEditProps {
  currentName: string;
  onNameChange: (newName: string) => void;
  onCancel: () => void;
  isInline?: boolean;
}

const UserProfileEdit: React.FC<UserProfileEditProps> = ({
  currentName,
  onNameChange,
  onCancel,
  isInline = false
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }
    
    if (trimmedName.length > 10) {
      setError('이름은 10자 이하로 입력해주세요.');
      return;
    }
    
    if (trimmedName === currentName) {
      onCancel();
      return;
    }
    
    onNameChange(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    // 인라인 모드에서는 블러 시 자동으로 저장
    if (isInline && name.trim() && name.trim() !== currentName) {
      const trimmedName = name.trim();
      if (trimmedName.length <= 10) {
        onNameChange(trimmedName);
        return;
      }
    }
    // 그 외의 경우는 취소
    onCancel();
  };

  if (isInline) {
    return (
      <form onSubmit={handleSubmit} className={styles.inlineForm}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={styles.inlineInput}
          placeholder="이름 입력"
          maxLength={10}
        />
      </form>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3 className={styles.title}>프로필 이름 변경</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="profileName" className={styles.label}>
              이름
            </label>
            <input
              ref={inputRef}
              id="profileName"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              placeholder="이름을 입력하세요"
              maxLength={10}
            />
            {error && <span className={styles.errorMessage}>{error}</span>}
            <span className={styles.characterCount}>
              {name.length}/10
            </span>
          </div>
          <div className={styles.buttons}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={!name.trim() || name.trim() === currentName}
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileEdit;
