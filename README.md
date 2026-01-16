# Cross-Learning Platform

ระบบ Cross-Learning Online + Meeting Room Booking บน React + Vite + Tailwind + Supabase

## 🚀 Features

- **การเรียนรู้ออนไลน์**: ดู EP ต่อเนื่อง, บันทึก progress, ปลดล็อกตามลำดับ
- **ระบบสะสมแต้ม**: Points, Levels, Streaks พร้อมกันโกง
- **จองห้องประชุม**: ปฏิทิน, กันเวลาชน, บล็อกเวลา
- **ระบบหลังบ้าน**: Admin จัดการผู้ใช้, คอนเทนต์, ห้องประชุม

## 📋 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **State**: React Query + Context API

## 🛠️ Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Setup Environment

สร้างไฟล์ `.env` ในโฟลเดอร์หลัก:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RESEND_API_KEY=your-resend-api-key
VITE_SITE_URL=http://localhost:5173  # สำหรับ development
```

**สำหรับ Production**: 
- **Vercel**: ดูคู่มือใน `VERCEL_SETUP.md` (แนะนำ - ง่ายและเร็วที่สุด)
- **Cloudflare Pages**: ดูคู่มือใน `docs/CLOUDFLARE_SETUP.md`
- **Netlify**: ดูคู่มือทั่วไปใน `docs/DOMAIN_SETUP.md`

### 3. Setup Supabase Database

1. เปิด Supabase Dashboard > SQL Editor
2. คัดลอก SQL จากไฟล์ `supabase/schema.sql`
3. รันทั้งหมด

### 4. ปิด Public Sign-up

1. เปิด Supabase Dashboard > Authentication > Providers
2. ปิด "Enable email confirmations" (ถ้าต้องการ)
3. ไปที่ Settings > Auth > User Signups > ปิด "Allow new users to sign up"

### 5. สร้าง Admin User คนแรก

1. เปิด Supabase Dashboard > Authentication > Users > Add user
2. ใส่ email และ password
3. Copy User ID
4. รัน SQL:

```sql
insert into public.profiles (id, email, full_name, role, is_active)
values ('USER_ID', 'EMAIL', 'Admin Name', 'admin', true);

insert into public.user_wallet (user_id) values ('USER_ID');
insert into public.user_streaks (user_id) values ('USER_ID');
```

### 6. Run Development Server

```bash
npm run dev
```

เปิด http://localhost:5173

## 📁 Project Structure

```
src/
├── app/
│   ├── guards/          # Auth guards
│   ├── layout/          # App & Admin layouts
│   └── routes/          # Router config
├── components/
│   └── ui/              # Reusable UI components
├── contexts/            # React contexts
├── features/
│   ├── admin/           # Admin pages
│   ├── auth/            # Login page
│   ├── learning/        # Learning pages
│   ├── profile/         # Profile page
│   ├── rewards/         # Rewards page
│   └── rooms/           # Room booking
├── hooks/               # Custom hooks
└── lib/                 # Utilities & Supabase client
```

## 🎨 Design System

- **Primary Color**: Blue (#3b82f6)
- **Background**: White/Gray
- **Font**: Inter + Noto Sans Thai

## 📝 License

MIT
