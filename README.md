# Power Up! Portfolio 🚀

> เว็บไซต์ Learning Portfolio สำหรับรายวิชา CS100 ที่บันทึกข้อมูลเป็นไฟล์ JSON บน Server (AWS EC2) รองรับหลาย Portfolio, ตรวจสอบความถูกต้องฝั่ง Server และรองรับการแลกเปลี่ยน Portfolio Item JSON ในกิจกรรม Challenge Exchange

---

## 🌟 ฟีเจอร์หลัก (Features)

1. **บันทึกข้อมูลบน Server (`api/` + JSON):**
   - สร้าง สลับ และจัดการ Portfolio ของหลายคนได้จากแถบ **เลือก Portfolio** และปุ่ม **+ New**
   - อ่านและบันทึกข้อมูลเป็นไฟล์ JSON บน Server แทน `localStorage` เปิดข้ามเครื่อง/ข้าม Browser แล้วเห็นข้อมูลชุดเดียวกัน และข้อมูลไม่หายเมื่อ Restart Server หรือ Reboot EC2
2. **Server-side Validation:**
   - ตรวจความถูกต้องของข้อมูลทุกฟิลด์ที่ฝั่ง Server ก่อนบันทึก (รหัส 10 หลัก, วันที่ `YYYY-MM-DD`, ลิงก์ `http://` หรือ `https://`, ทักษะ, และ Reflection ครบ 4 ข้อ)
3. **Challenge Exchange (Import / Export JSON):**
   - นำเข้า Portfolio Item JSON ของเพื่อนผ่านการ Copy/Paste ลงช่อง Textarea หรือเลือกไฟล์ `.json` (เลือกได้ทั้งโหลดลงฟอร์มเพื่อเติม Reflection หรือ Import ลง Server ทันที)
   - กด **Copy JSON** ของแต่ละผลงานในหน้า Showcase หรือกด **Export `my-portfolio.json`** จาก Server
4. **ความปลอดภัยพื้นฐาน:**
   - เก็บไฟล์ JSON ไว้นอกโฟลเดอร์เว็บ (`../Private/portfolios/<10-digit-id>.json`) เพื่อไม่ให้เปิดหรือดาวน์โหลดไฟล์ตรงจาก URL ได้
   - มี `.htaccess` ปิด Directory Listing และ `.gitignore` กันการส่งไฟล์ลับ (`.env`, `*.pem`, `*.key`, `Private/`) ขึ้น GitHub

---

## 📁 โครงสร้างไฟล์

```text
/var/www/
├── Private/
│   └── portfolios/          # เก็บไฟล์ JSON นอกโฟลเดอร์เว็บ (เข้าผ่าน URL ตรงๆ ไม่ได้)
│       └── 1234567890.json
└── html/                    # โฟลเดอร์เว็บหลัก (Git Repository)
    ├── index.html           # หน้าเว็บหลัก (3 ขั้นตอน + แถบเลือก Portfolio + Challenge Exchange)
    ├── style.css            # ไฟล์ตกแต่ง CSS + Responsive
    ├── app.js               # JavaScript เชื่อมต่อ api/portfolio.php และ api/items.php
    ├── api/
    │   ├── storage.php      # ฟังก์ชันกลางอ่าน/เขียน JSON, ตรวจวันที่/URL, แปลง Export
    │   ├── portfolio.php    # API ดูรายชื่อทั้งหมด, โหลด, บันทึก, ลบ และ Export my-portfolio.json
    │   └── items.php        # API เพิ่มและลบ Portfolio Item พร้อม Server Validation
    ├── .htaccess            # ปิดการเปิดดูรายชื่อไฟล์และบล็อกไฟล์ระบบ
    ├── .gitignore           # กันไฟล์ลับและโฟลเดอร์ข้อมูลขึ้น GitHub
    └── README.md            # คู่มือรันและทดสอบระบบ
```

---

## 💻 วิธีรันทดสอบบนเครื่อง (Local)

ต้องรันผ่าน PHP Server (ไม่เปิดไฟล์ `index.html` ตรงๆ เพราะต้องใช้ไฟล์ใน `api/`):

```bash
git clone https://github.com/wachirawitwid-crypto/Project-Checkpoint.git
cd Project-Checkpoint
php -S localhost:8000
```

จากนั้นเปิดเบราว์เซอร์ที่ `http://localhost:8000` (ระบบจะสร้างไฟล์ข้อมูลไว้ที่ `../Private/portfolios/` อัตโนมัติ)

---

## ☁️ วิธีติดตั้งบน AWS EC2 (Apache + PHP)

1. ติดตั้ง Apache และ PHP:
   ```bash
   sudo apt update
   sudo apt install -y apache2 php libapache2-mod-php php-mbstring
   sudo systemctl enable --now apache2
   ```
2. นำโค้ดไว้ที่ `/var/www/html`
3. สร้างโฟลเดอร์เก็บ JSON นอกโฟลเดอร์เว็บ และตั้งสิทธิ์ให้ Apache เขียนได้:
   ```bash
   sudo mkdir -p /var/www/Private/portfolios
   sudo chown -R www-data:www-data /var/www/Private
   sudo chmod -R 750 /var/www/Private
   ```
4. ตั้งค่า Security Group ให้เปิดเฉพาะ Port ที่จำเป็น (`HTTP 80` และ `SSH 22` เท่าที่จำเป็น)

---

## 🧪 วิธีทดสอบระบบ

1. **ทดสอบข้ามเครื่อง / Reboot:** สร้าง Portfolio บน Browser A → เปิดดูบน Browser B หรือมือถือ → Restart Apache (`sudo systemctl restart apache2`) แล้วรีเฟรช ข้อมูลต้องยังอยู่ครบ
2. **ทดสอบ Server Validation (ส่งข้อมูลผิดต้องโดนปฏิเสธ HTTP 400):**
   ```bash
   curl -i -X POST "http://localhost:8000/api/portfolio.php" \
     -H "Content-Type: application/json" \
     -d '{"profile":{"full-name":"Test","studen_id":"abc","enjoy":"","tried":"","curious-about":""},"items":[],"content":[],"counter":1}'
   ```
3. **ทดสอบว่าโหลดไฟล์ JSON ตรงจาก URL ไม่ได้:**
   - เปิด `http://<EC2-IP>/Private/portfolios/1234567890.json` หรือ `http://<EC2-IP>/../Private/portfolios/1234567890.json` → ต้องขึ้น `404 Not Found`
