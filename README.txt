CODE DOCTOR WEB APP

ไฟล์หลัก:
- index.html
- manifest.webmanifest
- service-worker.js
- icon.svg

วิธีเปิดบนคอม:
1. เปิด index.html ได้ทันทีสำหรับการใช้งานทั่วไป
2. หากต้องการใช้ PWA/Offline ควรเปิดผ่าน Web Server เช่น VS Code Live Server

วิธีขึ้นเว็บฟรี:
Netlify:
- ลากโฟลเดอร์ code_doctor_webapp ไปที่ Netlify Drop

GitHub Pages:
- สร้าง Repository
- อัปโหลดไฟล์ทั้งหมด
- Settings > Pages > Deploy from branch

Render:
- Static Site
- Publish Directory = .
- ไม่ต้องมี Build Command

หมายเหตุ:
Service Worker ต้องทำงานผ่าน HTTPS หรือ localhost
