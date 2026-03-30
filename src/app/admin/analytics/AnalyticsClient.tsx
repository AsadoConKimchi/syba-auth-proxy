'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

interface TierData {
  tier: string;
  sats: number;
  count: number;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount_sats: number;
  btc_krw_rate: number | null;
  created_at: string;
}

interface Summary {
  totalRevenue: number;
  totalCount: number;
  avgRevenue: number;
  totalExpenses: number;
}

interface FeatureUsage {
  event: string;
  count: number;
}

interface CohortData {
  cohort: string;
  months: Array<{ month: number; retention: number }>;
}

interface MrrData {
  mrr: number;
  arr: number;
  subscribers: { monthly: number; annual: number; lifetime: number };
  totalActive: number;
}

interface Props {
  monthlyData: MonthlyData[];
  tierData: TierData[];
  summary: Summary;
  expenses: Expense[];
  btcKrwRate: number;
  dateRange: { from: string; to: string };
  preset: string;
  featureUsageData: FeatureUsage[];
  cohortData: CohortData[];
  mrrData: MrrData;
}

const PRESETS = [
  { key: 'this-month', label: '이번 달' },
  { key: 'last-month', label: '지난 달' },
  { key: '3months', label: '최근 3개월' },
  { key: '6months', label: '최근 6개월' },
  { key: 'year', label: '올해' },
  { key: 'all', label: '전체' },
];

const TIER_LABELS: Record<string, string> = {
  monthly: '월간',
  annual: '연간',
  lifetime: '평생',
};

const TIER_COLORS: Record<string, string> = {
  monthly: '#3B82F6',
  annual: '#F97316',
  lifetime: '#22C55E',
};

const PIE_COLORS = ['#3B82F6', '#F97316', '#22C55E', '#8B5CF6', '#EF4444'];

const CATEGORIES = ['서버/인프라', '도메인/SSL', '개발비', '마케팅', '기타'] as const;

// sats → 원화 환산
function satsToKrw(sats: number, rate: number): string {
  if (!rate) return '?';
  const krw = (sats / 100_000_000) * rate;
  if (krw >= 10000) return `${Math.round(krw / 10000)}만`;
  return Math.round(krw).toLocaleString();
}

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

const EVENT_LABELS: Record<string, string> = {
  app_open: '앱 실행',
  subscription_view: '구독 페이지 조회',
  payment_start: '결제 시작',
  payment_complete: '결제 완료',
  ticket_created: '티켓 생성',
  expense_added: '지출 입력',
  income_added: '수입 입력',
  transfer_added: '이체',
  backup_created: '백업 생성',
  backup_restored: '백업 복원',
  recurring_set: '정기 항목 설정',
  recurring_executed: '정기 항목 실행',
  asset_added: '자산 추가',
  card_added: '카드 추가',
  premium_gate_viewed: '프리미엄 게이트 노출',
  settings_changed: '설정 변경',
};

