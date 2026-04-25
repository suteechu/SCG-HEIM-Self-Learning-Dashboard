import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // เติม base เข้าไปเพื่อให้ตอน Build โค้ด มันจะชี้โฟลเดอร์ได้ถูกต้องบน GitHub Pages
  base: '/SCG-HEIM-Self-Learning-Dashboard/', 
  server: {
    port: 5173
  }
})