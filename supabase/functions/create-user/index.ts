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

