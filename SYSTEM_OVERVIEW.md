# ภาพรวมระบบ Cross-Learning Platform

เอกสารนี้อธิบายว่าระบบทำอะไรบ้าง มีระบบอะไรบ้าง ทั้ง **หน้าบ้าน (Frontend)** และ **หลังบ้าน (Backend)** ให้ชัดเจน

---

## สรุปภาพรวม

**Cross-Learning** เป็นแพลตฟอร์ม **เรียนออนไลน์ + จองห้องประชุม** ที่รองรับการล็อกอินด้วย **สมาชิก HMPM** (mem_id / mem_pass) หรืออีเมล/รหัสผ่านของ Supabase โดยมีระบบแต้ม (points) สำหรับจองห้อง เรียนจบได้แต้ม และมีแจ้งเตือน/บุ๊คมาร์ค

---

## 1. หน้าบ้าน (Frontend)

เทคโนโลยี: **React**, **Vite**, **TypeScript**, **Tailwind CSS**, **React Router**, **TanStack Query**

### 1.1 การเข้าสู่ระบบ (Auth)

| หน้าที่ | เส้นทาง | รายละเอียด |
|--------|---------|------------|
| **Login** | `/login` | เข้าสู่ระบบได้ 2 แบบ: **HMPM** (กรอก mem_id / mem_pass จะเรียก Edge Function `hmpm-login`) หรือ **อีเมล/รหัสผ่าน** (Supabase Auth โดยตรง) |
| **Forgot Password** | `/forgot-password` | ขอรีเซ็ตรหัสผ่านทางอีเมล |
| **Reset Password** | `/reset-password` | ตั้งรหัสผ่านใหม่หลังคลิกลิงก์จากอีเมล |

- หลังล็อกอิน HMPM ระบบจะสร้าง/อัปเดตผู้ใช้ใน Supabase และ sync ข้อมูลสมาชิกไปที่ตาราง `profiles` (ฟิลด์ hmpm_*)

### 1.2 หน้าสำหรับผู้เรียน (Learner) — ต้องล็อกอิน

| หน้าที่ | เส้นทาง | รายละเอียด |
|--------|---------|------------|
| **แดชบอร์ด** | `/` | หน้าแรก แสดงสถิติการเรียน คอร์ส/วิชา แนะนำต่อ |
| **หมวดหมู่** | `/categories` | รายการหมวดหมู่คอร์ส |
| **วิชาในหมวด** | `/categories/:categoryId` | รายการวิชาในหมวดที่เลือก |
| **รายละเอียดวิชา** | `/subjects/:subjectId` | ข้อมูลวิชา รายการ Episodes ความคืบหน้า |
| **เล่น Episode** | `/subjects/:subjectId/episodes/:episodeId` | เล่นวิดีโอ/ดู PDF บทเรียน บันทึกความคืบหน้า |
| **จองห้องประชุม** | `/rooms` | เลือกห้อง เลือกวัน/เวลา จอง (ใช้แต้ม ชม./วัน/เดือนจำกัด) แก้ไข/ยกเลิกการจอง |
| **Activity Feed** | `/activity` | แสดงกิจกรรมล่าสุด (เรียนจบ จองห้อง แต้ม ฯลฯ) |
| **แต้มและรางวัล** | `/rewards` | ดูแต้มใน wallet กติกาแต้ม (จบบท/จบวิชา/streak) |
| **โปรไฟล์** | `/profile` | ข้อมูลผู้ใช้ (ชื่อ อีเมล ฝั่ง HMPM: mcode, member_group, pos_cur, honor, status, expire) เปลี่ยนรหัสผ่าน |
| **ตั้งค่า** | `/settings` | ตั้งค่าต่างๆ ของผู้ใช้ |

- **ข้อความ / คอร์สออนไลน์ / งานที่ได้รับมอบหมาย / การชำระเงิน** มีเส้นทางแต่เป็น placeholder (หน้ากำลังพัฒนา)

- **แถบด้านข้าง (Sidebar)** แสดงจำนวนการแจ้งเตือนยังไม่อ่าน และรายการแจ้งเตือนล่าสุด (ดึงจาก `notifications`)

### 1.3 หน้าสำหรับแอดมิน (Admin) — ต้องล็อกอิน + สิทธิ์ admin

