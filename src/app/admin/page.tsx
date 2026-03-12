'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 토큰 자동 로그인 처리
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // 토큰이 있으면 API 라우트로 리다이렉트
      window.location.href = `/api/admin/auth?token=${token}`;
      return;
    }

    const errorParam = searchParams.get('error');
    if (errorParam === 'invalid_token') {
      setError('Invalid or expired token');
    } else if (errorParam === 'verification_failed') {
      setError('Token verification failed');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('Invalid password');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center mb-2">SYBA Admin</h1>
      <p className="text-gray-500 text-center mb-6 text-sm">관리자 대시보드</p>

      <form onSubmit={handleLogin}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin Password"
          className="w-full border border-gray-300 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-orange-500 text-white py-2 rounded-md font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm text-center text-gray-400">
          Loading...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
