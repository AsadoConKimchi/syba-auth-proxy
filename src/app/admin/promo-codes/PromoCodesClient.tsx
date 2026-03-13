'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  applicable_tiers: string[];
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const TIER_OPTIONS = ['monthly', 'annual', 'lifetime'] as const;

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function isExpired(validUntil: string | null) {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

export default function PromoCodesClient({ initialCodes }: { initialCodes: DiscountCode[] }) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새 코드 폼 상태
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 0,
    max_uses: -1,
    valid_until: '',
    applicable_tiers: ['monthly', 'annual', 'lifetime'] as string[],
    description: '',
  });

  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    valid_until: '',
    max_uses: -1,
    description: '',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          valid_until: form.valid_until || null,
          description: form.description || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCodes([data.code, ...codes]);
      setShowForm(false);
      setForm({
        code: '',
        discount_type: 'percent',
        discount_value: 0,
        max_uses: -1,
        valid_until: '',
        applicable_tiers: ['monthly', 'annual', 'lifetime'],
        description: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create code');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCodes(codes.map((c) => (c.id === id ? data.code : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    }
  }

  async function handleEdit(id: string) {
    setLoading(true);
    setError(null);

    try {
      const updates: Record<string, unknown> = {};
      if (editForm.valid_until) updates.valid_until = editForm.valid_until;
      if (editForm.max_uses !== -1) updates.max_uses = editForm.max_uses;
      if (editForm.description) updates.description = editForm.description;

      const res = await fetch('/api/admin/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCodes(codes.map((c) => (c.id === id ? data.code : c)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  function startEditing(code: DiscountCode) {
    setEditingId(code.id);
    setEditForm({
      valid_until: code.valid_until ? code.valid_until.split('T')[0] : '',
      max_uses: code.max_uses,
      description: code.description || '',
    });
  }

  function handleTierToggle(tier: string) {
    setForm((prev) => ({
      ...prev,
      applicable_tiers: prev.applicable_tiers.includes(tier)
        ? prev.applicable_tiers.filter((t) => t !== tier)
        : [...prev.applicable_tiers, tier],
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Code'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">
            dismiss
          </button>
        </div>
      )}

      {/* 새 코드 생성 폼 */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white rounded-lg shadow border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="PROMO2026"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (sats)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Value {form.discount_type === 'percent' ? '(%)' : '(sats)'}
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                min={0}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Uses (-1 = unlimited)</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                min={-1}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valid Until (optional)</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Applicable Tiers</label>
              <div className="flex gap-3 mt-1">
                {TIER_OPTIONS.map((tier) => (
                  <label key={tier} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.applicable_tiers.includes(tier)}
                      onChange={() => handleTierToggle(tier)}
                      className="rounded"
                    />
                    {tier}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Internal note about this promo code"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Code'}
            </button>
          </div>
        </form>
      )}

      {/* 코드 목록 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Value</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Uses</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Valid Until</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tiers</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {codes.length > 0 ? (
              codes.map((code) => {
                const expired = isExpired(code.valid_until);
                const rowClass = expired || !code.is_active ? 'opacity-50' : '';

                return (
                  <tr key={code.id} className={`hover:bg-gray-50 transition-colors ${rowClass}`}>
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium">{code.code}</div>
                      {code.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{code.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {code.discount_type === 'percent' ? '%' : 'sats'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {code.discount_type === 'percent'
                        ? `${code.discount_value}%`
                        : code.discount_value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {code.current_uses}
                      <span className="text-gray-400">
                        /{code.max_uses === -1 ? '∞' : code.max_uses}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(code.valid_until)}
                      {expired && <span className="ml-1 text-red-500">(expired)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {code.applicable_tiers?.map((tier: string) => (
                          <span
                            key={tier}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tier}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(code.id, code.is_active)}
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          code.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {code.is_active ? 'active' : 'inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === code.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <input
                            type="date"
                            value={editForm.valid_until}
                            onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
                            className="px-2 py-1 border rounded text-xs"
                            placeholder="Valid until"
                          />
                          <input
                            type="number"
                            value={editForm.max_uses}
                            onChange={(e) => setEditForm({ ...editForm, max_uses: Number(e.target.value) })}
                            className="px-2 py-1 border rounded text-xs"
                            min={-1}
                            placeholder="Max uses"
                          />
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="px-2 py-1 border rounded text-xs"
                            placeholder="Description"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(code.id)}
                              disabled={loading}
                              className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(code)}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  No promo codes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
