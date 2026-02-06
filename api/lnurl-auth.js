// LNURL-auth 프록시 - Supabase Edge Function으로 요청 전달
export default async function handler(req, res) {
  const SUPABASE_URL = 'https://tbjfzenhrjcygvqfpqwl.supabase.co';

  try {
    // 쿼리 파라미터 추출
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const targetUrl = `${SUPABASE_URL}/functions/v1/lnurl-auth?${queryString}`;

    console.log('[Proxy] Request:', req.method, targetUrl);

    // Supabase로 요청 전달
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // CORS 헤더 추가
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({ status: 'ERROR', reason: 'Proxy error' });
  }
}
