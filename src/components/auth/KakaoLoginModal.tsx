/**
 * KakaoLoginModal.tsx
 *
 * 카카오톡 로그인 모달 컴포넌트
 *
 * 변경 요약:
 * - (유지) href 리디렉션 방식
 * - [개발 편의] 시작 단계 오류는 모달 내부에서 즉시 표시
 */

import React, { useState } from 'react';

interface KakaoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: any) => void; 
  // ↑ 리디렉션 플로우에선 사용하지 않지만, 외부 호환 위해 타입 유지
}

const KakaoLoginModal: React.FC<KakaoLoginModalProps> = ({
  isOpen,
  onClose,
  // onLoginSuccess는 사용 안 함(리디렉션 플로우)
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const kakaoLoginUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/oauth2/authorization/kakao`;
      window.location.href = kakaoLoginUrl; // 백엔드가 /?accessToken=... 으로 리디렉션
    } catch (e: any) {
      console.error('카카오 로그인 시작 실패:', e);
      setError(e?.message || '로그인을 시작할 수 없습니다.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 w-96 max-w-[90vw] mx-4 shadow-2xl transform transition-all duration-300 scale-100">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 7.955c.084.13.084.27 0 .4-.084.13-.252.195-.42.195H9.42c-.168 0-.336.065-.42.195-.084-.13-.084.27 0-.4.084-.13.252-.195.42-.195h8.067c.168 0 .336.065.42.195z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">로그인</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 에러 메시지 (로그인 시작 단계) */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* 로그인 버튼 */}
        <div className="space-y-4">
          <button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 text-black font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 7.955c.084.13.084.27 0 .4-.084.13-.252.195-.42.195H9.42c-.168 0-.336.065-.42.195-.084-.13-.084.27 0-.4.084-.13.252-.195.42-.195h8.067c.168 0 .336.065.42.195z"/>
              </svg>
            )}
            <span className="text-lg">{isLoading ? '로그인 중...' : '카카오톡으로 로그인하기'}</span>
          </button>
        </div>

        {/* 안내 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 leading-relaxed">카카오톡 계정으로 간편하게 로그인하세요</p>
          <p className="text-xs text-gray-400 mt-2">개발중: 실패 시 빨간 박스로 에러가 표시됩니다</p>
        </div>
      </div>
    </div>
  );
};

export default KakaoLoginModal;
