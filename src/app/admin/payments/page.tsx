import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

const STATUS_OPTIONS = ['all', 'pending', 'paid', 'expired'] as const;
const TIER_OPTIONS = ['all', 'monthly', 'annual', 'lifetime'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const tierFilter = params.tier || 'all';
  const supabase = getSupabaseAdmin();

  // 결제 목록 조회
  let query = supabase
    .from('payments')
    .select('*, users(display_id), discount_codes(code)')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (tierFilter !== 'all') {
    query = query.eq('tier', tierFilter);
  }

  const { data: payments } = await query;

  // 필터 URL 생성 헬퍼
  function filterUrl(key: string, value: string) {
    const p = new URLSearchParams();
    if (key === 'status') {
      if (value !== 'all') p.set('status', value);
      if (tierFilter !== 'all') p.set('tier', tierFilter);
    } else {
      if (statusFilter !== 'all') p.set('status', statusFilter);
      if (value !== 'all') p.set('tier', value);
    }
    const qs = p.toString();
    return `/admin/payments${qs ? `?${qs}` : ''}`;
  }

  // 통계
  const totalSats = payments?.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount_sats || 0 : 0), 0) ?? 0;
  const paidCount = payments?.filter((p) => p.status === 'paid').length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="text-sm text-gray-500">
          {paidCount} paid / {payments?.length ?? 0} total
          {paidCount > 0 && (
            <span className="ml-2 font-medium text-gray-700">
              ({totalSats.toLocaleString()} sats)
            </span>
          )}
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-6 mb-6">
        {/* 상태 필터 */}
        <div>
          <span className="text-xs text-gray-400 block mb-1.5">Status</span>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((status) => (
              <Link
                key={status}
                href={filterUrl('status', status)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  statusFilter === status
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </Link>
            ))}
          </div>
        </div>

        {/* 티어 필터 */}
        <div>
          <span className="text-xs text-gray-400 block mb-1.5">Tier</span>
          <div className="flex gap-1.5">
            {TIER_OPTIONS.map((tier) => (
              <Link
                key={tier}
                href={filterUrl('tier', tier)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tierFilter === tier
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tier === 'all' ? 'All' : tier}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 결제 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Amount (sats)</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Discount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments && payments.length > 0 ? (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {(payment.users as { display_id: string })?.display_id ??
                      payment.user_id?.slice(0, 8) ??
                      '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {payment.amount_sats?.toLocaleString() ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{payment.tier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {payment.discount_code_id ? (
                      <div>
                        <span className="font-medium">
                          {(payment.discount_codes as { code: string })?.code ?? '-'}
                        </span>
                        {payment.discount_amount_sats ? (
                          <span className="ml-1 text-green-600">
                            (-{payment.discount_amount_sats.toLocaleString()})
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(payment.created_at)}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(payment.paid_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No payments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
