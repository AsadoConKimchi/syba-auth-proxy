'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Payment {
  id: string;
  user_id: string;
  amount_sats: number | null;
  status: string;
  tier: string;
  created_at: string;
  paid_at: string | null;
  discount_code_id: string | null;
  discount_amount_sats: number | null;
  users: { display_id: string } | null;
  discount_codes: { code: string } | null;
}

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

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

interface Props {
  payments: Payment[];
  statusFilter: string;
  tierFilter: string;
}

const STATUS_OPTIONS = ['all', 'pending', 'paid', 'expired'] as const;
const TIER_OPTIONS = ['all', 'monthly', 'annual', 'lifetime'] as const;

export default function PaymentsTable({ payments: initialPayments, statusFilter, tierFilter }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payments = initialPayments;
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const pendingIds = new Set(pendingPayments.map((p) => p.id));

  // 통계
  const totalSats = payments.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount_sats || 0 : 0), 0);
  const paidCount = payments.filter((p) => p.status === 'paid').length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === pendingIds.size) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  }

  async function handleExpire(ids: string[]) {
    if (!window.confirm(`${ids.length}건을 만료 처리하시겠습니까?`)) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'expired' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expire');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(ids: string[]) {
    if (!window.confirm(`${ids.length}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  // 필터 URL 생성
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

  const selectedArray = Array.from(selected);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="text-sm text-gray-500">
          {paidCount} paid / {payments.length} total
          {paidCount > 0 && (
            <span className="ml-2 font-medium text-gray-700">
              ({totalSats.toLocaleString()} sats)
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">
            dismiss
          </button>
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap gap-6 mb-6">
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

      {/* 일괄 액션 바 */}
      {selected.size > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
          <span className="text-sm font-medium text-orange-800">
            {selected.size}건 선택
          </span>
          <button
            onClick={() => handleExpire(selectedArray)}
            disabled={loading}
            className="px-3 py-1.5 bg-yellow-500 text-white rounded-md text-xs font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '처리중...' : `${selected.size}건 만료 처리`}
          </button>
          <button
            onClick={() => handleDelete(selectedArray)}
            disabled={loading}
            className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '처리중...' : `${selected.size}건 삭제`}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-500 hover:underline"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* 결제 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-8">
                {pendingPayments.length > 0 && (
                  <input
                    type="checkbox"
                    checked={selected.size === pendingIds.size && pendingIds.size > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                )}
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Amount (sats)</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Discount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Paid</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {payment.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selected.has(payment.id)}
                        onChange={() => toggleSelect(payment.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {payment.users?.display_id ?? payment.user_id?.slice(0, 8) ?? '-'}
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
                    {payment.status === 'pending' && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({daysAgo(payment.created_at)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {payment.discount_code_id ? (
                      <div>
                        <span className="font-medium">
                          {payment.discount_codes?.code ?? '-'}
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
                  <td className="px-4 py-3">
                    {payment.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleExpire([payment.id])}
                          disabled={loading}
                          className="px-2 py-1 text-xs text-yellow-700 bg-yellow-50 rounded hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                        >
                          Expire
                        </button>
                        <button
                          onClick={() => handleDelete([payment.id])}
                          disabled={loading}
                          className="px-2 py-1 text-xs text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
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
