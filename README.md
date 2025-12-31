### วิธีการรันหลังจากแก้ไฟล์นี้ (สำหรับการทดสอบ ngrok)

1.  **Terminal ช่องที่ 1 (Backend):**
    ```bash
    npm run server
    # หรือ node src/server.js
    ```
2.  **Terminal ช่องที่ 2 (Frontend):**
    ```bash
    npm start
    # มันจะเปิด localhost:3000 ขึ้นมา (รอสักพัก)
    ```
3.  **Terminal ช่องที่ 3 (Ngrok):**
    ```bash
    ngrok http 3000 --host-header="localhost:3000"