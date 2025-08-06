/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // src 폴더 내 모든 파일
    "./components/**/*.{js,ts,jsx,tsx}" // 공통 컴포넌트 디렉토리
  ],
  theme: {
    extend: {
      spacing: {
        '14': '3.5rem', // 56px
        '67': '16.75rem', // 268px (96px * 0.7)
      },
    },
  },
  plugins: [
    // 스크롤바 숨김 유틸리티 클래스 추가
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      }
      addUtilities(newUtilities)
    }
  ],
}; 