| หน้าที่ | เส้นทาง | รายละเอียด |
|--------|---------|------------|
| **แดชบอร์ดแอดมิน** | `/admin` | สรุปภาพรวมระบบ |
| **จัดการผู้ใช้** | `/admin/users` | CRUD ผู้ใช้ (profiles), ดู/สร้าง/แก้ไข/ลบ |
| **หมวดหมู่** | `/admin/categories` | CRUD หมวดหมู่คอร์ส |
| **วิชา** | `/admin/subjects` | CRUD วิชา (ผูกกับหมวด) |
| **บทเรียน (Episodes)** | `/admin/episodes` | CRUD Episodes (วิดีโอ URL/อัปโหลด, PDF, ลำดับ, แต้มรางวัล) |
| **กติกาแต้ม** | `/admin/rewards` | จัดการกติกาแต้ม (point_rules) เปิด/ปิด แก้จำนวนแต้ม |
| **ห้องประชุม** | `/admin/rooms` | หน้าเดียวมีแท็บย่อย: **หมวดหมู่ห้องประชุม**, **รูปแบบการจัดโต๊ะ**, **ประเภทของห้อง**, **ห้องประชุม**, **การจอง**, **บล็อกช่วงเวลา** |
| **รายงาน** | `/admin/reports` | รายงานการใช้ระบบ |
| **Logs** | `/admin/logs` | ดู system_logs (action, user, status, error) |
| **Status** | `/admin/status` | ตรวจสอบสถานะระบบ/บริการ |
| **API Test** | `/admin/api-test` | ทดสอบเรียก API ต่างๆ |

### 1.4 หน้าทดสอบ (Test)

| หน้าที่ | เส้นทาง | รายละเอียด |
|--------|---------|------------|
| **ทดสอบ HMPM Login** | `/test-hmpm-login` | ทดสอบการล็อกอิน HMPM แยกจากหน้า Login หลัก |
| **ทดสอบ HMPM API** | `/test-hmpm-api` | ทดสอบเรียก HMPM API ผ่าน Edge Function proxy |

---

## 2. หลังบ้าน (Backend)

เทคโนโลยี: **Supabase** (Auth, PostgreSQL, Row Level Security, Storage, Edge Functions)

### 2.1 Authentication

- **Supabase Auth**: จัดการผู้ใช้ (auth.users), session, อีเมลรีเซ็ตรหัสผ่าน
- **HMPM Login (Edge Function `hmpm-login`)**:
  - รับ `mem_id` / `mem_pass` จากหน้าบ้าน
  - เรียก HMPM API 1: ดึง `access_token` (ใช้ HMPM_AUTH_USER, HMPM_AUTH_PASS ใน Supabase Secrets)
  - เรียก HMPM API 2: ยืนยันสมาชิกและดึงข้อมูลโปรไฟล์
  - สร้าง/อัปเดตผู้ใช้ใน `auth.users` (อีเมลเทียม `{mcode}@hmpm.local`) และ sync ลง `profiles` (hmpm_mcode, hmpm_member_group, hmpm_pos_cur, hmpm_honor, hmpm_member_status, hmpm_expire, hmpm_raw)
  - สร้าง `user_wallet` และ `user_streaks` ถ้ายังไม่มี

### 2.2 ฐานข้อมูล (ตารางหลัก)

| ตาราง | ความหมาย |
|-------|----------|
| **profiles** | ข้อมูลผู้ใช้ (id, email, full_name, department, avatar_path, role, is_active, ฟิลด์ hmpm_*) ผูกกับ auth.users |
| **categories** | หมวดหมู่คอร์ส (ชื่อ, รูป, status) |
| **subjects** | วิชา (ผูก category, ชื่อ, ระดับ, unlock_mode, status) |
| **episodes** | บทเรียน (ผูก subject, ลำดับ, media: video_url / video_upload / pdf, duration, points_reward) |
| **episode_resources** | ทรัพยากรเสริมของ episode (ลิงก์/ไฟล์/PDF) |
| **user_episode_progress** | ความคืบหน้าการดู (user, episode, watched_percent, last_position_seconds, completed_at) |
| **point_rules** | กติกาแต้ม (key, points, is_active, description) เช่น episode_complete, subject_complete, streak_3, streak_7, booking_use |
| **point_transactions** | บันทึกการได้/ใช้แต้ม (user, rule_key, ref_type, ref_id, points) |
| **user_wallet** | แต้มรวมและระดับของผู้ใช้ (total_points, level) |
| **user_streaks** | สถิติเรียนต่อเนื่อง (current_streak, max_streak, last_activity_date) |
| **rooms** | ห้องประชุม (ชื่อ, location, capacity, features_json, status) |
| **room_blocks** | ช่วงเวลาที่ปิดใช้ห้อง (room, start_at, end_at, reason) |
| **room_bookings** | การจองห้อง (room, user, title, start_at, end_at, status: approved/pending/rejected/cancelled) |
| **room_categories** | หมวดหมู่ห้องประชุม (สำหรับจัดกลุ่มห้อง) |
| **room_types** | ประเภทห้อง |
| **table_layouts** | รูปแบบการจัดโต๊ะ |
| **notifications** | แจ้งเตือน (user, type, title, message, data, read_at) |
| **bookmarks** | บุ๊คมาร์ควิชาที่สนใจ (user, subject) |
| **system_logs** | Log ระบบ (user, action, resource_type, resource_id, status, error_message) |

- นโยบาย **RLS (Row Level Security)** ใช้ควบคุมว่าใครดู/แก้/ลบข้อมูลได้ (เช่น ผู้ใช้เห็นเฉพาะของตัวเอง แอดมินเห็นทั้งหมด ในบางตาราง)

### 2.3 Edge Functions (หลังบ้านที่รันบน Supabase)

