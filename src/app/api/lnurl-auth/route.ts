import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://tbjfzenhrjcygvqfpqwl.supabase.co';

// LNURL-auth 프록시 — Supabase Edge Function으로 요청 전달
export async function GET(req: NextRequest) {
  try {
    const queryString = req.nextUrl.search;
    const targetUrl = `${SUPABASE_URL}/functions/v1/lnurl-auth${queryString}`;

    console.log('[Proxy] Request:', req.method, targetUrl);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { status: 'ERROR', reason: 'Proxy error' },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
