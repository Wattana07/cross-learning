// supabase/functions/create-user/index.ts
// Deploy: supabase functions deploy create-user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  email: string;
  fullName: string;
  department?: string;
  role?: 'learner' | 'admin';
  siteUrl?: string; // Optional: Production site URL for redirect (e.g., https://yourdomain.com)
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response("Unauthorized", { status: 401 });

    const adminClient = createClient(supabaseUrl, serviceKey);
    
    // check if caller is admin
    const profile = await adminClient.from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    
    if (profile.data?.role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, reason: "NOT_ADMIN" }), { 
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const body = (await req.json()) as Body;
    const { email, fullName, department, role = 'learner', siteUrl } = body;

    if (!email || !fullName) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_FIELDS" }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if user with this email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      // Check if profile exists
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id, full_name, email, role, is_active")
        .eq("id", existingUser.id)
        .single();
      
      if (existingProfile) {
        return new Response(JSON.stringify({ 
          ok: false, 
          reason: "USER_EXISTS", 
          error: `อีเมลนี้ถูกใช้งานแล้ว: ${email}`,
          userExists: true,
          hasProfile: true
        }), { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        // User exists in auth but no profile - create profile
        const { error: profileError } = await adminClient.from("profiles").insert({
          id: existingUser.id,
          email,
          full_name: fullName,
          department: department ?? null,
          role,
          is_active: true,
        });

        if (profileError) {
          return new Response(JSON.stringify({ 
            ok: false, 
            reason: "PROFILE_ERROR", 
            error: `ไม่สามารถสร้าง profile: ${profileError.message}` 
          }), { 
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // Check if wallet and streaks exist, create if not
        const { data: existingWallet } = await adminClient
          .from("user_wallet")
          .select("user_id")
          .eq("user_id", existingUser.id)
          .single();
        
        if (!existingWallet) {
          await adminClient.from("user_wallet").insert({ user_id: existingUser.id });
        }

        const { data: existingStreak } = await adminClient
          .from("user_streaks")
          .select("user_id")
          .eq("user_id", existingUser.id)
          .single();
        
        if (!existingStreak) {
          await adminClient.from("user_streaks").insert({ user_id: existingUser.id });
        }

        return new Response(JSON.stringify({ 
          ok: true, 
          userId: existingUser.id,
          message: "Profile created for existing user",
          userExists: true,
          hasProfile: false
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Generate secure random password
    // Password format: 12 characters with uppercase, lowercase, numbers, and special characters
    const generateSecurePassword = () => {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const special = '!@#$%^&*';
      const allChars = uppercase + lowercase + numbers + special;
      
      let password = '';
      // Ensure at least one of each type
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];
      
      // Fill the rest randomly
      for (let i = password.length; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    const generatedPassword = generateSecurePassword();

    // create auth user with the generated password
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: generatedPassword, // Use generated password directly
      email_confirm: true, // Auto-confirm so user can login immediately
    });

    if (authError) {
      return new Response(JSON.stringify({ ok: false, reason: "AUTH_ERROR", error: authError.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: newUser.user.id,
      email,
      full_name: fullName,
      department: department ?? null,
      role,
      is_active: true,
    });

    if (profileError) {
      // rollback: delete auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ ok: false, reason: "PROFILE_ERROR", error: profileError.message }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // create wallet & streaks
    await adminClient.from("user_wallet").insert({ user_id: newUser.user.id });
    await adminClient.from("user_streaks").insert({ user_id: newUser.user.id });

    // Email sending disabled - system continues to work without email notifications
    // User creation is successful, password is generated and stored
    console.log('✅ User created successfully. Email sending is disabled.');

    // Return the generated password so admin can see it
    return new Response(JSON.stringify({ 
      ok: true, 
      userId: newUser.user.id,
      password: generatedPassword // Return generated password for admin to see
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