| Function | หน้าที่ |
|----------|---------|
| **hmpm-login** | ล็อกอินด้วย HMPM: เรียก HMPM API, สร้าง/อัปเดต user + profile, สร้าง wallet/streaks |
| **hmpm-api-proxy** | Proxy เรียก HMPM API สำหรับหน้าทดสอบ (แก้ CORS) |
| **create-booking** | สร้างการจองห้อง: ตรวจเวลา/บล็อก/แต้ม, หักแต้ม, insert room_bookings |
| **update-booking** | แก้ไขการจอง: คืนแต้มเดิม หักแต้มใหม่ (ถ้าจำเป็น) อัปเดต booking |
| **cancel-booking** | ยกเลิกการจอง: คืนแต้ม อัปเดตสถานะเป็น cancelled |
| **complete-episode** | บันทึกจบ episode: ให้แต้มตามกติกา อัปเดต streak |
| **create-user** | สร้างผู้ใช้ใน auth + profiles (และ wallet, streaks) ใช้จากแอดมินหรือระบบ |
| **delete-user** | ลบผู้ใช้และข้อมูลที่ผูก (profiles, wallet, streaks ฯลฯ) |
| **send-email** | ส่งอีเมล (เช่น Resend) ใช้สำหรับรีเซ็ตรหัสผ่าน/แจ้งเตือน |
| **send-booking-reminders** | Cron: ส่งแจ้งเตือนก่อนถึงเวลาจอง |
| **notify-booking-approval** | แจ้งผลการอนุมัติ/ปฏิเสธการจอง (แจ้งเตือนในระบบหรืออีเมล) |
| **reset-user-password** | รีเซ็ตรหัสผ่านผู้ใช้ (แอดมิน/ระบบ) |
| **booking-webhook** | รับ webhook เกี่ยวกับการจอง (ถ้ามีการ integrate ภายนอก) |

### 2.4 Storage (Supabase Storage)

- ใช้เก็บไฟล์ เช่น **รูปหมวดหมู่**, **ปกวิชา**, **วิดีโอ/ไฟล์ Episode**
- มี policy ควบคุมการอ่าน/เขียนตามสิทธิ์ (เช่น เฉพาะ published content หรือแอดมินอัปโหลด)

### 2.5 กติกาแต้มและห้อง (สรุป)

- **จองห้อง**: ใช้แต้ม 10 แต้ม/ชั่วโมง; จำกัดต่อวัน (เช่น 8 ชม.) และต่อเดือน (เช่น 20 ชม.) ตามที่กำหนดใน backend
- **ได้แต้ม**: จบบทเรียน (episode_complete), จบทั้งวิชา (subject_complete), streak 3 วัน / 7 วัน ตาม point_rules
- **Level**: คำนวณจาก total_points (เช่น level = 1 + floor(total_points / 500))

---

## 3. การเชื่อมต่อหน้าบ้าน ↔ หลังบ้าน

- **Auth**: หน้าบ้านใช้ Supabase Client; ถ้าเป็น HMPM จะเรียก `signInWithPassword` หลังได้ session จาก Edge Function `hmpm-login` (หรือ flow ที่ตั้งไว้ใน `src/lib/auth.ts`)
- **ข้อมูล**: หน้าบ้านเรียก Supabase REST (ผ่าน client) ไปที่ตารางต่างๆ โดยตรง โดย RLS จะกรองข้อมูลตามสิทธิ์
- **จองห้อง / จบ Episode**: เรียก Edge Function (`create-booking`, `update-booking`, `cancel-booking`, `complete-episode`) แทนการ insert/update โดยตรง เพื่อให้ logic หัก/คืนแต้มและตรวจกฎอยู่ที่ backend
- **แจ้งเตือน**: อ่านจากตาราง `notifications` (และ unread count) ใน Sidebar และหน้าที่เกี่ยวข้อง

---

## 4. สรุปสั้นๆ ตามมุมมองการใช้งาน

| กลุ่มผู้ใช้ | ระบบหลักที่ใช้ |
|------------|-----------------|
| **ผู้เรียน** | ล็อกอิน (HMPM หรืออีเมล), เรียนคอร์ส/วิชา/Episode, ดูความคืบหน้าและแต้ม, จองห้อง (ใช้แต้ม), ดู Activity และแจ้งเตือน, โปรไฟล์และตั้งค่า |
| **แอดมิน** | จัดการผู้ใช้, หมวดหมู่/วิชา/Episode, กติกาแต้ม, ห้องประชุม (ห้อง/ประเภท/หมวด/การจัดโต๊ะ/การจอง/บล็อกเวลา), รายงาน, Logs, Status, API Test |
| **ระบบ (Backend)** | Supabase Auth + DB + RLS, Edge Functions สำหรับ HMPM, การจอง, การให้แต้ม/streak, อีเมล/แจ้งเตือน, Storage เก็บสื่อ |

ถ้าต้องการให้ลงรายละเอียดส่วนใดเป็นพิเศษ (เช่น แต่ละ API หรือแต่ละตาราง) บอกได้เลยว่าจะให้โฟกัสส่วนไหน
