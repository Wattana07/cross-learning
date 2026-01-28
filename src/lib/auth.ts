import { supabase } from './supabaseClient'
import { logger } from './logger'
import type { Profile } from './database.types'

// Get current user's profile
export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

// Update current user's profile
export async function updateMyProfile(updates: {
  full_name?: string
  department?: string
  avatar_path?: string
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) throw error
}

// Sign in: รองรับทั้งอีเมลปกติ และรหัสสมาชิก HMPM
// - ถ้ามี '@' ให้ถือว่าเป็นอีเมล → ใช้ Supabase Auth ปกติ
// - ถ้าไม่มี '@' → ถือว่าเป็น mem_id ของ HMPM → เรียก edge function hmpm-login ก่อน แล้วค่อย signIn ที่ Supabase
export async function signIn(identifier: string, password: string): Promise<void> {
  // กรณีอีเมลปกติ (สำหรับ admin หรือผู้ใช้ที่สร้างในระบบนี้อยู่แล้ว)
  if (identifier.includes('@')) {
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    })
    if (error) throw error
    return
  }

  // กรณีใช้รหัสสมาชิก HMPM (ไม่มี '@')
  // เรียก edge function เพื่อ:
  // 1) ตรวจสอบกับระบบ HMPM
  // 2) สร้าง/อัปเดต user + profile ใน Supabase
  let fnError: any = null
  let data: any = null
  
  try {
    // ตรวจสอบว่า Supabase client ถูก initialize ถูกต้อง
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL ไม่ได้ตั้งค่า กรุณาตรวจสอบ Environment Variables')
    }

    const result = await supabase.functions.invoke('hmpm-login', {
      body: {
        mem_id: identifier,
        mem_pass: password,
      },
    })
    fnError = result.error
    data = result.data
  } catch (err: any) {
    fnError = err
    console.error('HMPM Login Error:', {
      message: err?.message,
      error: err,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    })
    
    // ถ้าเป็น network error หรือ Edge Function ไม่พบ
    if (err?.message?.includes('non-2xx') || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      throw new Error('ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาตรวจสอบว่า Edge Function ถูก deploy แล้วหรือติดต่อผู้ดูแลระบบ')
    }
    
    // ถ้าเป็น CORS error
    if (err?.message?.includes('CORS') || err?.message?.includes('cors')) {
      throw new Error('เกิดปัญหา CORS กรุณาติดต่อผู้ดูแลระบบ')
    }
  }

  if (fnError || !data?.ok) {
    let errorMessage = 'ไม่สามารถล็อกอินด้วยบัญชี HMPM ได้'
    
    if (data?.error === 'HMPM_CONFIG_MISSING') {
      errorMessage = 'ระบบยังไม่ได้ตั้งค่า HMPM credentials กรุณาติดต่อผู้ดูแลระบบ'
    } else if (data?.error === 'HMPM_TOKEN_HTTP_ERROR' || data?.error === 'HMPM_MEMBER_HTTP_ERROR') {
      errorMessage = data?.message || `เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ HMPM: ${data?.details?.status || 'Unknown'}`
    } else if (data?.error === 'HMPM_MEMBER_ERROR') {
      errorMessage = data?.message || 'รหัสสมาชิกหรือรหัสผ่านไม่ถูกต้อง'
    } else if (data?.error === 'MISSING_CREDENTIALS') {
      errorMessage = 'กรุณากรอกรหัสสมาชิกและรหัสผ่าน'
    } else if (data?.message) {
      errorMessage = data.message
    } else if (fnError?.message) {
      errorMessage = fnError.message
    }
    
    throw new Error(errorMessage)
  }

  const supabaseEmail = data.supabase_email as string | undefined
  if (!supabaseEmail) {
    throw new Error('ไม่พบอีเมลสำหรับ Supabase จาก hmpm-login')
  }

  // หลังจาก edge function สร้าง/อัปเดตรหัสผ่านแล้ว
  // ใช้ mem_pass (password ของผู้ใช้) เพื่อ sign in เข้าระบบ Supabase
  // Supabase ต้องการ password อย่างน้อย 6 ตัวอักษร
  // Edge function จะปรับ password ให้เป็น 6 ตัวอักษรแล้ว (ถ้าสั้นกว่า)
  // ต้องใช้ safePassword เหมือนกับที่ Edge Function ใช้
  // Supabase ต้องการ password อย่างน้อย 6 ตัวอักษร
  // Edge function จะปรับ password ให้เป็น 6 ตัวอักษรแล้ว (ถ้าสั้นกว่า)
  const safePassword = password.length >= 6 ? password : password + "0".repeat(6 - password.length);
  
  // ลอง login ด้วย safePassword ก่อน
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: supabaseEmail,
    password: safePassword,
  });

  // ถ้า login ไม่สำเร็จด้วย safePassword และ password สั้นกว่า 6 ตัว
  // ลอง login ด้วย password เดิม (กรณี user เก่าที่ยังไม่ได้ update)
  if (authError && password.length < 6) {
    const { error: originalError } = await supabase.auth.signInWithPassword({
      email: supabaseEmail,
      password: password,
    });
    
    if (originalError) {
      throw originalError;
    }
    // ถ้า original password สำเร็จ → ไม่ต้อง throw
  } else if (authError) {
    throw authError;
  }
}

// Sign out
export async function signOut(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.auth.signOut()
  if (error) {
    await logger.error('user_logout', {
      errorMessage: error.message,
    })
    throw error
  }
  // Log successful logout
  if (user) {
    await logger.success('user_logout', {
      details: { email: user.email }
    })
  }
}

// Get wallet info
export async function getMyWallet() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_wallet')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching wallet:', error)
    throw error
  }
  return data
}

// Get streak info
export async function getMyStreak() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching streak:', error)
    throw error
  }
  return data
}

// Get my point transactions
export async function getMyTransactions(limit = 20) {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

