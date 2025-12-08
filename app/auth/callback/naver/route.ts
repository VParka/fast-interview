import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Naver OAuth callback handler
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=naver_auth_error`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state: state || '',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Naver token error:', tokenData);
      return NextResponse.redirect(`${origin}/login?error=naver_token_error`);
    }

    // Get user profile from Naver
    const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (profileData.resultcode !== '00') {
      console.error('Naver profile error:', profileData);
      return NextResponse.redirect(`${origin}/login?error=naver_profile_error`);
    }

    const naverUser = profileData.response;

    // Create or sign in user with Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin operations
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', naverUser.email)
      .single();

    if (existingUser) {
      // User exists, generate magic link to sign them in
      const { data: session } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: naverUser.email,
        options: {
          redirectTo: `${origin}/dashboard`,
        },
      });

      if (session?.properties?.action_link) {
        return NextResponse.redirect(session.properties.action_link);
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: naverUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: naverUser.name,
          avatar_url: naverUser.profile_image,
          provider: 'naver',
          naver_id: naverUser.id,
        },
      });

      if (createError) {
        console.error('User creation error:', createError);
        return NextResponse.redirect(`${origin}/login?error=user_creation_error`);
      }

      // Generate session for new user
      if (newUser?.user) {
        const { data: session } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: naverUser.email,
          options: {
            redirectTo: `${origin}/dashboard`,
          },
        });

        if (session?.properties?.action_link) {
          return NextResponse.redirect(session.properties.action_link);
        }
      }
    }

    // Fallback: redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    console.error('Naver OAuth error:', error);
    return NextResponse.redirect(`${origin}/login?error=naver_oauth_error`);
  }
}
