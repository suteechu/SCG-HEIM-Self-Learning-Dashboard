import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/SCG-HEIM-Self-Learning-Dashboard/', // เติมบรรทัดนี้เพื่อให้ GitHub Pages หาไฟล์เจอ
  server: {
    port: 5173
  }
})
```

พอวางและ **กด Save** เสร็จเรียบร้อยแล้ว ให้เราอัปเดตไฟล์นี้ขึ้นระบบอีกครั้งตามสเตปนี้ครับ (พิมพ์ใน Terminal ทีละบรรทัด):

**1. เซฟไฟล์ลง Git และส่งขึ้น GitHub (อัปเดตโค้ดหลัก):**
```bash
git add .
git commit -m "Add base path for GitHub Pages"
git push origin main
```

**2. สั่งแพ็กไฟล์แล้วอัปโหลดขึ้นเว็บจริง (Deploy):**
```bash
npm run deploy