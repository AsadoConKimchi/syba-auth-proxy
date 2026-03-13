import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '대시보드', icon: '📊' },
  { href: '/admin/users', label: '사용자', icon: '👤' },
  { href: '/admin/tickets', label: '티켓', icon: '🎫' },
  { href: '/admin/payments', label: '결제', icon: '⚡' },
  { href: '/admin/analytics', label: '매출 분석', icon: '📈' },
  { href: '/admin/promo-codes', label: '프로모션 코드', icon: '🎟️' },
];

// 공유 사이드바 레이아웃 — 인증(requireAuth)은 각 layout.tsx에서 호출
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <nav className="w-56 bg-gray-900 text-white p-4 flex flex-col">
        <div className="text-xl font-bold text-orange-400 mb-8 px-2">SYBA Admin</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 mb-1 text-sm"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
