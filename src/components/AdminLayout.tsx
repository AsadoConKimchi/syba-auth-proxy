'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '대시보드', icon: '📊' },
  { href: '/admin/users', label: '사용자', icon: '👤' },
  { href: '/admin/tickets', label: '티켓', icon: '🎫' },
  { href: '/admin/payments', label: '결제', icon: '⚡' },
  { href: '/admin/analytics', label: '매출 분석', icon: '📈' },
  { href: '/admin/promo-codes', label: '프로모션 코드', icon: '🎟️' },
  { href: '/admin/prices', label: '가격 정책', icon: '💰' },
  { href: '/admin/sentry', label: '에러 모니터링', icon: '🐛' },
];

// 공유 사이드바 레이아웃 — 인증(requireAuth)은 각 layout.tsx에서 호출
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <nav
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-56 bg-gray-900 text-white p-4 flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <span className="text-xl font-bold text-orange-400">SYBA Admin</span>
          <button
            className="lg:hidden text-gray-400 hover:text-white text-xl"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 mb-1 text-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* 모바일 헤더 */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button
            className="text-gray-700 hover:text-gray-900 text-xl"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <span className="font-semibold text-orange-500">SYBA Admin</span>
        </div>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
