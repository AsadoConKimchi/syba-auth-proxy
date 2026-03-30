'use client';

import { useState } from 'react';

interface SubscriptionPrice {
  id: string;
  tier: 'monthly' | 'annual' | 'lifetime';
  price_sats: number;
  duration_days: number;
  max_quantity: number;
  current_sold: number;
  is_active: boolean;
  base_multiplier: number;
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
}

export default function PricesClient({ initialPrices }: Props) {
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

      setPrices(prices.map((p) => (p.id === id ? data.price : p)));
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

      setPrices(prices.map((p) => (p.id === id ? data.price : p)));
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">가격 정책</h1>
        <p className="text-sm text-gray-500 mt-1">구독 플랜별 가격(sats)과 판매 수량을 관리합니다.</p>
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

      <div className="grid grid-cols-1 gap-4">
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
                      현재 판매: {price.current_sold}개
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
                  <p className="text-xs text-gray-500 mb-1">판매 수량</p>
                  <p className="text-2xl font-bold">
                    {price.current_sold}
                    <span className="text-sm font-normal text-gray-400">
                      /{price.max_quantity === -1 ? '∞' : price.max_quantity}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">판매됨/최대</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">상태</p>
                  <p className="text-sm font-medium mt-1">
                    {price.max_quantity !== -1 && price.current_sold >= price.max_quantity ? (
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
    </div>
  );
}
