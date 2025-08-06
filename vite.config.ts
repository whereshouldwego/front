import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 맛돌이 앱 Vite 설정
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 5174에서 5173으로 변경
    host: true
  }
})