export default function AnalyticsClient({
  monthlyData, tierData, summary, expenses, btcKrwRate, dateRange, preset,
  featureUsageData, cohortData, mrrData,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState(dateRange.from);
  const [customTo, setCustomTo] = useState(dateRange.to);

  // 프리셋 URL 생성
  function presetUrl(key: string) {
    return `/admin/analytics?preset=${key}`;
  }

  function handleCustomRange() {
    router.push(`/admin/analytics?from=${customFrom}&to=${customTo}`);
  }

  // 비용 추가
  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      date: form.get('date') as string,
      category: form.get('category') as string,
      description: form.get('description') as string,
      amount_sats: Number(form.get('amount_sats')),
      btc_krw_rate: btcKrwRate || null,
    };

    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '비용 추가 실패');
    } finally {
      setFormLoading(false);
    }
  }

  // 비용 삭제
  async function handleDeleteExpense(id: string) {
    if (!window.confirm('이 비용을 삭제하시겠습니까?')) return;
    setError(null);

    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  }

  // 커스텀 Tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: { value: number; name: string; color: string }, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {formatSats(entry.value)} sats
            {btcKrwRate > 0 && <span className="text-gray-400 ml-1">(≈₩{satsToKrw(entry.value, btcKrwRate)})</span>}
          </p>
        ))}
      </div>
    );
  };

  const isCustomRange = !!(new URLSearchParams(window.location.search).get('from'));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">매출 분석</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium hover:underline">닫기</button>
        </div>
      )}

      {/* 기간 선택기 */}
      <div className="mb-6">
        <span className="text-xs text-gray-400 block mb-1.5">기간</span>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRESETS.map((p) => (
            <Link
              key={p.key}
              href={presetUrl(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                preset === p.key && !isCustomRange
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          />
          <button
            onClick={handleCustomRange}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
          >
            조회
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="총 매출"
          value={`${formatSats(summary.totalRevenue)} sats`}
          sub={btcKrwRate > 0 ? `≈₩${satsToKrw(summary.totalRevenue, btcKrwRate)}` : undefined}
        />
        <SummaryCard label="결제 건수" value={`${summary.totalCount}건`} />
        <SummaryCard
          label="평균 결제"
          value={`${formatSats(summary.avgRevenue)} sats`}
        />
        <SummaryCard
          label="총 비용"
          value={`${formatSats(summary.totalExpenses)} sats`}
          sub={btcKrwRate > 0 ? `≈₩${satsToKrw(summary.totalExpenses, btcKrwRate)}` : undefined}
        />
      </div>

      {/* 월별 매출/비용 차트 */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">월별 매출 / 비용</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="revenue" name="매출" fill="#F97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="비용" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 티어별 매출 비중 */}
      {tierData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">티어별 매출 비중</h2>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie
                  data={tierData}
                  dataKey="sats"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(props: any) =>
                    `${TIER_LABELS[props.name] || props.name} ${(props.percent * 100).toFixed(0)}%`
                  }
                >
                  {tierData.map((entry, i) => (
                    <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    `${formatSats(Number(value))} sats${btcKrwRate > 0 ? ` (≈₩${satsToKrw(Number(value), btcKrwRate)})` : ''}`,
                    TIER_LABELS[name] || name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {tierData.map((t) => (
                <div key={t.tier} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TIER_COLORS[t.tier] || '#9CA3AF' }}
                  />
                  <span className="font-medium">{TIER_LABELS[t.tier] || t.tier}</span>
                  <span className="text-gray-500">{t.count}건</span>
                  <span className="font-mono">{formatSats(t.sats)} sats</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MRR/ARR */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">MRR / ARR (사토시 기반)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="MRR"
            value={`${formatSats(mrrData.mrr)} sats`}
            sub={btcKrwRate > 0 ? `≈₩${satsToKrw(mrrData.mrr, btcKrwRate)}` : undefined}
          />
          <SummaryCard
            label="ARR"
            value={`${formatSats(mrrData.arr)} sats`}
            sub={btcKrwRate > 0 ? `≈₩${satsToKrw(mrrData.arr, btcKrwRate)}` : undefined}
          />
          <SummaryCard label="활성 구독자" value={`${mrrData.totalActive}명`} />
          <SummaryCard
            label="구독 구성"
            value={`월${mrrData.subscribers.monthly} / 연${mrrData.subscribers.annual} / 평생${mrrData.subscribers.lifetime}`}
          />
        </div>
        {/* 손익 계산 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-2">기간 내 손익</h3>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-400">매출 - 비용</span>
              <p className={`text-lg font-bold ${summary.totalRevenue - summary.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.totalRevenue - summary.totalExpenses >= 0 ? '+' : ''}{formatSats(summary.totalRevenue - summary.totalExpenses)} sats
              </p>
            </div>
            {btcKrwRate > 0 && (
              <div>
                <span className="text-xs text-gray-400">원화 환산</span>
                <p className={`text-lg font-bold ${summary.totalRevenue - summary.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ≈₩{satsToKrw(Math.abs(summary.totalRevenue - summary.totalExpenses), btcKrwRate)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 기능별 사용률 */}
      {featureUsageData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">기능별 사용률</h2>
          <div className="space-y-2">
            {featureUsageData.map((f) => {
              const maxCount = featureUsageData[0]?.count || 1;
              const pct = Math.round((f.count / maxCount) * 100);
              return (
                <div key={f.event} className="flex items-center gap-3">
                  <span className="text-sm w-40 text-gray-600 truncate">{EVENT_LABELS[f.event] || f.event}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                    <div
                      className="bg-orange-400 h-5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-gray-500 w-16 text-right">{f.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 코호트 잔존율 */}
      {cohortData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">코호트 잔존율</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">코호트</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">M0</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">M1</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">M2</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">M3</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">M4</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-500">M5</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cohortData.slice(-6).map((c) => (
                  <tr key={c.cohort} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{c.cohort}</td>
                    {c.months.map((m) => {
                      const bg = m.retention >= 50
                        ? 'bg-green-100 text-green-800'
                        : m.retention >= 20
                        ? 'bg-yellow-100 text-yellow-800'
                        : m.retention > 0
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-300';
                      return (
                        <td key={m.month} className={`px-3 py-2 text-center font-mono ${bg}`}>
                          {m.retention}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">최근 6개 코호트 표시. M0=가입 월, M1=1개월 후...</p>
        </div>
      )}

      {/* 비용 메모 섹션 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">비용 메모</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
          >
            {showForm ? '취소' : '비용 추가'}
          </button>
        </div>

        {/* 비용 추가 폼 */}
        {showForm && (
          <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">날짜</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">카테고리</label>
                <select
                  name="category"
                  required
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">설명</label>
                <input
                  type="text"
                  name="description"
                  placeholder="설명 입력"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">금액 (sats)</label>
                <input
                  type="number"
                  name="amount_sats"
                  required
                  min={1}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-1.5 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {formLoading ? '저장 중...' : '저장'}
            </button>
          </form>
        )}

        {/* 비용 목록 */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">날짜</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">카테고리</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">설명</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">금액</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.length > 0 ? (
                expenses.map((exp) => {
                  const rate = exp.btc_krw_rate || btcKrwRate;
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">{exp.date}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{exp.category}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{exp.description || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatSats(exp.amount_sats)} sats
                        {rate > 0 && (
                          <span className="text-gray-400 ml-1 text-xs">
                            (≈₩{satsToKrw(exp.amount_sats, rate)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="px-2 py-1 text-xs text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    비용 내역이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {btcKrwRate > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            환율: 1 BTC ≈ ₩{Math.round(btcKrwRate).toLocaleString()} (Bithumb 기준)
          </p>
        )}
      </div>
    </div>
  );
}

// 요약 카드 컴포넌트
function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
