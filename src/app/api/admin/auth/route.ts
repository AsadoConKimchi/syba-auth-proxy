import { NextRequest, NextResponse } from 'next/server';
import { createSession, COOKIE_NAME } from '@/lib/auth';

// 비밀번호 로그인
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await createSession();

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Admin Auth] Login error:', error);
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
}

// 토큰 기반 자동 로그인
export async function GET(req: NextRequest) {
  const tokenParam = req.nextUrl.searchParams.get('token');

  if (!tokenParam) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    // Supabase Edge Function으로 토큰 검증
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const verifyRes = await fetch(`${supabaseUrl}/functions/v1/admin-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ action: 'verify', token: tokenParam }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.valid) {
      // 토큰 검증 실패 — 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/admin?error=invalid_token', req.url));
    }

    // JWT 세션 쿠키 설정
    const sessionToken = await createSession();

    const response = NextResponse.redirect(new URL('/admin/dashboard', req.url));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Admin Auth] Token verification error:', error);
    return NextResponse.redirect(new URL('/admin?error=verification_failed', req.url));
  }
}
