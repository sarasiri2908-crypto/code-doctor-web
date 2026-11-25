Code DoctorSiRi V4 — 25 พฤศจิกายน 2569

การอัปเดต Render / GitHub (เว็บไซต์เดิม)
1. แตกไฟล์ ZIP แล้วเปิดโฟลเดอร์ code-doctor-web-main
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ลง root ของ Repository เดิม (ไม่อัปโหลด ZIP และไม่สร้างโฟลเดอร์ซ้อน)
3. Commit changes; หาก Render เปิด Auto-Deploy ให้ตรวจสถานะว่า deploy สำเร็จ หากไม่ได้เปิด ให้กด Manual Deploy > Deploy latest commit
4. เปิดเว็บไซต์เดิม กด Ctrl+F5 และดูว่าแสดง V4 ข้างชื่อเว็บ
5. หากยังเห็น V3 ให้เปิดหน้าต่าง Incognito หรือเปิด DevTools > Application > Service Workers > Unregister แล้ว reload; ตรวจว่าไฟล์ใหม่ deploy ครบ
ไม่ต้องติดตั้ง Live Server หรือ Pyodide ในเครื่องเพื่อใช้งานเว็บไซต์ที่เผยแพร่แล้ว

ไฟล์ที่ต้องอยู่ด้วยกัน: index.html, doctor-v4.js, python-check.js, acorn.js, service-worker.js, manifest.webmanifest, icon.svg และ LICENSE-acorn.txt (สัญญาอนุญาต Acorn)
ทดสอบบนเครื่อง: เปิด index.html ได้สำหรับตัวตรวจพื้นฐาน; Python จริงต้องเปิดผ่าน HTTPS หรือ localhost และเชื่อม CDN ได้

ความสามารถ
- Python: ตัวตรวจพื้นฐานแบบออฟไลน์; CPython ผ่าน Pyodide 0.27.7 ใน Web Worker ตรวจ compile() + AST + symtable โดยไม่ execute โค้ดผู้เรียน
- จำลองซ่อม colon/indentation บางรูปแบบในสำเนาเพื่อค้นหาจุดถัดไปสูงสุด 12 รอบ; ข้อค้นพบหลังจำลองเป็น Warning ไม่ใช่การยืนยันจากโค้ดต้นฉบับ
- เตือนสูตรคะแนน, and/or, ขอบเขตคะแนน, if/else ซ้ำ, การหารด้วยศูนย์, ชื่อที่อาจไม่ถูกประกาศ, index, mutable default, key ซ้ำ, range step 0 และอื่น ๆ ตามกฎที่รองรับ
- JavaScript: Acorn parser แบบออฟไลน์ (script/module) พร้อมตำแหน่ง Syntax Error และคำเตือนจาก AST; ไม่ execute
- C/C++/Arduino: ตัวตรวจพื้นฐานวงเล็บ, semicolon, ชื่อพิมพ์ผิด, assignment ในเงื่อนไข, ฟังก์ชัน Arduino ซ้ำ/ซ้อน และแปล Compiler Log; ไม่ใช่ compiler C/C++ จริง
- HTML/CSS: ตัวตรวจโครงสร้างพื้นฐาน ไม่ใช่ validator ตามมาตรฐานครบถ้วน; JavaScript ใน script tag แบบทั่วไปตรวจด้วย Acorn
- แปล log GCC/Clang/MSVC/Arduino/Python/Browser หลายรูปแบบ; ถ้าไม่มีเลขบรรทัดอาจแสดงบรรทัดเริ่มต้น 1
- ปุ่มนำคำแนะนำไปแก้รายบรรทัดเฉพาะกรณีมี patch ที่ระบบสร้างได้, ยืนยันก่อนแก้, ย้อนการแก้, คัดลอกผลตรวจ, ป้องกันการแก้ผลเก่า
- Cache V4 แบบ network-first สำหรับไฟล์เว็บใน origin เดียวกัน; โหลดออฟไลน์ได้หลัง cache สำเร็จ แต่ CPython อาจต้องออนไลน์
- ข้อมูล Source Code ส่งเฉพาะเข้า Worker ของหน้าเว็บเพื่อวิเคราะห์; ไม่มีการ execute โค้ดนักเรียนและไม่มี API ส่งโค้ดไปวิเคราะห์ที่เซิร์ฟเวอร์

ข้อจำกัดสำคัญ
ไม่มีระบบใดตรวจ Logic Error ได้ทุกชนิดโดยไม่มีโจทย์/ผลลัพธ์ที่คาดหวัง และระบบนี้ไม่ตรวจผลจริงขณะรัน ไม่ตรวจทุกความผิดพลาดหลายไฟล์ ไม่ตรวจ library/hardware จริง ต้องใช้ IDE/Compiler จริงร่วมด้วย
Python compiler อาจหยุดที่ Error แรก; การจำลองแก้รองรับเฉพาะรูปแบบที่ระบุ หากจำลองไม่ได้ต้องแก้แล้วตรวจซ้ำ
Warning เป็นข้อสังเกต ไม่ใช่คำยืนยันว่าผิด; ห้ามใช้เป็นเกณฑ์ตัดคะแนนอัตโนมัติ
Pyodide โหลดจาก CDN ภายนอก; หากโหลดไม่สำเร็จภายใน 25 วินาที ใช้โหมดพื้นฐานและแจ้งสถานะ

ผลทดสอบก่อนส่ง
- ทดสอบ syntax ของไฟล์ JavaScript ทั้งหมดด้วย Node.js
- ทดสอบ Python compile/AST/recovery ด้วย CPython ในเครื่อง (ไม่ใช่ Pyodide CDN จริง)
- ทดสอบ UI ใน Chromium ด้วยผล Python จาก CPython จำลองผ่าน Worker: ตัวอย่าง PA จำลอง 4 จุดพบ 1 Error + 3 Warning, ตรวจ colon 2 จุด, ปุ่มแก้และย้อน, ชื่อไม่ประกาศ/หารศูนย์, โค้ด Python ถูกต้อง, log ModuleNotFoundError, JS syntax/module/assignment, C/C++ semicolon และ comment/string ที่ถูกต้อง, Arduino setup ซ้ำ, fatal error header, HTML แท็ก optional/ปิดผิด/embedded JS, CSS semicolon และ CSS ที่ไม่ต้องมี semicolon ท้าย block
- ยังไม่ได้ทดสอบบน Render จริง, CDN Pyodide จริง, การติดตั้ง service worker บนเว็บจริง หรือใบงาน A/B ฉบับเต็ม
