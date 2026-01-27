-- ============================================
-- Add Points System for Room Bookings
-- ============================================
-- ระบบใช้แต้มในการจองห้อง
-- 1 ชั่วโมง = 10 แต้ม
-- 1 วัน จองได้ไม่เกิน 8 ชั่วโมง
-- 1 เดือน จองได้ไม่เกิน 20 ชั่วโมง

-- ============================================
-- 0. สร้างตารางที่จำเป็น (ถ้ายังไม่มี)
-- ============================================

-- Point Rules
CREATE TABLE IF NOT EXISTS public.point_rules (
  key text primary key,
  points int not null,
  is_active boolean not null default true,
  description text,
  updated_at timestamptz not null default now()
);

-- Point Transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_key text not null references public.point_rules(key),
  ref_type text not null,
  ref_id text not null,
  points int not null,
  created_at timestamptz not null default now(),
  constraint uniq_points unique (user_id, rule_key, ref_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_points_user ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_created ON public.point_transactions(created_at);

-- User Wallet
CREATE TABLE IF NOT EXISTS public.user_wallet (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points int not null default 0,
  level int not null default 1,
  updated_at timestamptz not null default now()
);

-- ============================================
-- 1. เพิ่ม Point Rule สำหรับ Booking
-- ============================================
INSERT INTO public.point_rules(key, points, is_active, description)
VALUES ('booking_use', 10, true, 'ใช้แต้มจองห้อง (ต่อชั่วโมง)')
ON CONFLICT (key) DO UPDATE 
SET points = 10, description = 'ใช้แต้มจองห้อง (ต่อชั่วโมง)';

-- ============================================
-- 2. สร้าง Function สำหรับหักแต้ม
-- ============================================
CREATE OR REPLACE FUNCTION public.wallet_deduct_points(
  p_user_id uuid,
  p_points int
)
RETURNS void AS $$
DECLARE
  current_points int;
  new_total int;
BEGIN
  -- ตรวจสอบว่าแต้มเป็นบวก
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;
  
  -- สร้าง wallet ถ้ายังไม่มี
  INSERT INTO public.user_wallet (user_id, total_points, level)
  VALUES (p_user_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;
 
  -- ตรวจสอบว่าแต้มพอหรือไม่
  SELECT total_points INTO current_points
  FROM public.user_wallet
  WHERE user_id = p_user_id;
 
  IF current_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points. Required: %, Available: %', p_points, current_points;
  END IF;
  
  -- หักแต้ม
  UPDATE public.user_wallet
  SET total_points = total_points - p_points, updated_at = now()
  WHERE user_id = p_user_id;
 
  -- คำนวณ level ใหม่
  SELECT total_points INTO new_total
  FROM public.user_wallet
  WHERE user_id = p_user_id;
 
  UPDATE public.user_wallet
  SET level = GREATEST(1, FLOOR(new_total / 500) + 1)::int, updated_at = now()
  WHERE user_id = p_user_id;

  -- Log การใช้แต้มลง system_logs (ถ้ามีตารางนี้)
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'system_logs'
  ) THEN
    INSERT INTO public.system_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      status,
      error_message,
      ip_address,
      user_agent
    )
    VALUES (
      p_user_id,
      'points_deduct',
      'user_wallet',
      p_user_id::text,
      jsonb_build_object(
        'points', p_points,
        'reason', 'room_booking'
      ),
      'success',
      null,
      null,
      null
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. สร้าง Function สำหรับคำนวณชั่วโมงการจอง
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_booking_hours(
  p_start_at timestamptz,
  p_end_at timestamptz
)
RETURNS numeric AS $$
BEGIN
  -- คำนวณชั่วโมง (ปัดขึ้น)
  RETURN CEIL(EXTRACT(EPOCH FROM (p_end_at - p_start_at)) / 3600);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. สร้าง Function สำหรับตรวจสอบชั่วโมงที่จองในวันนี้
-- ============================================
CREATE OR REPLACE FUNCTION public.get_daily_booking_hours(
  p_user_id uuid,
  p_date date
)
RETURNS numeric AS $$
DECLARE
  total_hours numeric;
BEGIN
  SELECT COALESCE(SUM(public.calculate_booking_hours(start_at, end_at)), 0)
  INTO total_hours
  FROM public.room_bookings
  WHERE booked_by_user_id = p_user_id
    AND DATE(start_at) = p_date
    AND status IN ('approved', 'pending');
  
  RETURN total_hours;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 5. สร้าง Function สำหรับตรวจสอบชั่วโมงที่จองในเดือนนี้
-- ============================================
CREATE OR REPLACE FUNCTION public.get_monthly_booking_hours(
  p_user_id uuid,
  p_year int,
  p_month int
)
RETURNS numeric AS $$
DECLARE
  total_hours numeric;
BEGIN
  SELECT COALESCE(SUM(public.calculate_booking_hours(start_at, end_at)), 0)
  INTO total_hours
  FROM public.room_bookings
  WHERE booked_by_user_id = p_user_id
    AND EXTRACT(YEAR FROM start_at) = p_year
    AND EXTRACT(MONTH FROM start_at) = p_month
    AND status IN ('approved', 'pending');
  
  RETURN total_hours;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. เพิ่ม Column สำหรับเก็บแต้มที่ใช้ในการจอง
-- ============================================
ALTER TABLE public.room_bookings
ADD COLUMN IF NOT EXISTS points_used int DEFAULT 0;

-- ============================================
-- 7. สร้าง Index สำหรับการค้นหาชั่วโมงที่จอง
-- ============================================
-- Note: DATE() และ EXTRACT() เป็น IMMUTABLE แต่บางครั้งอาจมีปัญหา
-- ใช้ index แบบง่ายๆ แทน

CREATE INDEX IF NOT EXISTS idx_bookings_user_date 
ON public.room_bookings(booked_by_user_id, start_at, status);

-- Index สำหรับการค้นหาตามเดือน (ใช้ start_at แทน EXTRACT)
CREATE INDEX IF NOT EXISTS idx_bookings_user_start 
ON public.room_bookings(booked_by_user_id, start_at, status);

-- ============================================
-- Success message
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'Booking points system setup completed!';
  RAISE NOTICE 'Rules: 1 hour = 10 points, Max 8 hours/day, Max 20 hours/month';
END $$;
