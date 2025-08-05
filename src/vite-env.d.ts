/// <reference types="vite/client" />

// 환경변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_API_KEY: string
  readonly VITE_KAKAO_CLIENT_ID: string
  readonly VITE_KAKAO_REDIRECT_URI: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
