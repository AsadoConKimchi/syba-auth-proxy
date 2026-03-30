'use client';

import { useState } from 'react';

interface SubscriptionPrice {
  id: string;
  tier: 'monthly' | 'annual' | 'lifetime';
  price_sats: number;
  duration_days: number;
  max_quantity: number;
  current_sold: number;
  actual_sold: number;
  is_active: boolean;
  base_multiplier: number;
}

interface Payment {
  id: string;
  user_id: string;
  display_id: string;
  tier: string;
  amount_sats: number;
  status: string;
  paid_at: string;
  discount_code: string | null;
}

const TIER_LABELS: Record<string, string> = {
  monthly: '월간',
  annual: '연간',
  lifetime: '평생',
};

const TIER_COLORS: Record<string, string> = {
  monthly: 'bg-blue-100 text-blue-800',
  annual: 'bg-purple-100 text-purple-800',
  lifetime: 'bg-orange-100 text-orange-800',
};

interface Props {
  initialPrices: SubscriptionPrice[];
  recentPayments: Payment[];
}

export default function PricesClient({ initialPrices, recentPayments }: Props) {
  const [prices, setPrices] = useState(initialPrices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    price_sats: 0,
    max_quantity: -1,
  });

  function startEditing(price: SubscriptionPrice) {
    setEditingId(price.id);
    setEditForm({
      price_sats: price.price_sats,
      max_quantity: price.max_quantity,
    });
    setError(null);
    setSuccess(null);
  }

  async function handleSave(id: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/prices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPrices(prices.map((p) => (p.id === id ? { ...data.price, actual_sold: p.actual_sold } : p)));
      setEditingId(null);
      setSuccess('가격이 수정되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/prices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const existing = prices.find((p) => p.id === id);
      setPrices(prices.map((p) => (p.id === id ? { ...data.price, actual_sold: existing?.actual_sold ?? 0 } : p)));
      setSuccess(`${TIER_LABELS[data.price.tier]} 플랜이 ${data.price.is_active ? '활성화' : '비활성화'}되었습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 실패');
    }
  }

  function formatDuration(days: number) {
    if (days === -1) return '평생';
    if (days >= 365) return `${Math.round(days / 365)}년`;
    if (days >= 30) return `${Math.round(days / 30)}개월`;
    return `${days}일`;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  }

  // 총 매출 계산
  const totalRevenue = recentPayments.reduce((sum, p) => sum + p.amount_sats, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">가격 정책</h1>
        <p className="text-sm text-gray-500 mt-1">구독 플랜별 가격(sats)과 판매 현황을 관리합니다.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-medium hover:underline ml-2">닫기</button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="font-medium hover:underline ml-2">닫기</button>
        </div>
      )}

      {/* 가격 카드 */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {prices.map((price) => (
          <div
            key={price.id}
            className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              price.is_active ? 'border-orange-400' : 'border-gray-300 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[price.tier]}`}>
                  {TIER_LABELS[price.tier]}
                </span>
                <span className="text-sm text-gray-500">{formatDuration(price.duration_days)}</span>
                <span className="text-xs text-gray-400">배수 ×{price.base_multiplier}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(price.id, price.is_active)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    price.is_active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {price.is_active ? '활성' : '비활성'}
                </button>
                {editingId !== price.id && (
                  <button
                    onClick={() => startEditing(price)}
                    className="px-3 py-1 text-xs text-orange-600 border border-orange-300 rounded-full hover:bg-orange-50 transition-colors"
                  >
                    수정
                  </button>
                )}
              </div>
            </div>

            {editingId === price.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">가격 (sats)</label>
                    <input
                      type="number"
                      value={editForm.price_sats}
                      onChange={(e) => setEditForm({ ...editForm, price_sats: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                      min={0}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      현재: {price.price_sats.toLocaleString()} sats
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">최대 판매 수량 (-1 = 무제한)</label>
                    <input
                      type="number"
                      value={editForm.max_quantity}
                      onChange={(e) => setEditForm({ ...editForm, max_quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      min={-1}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      실제 판매: {price.actual_sold}건
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(price.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">가격</p>
                  <p className="text-2xl font-bold font-mono">{price.price_sats.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">sats</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">누적 판매</p>
                  <p className="text-2xl font-bold">
                    {price.actual_sold}
                    <span className="text-sm font-normal text-gray-400">건</span>
                    {price.max_quantity !== -1 && (
                      <span className="text-sm font-normal text-gray-400">
                        {' '}/ {price.max_quantity}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {price.actual_sold * price.price_sats > 0
                      ? `총 ${(price.actual_sold * price.price_sats).toLocaleString()} sats (정가 기준)`
                      : '결제 없음'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">상태</p>
                  <p className="text-sm font-medium mt-1">
                    {price.max_quantity !== -1 && price.actual_sold >= price.max_quantity ? (
                      <span className="text-red-600">품절</span>
                    ) : price.is_active ? (
                      <span className="text-green-600">판매 중</span>
                    ) : (
                      <span className="text-gray-400">판매 중지</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {prices.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
            가격 데이터가 없습니다
          </div>
        )}
      </div>

      {/* 최근 결제 내역 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">최근 결제 내역</h2>
            <p className="text-sm text-gray-500">
              총 {recentPayments.length}건 · {totalRevenue.toLocaleString()} sats
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">사용자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">티어</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">할인코드</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">결제일</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-orange-600 text-xs">{p.display_id}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[p.tier] || 'bg-gray-100 text-gray-600'}`}>
                      {TIER_LABELS[p.tier] || p.tier}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-medium">{p.amount_sats.toLocaleString()} sats</td>
                  <td className="px-6 py-3 text-xs">
                    {p.discount_code ? (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded">{p.discount_code}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-gray-500">{formatDate(p.paid_at)}</td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">결제 내역이 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
