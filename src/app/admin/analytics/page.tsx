import { getSupabaseAdmin } from '@/lib/supabase';
import AnalyticsClient from './AnalyticsClient';

// 프리셋 → 날짜 범위 변환
function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];

  switch (preset) {
    case 'last-month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const from = d.toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to: lastDay.toISOString().split('T')[0] };
    }
    case '3months': {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: d.toISOString().split('T')[0], to };
    }
    case '6months': {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from: d.toISOString().split('T')[0], to };
    }
    case 'year': {
      return { from: `${now.getFullYear()}-01-01`, to };
    }
    case 'all': {
      return { from: '2020-01-01', to };
    }
    default: {
      // 이번 달
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to };
    }
  }
}

// 월 키 생성 (YYYY-MM)
function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

// BTC/KRW 환율 fetch (Bithumb public API)
async function fetchBtcKrwRate(): Promise<number> {
  try {
    const res = await fetch('https://api.bithumb.com/public/ticker/BTC_KRW', {
      next: { revalidate: 300 }, // 5분 캐시
    });
    const json = await res.json();
    return Number(json.data?.closing_price) || 0;
  } catch {
    return 0;
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const preset = params.preset || 'this-month';

  // 커스텀 날짜 또는 프리셋 사용
  let dateRange: { from: string; to: string };
  if (params.from && params.to) {
    dateRange = { from: params.from, to: params.to };
  } else {
    dateRange = getDateRange(preset);
  }

  const supabase = getSupabaseAdmin();

  // 결제 데이터 조회 (paid만)
  const { data: payments } = await supabase
    .from('payments')
    .select('amount_sats, tier, paid_at')
    .eq('status', 'paid')
    .gte('paid_at', `${dateRange.from}T00:00:00`)
    .lte('paid_at', `${dateRange.to}T23:59:59`)
    .order('paid_at', { ascending: true });

  // 비용 데이터 조회
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', dateRange.from)
    .lte('date', dateRange.to)
    .order('date', { ascending: false });

  // BTC/KRW 환율
  const btcKrwRate = await fetchBtcKrwRate();

  // 월별 매출 집계
  const monthlyRevenue: Record<string, number> = {};
  const tierRevenue: Record<string, { sats: number; count: number }> = {};
  let totalRevenue = 0;
  let totalCount = 0;

  for (const p of payments ?? []) {
    const sats = p.amount_sats || 0;
    totalRevenue += sats;
    totalCount += 1;

    // 월별
    const month = toMonthKey(p.paid_at!);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + sats;

    // 티어별
    const tier = p.tier || 'unknown';
    if (!tierRevenue[tier]) tierRevenue[tier] = { sats: 0, count: 0 };
    tierRevenue[tier].sats += sats;
    tierRevenue[tier].count += 1;
  }

  // 월별 비용 집계
  const monthlyExpenses: Record<string, number> = {};
  let totalExpenses = 0;

  for (const e of expenses ?? []) {
    const sats = e.amount_sats || 0;
    totalExpenses += sats;
    const month = toMonthKey(e.date);
    monthlyExpenses[month] = (monthlyExpenses[month] || 0) + sats;
  }

  // 모든 월 키 수집 + 정렬
  const allMonths = Array.from(
    new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyExpenses)])
  ).sort();

  const monthlyData = allMonths.map((month) => ({
    month,
    revenue: monthlyRevenue[month] || 0,
    expenses: monthlyExpenses[month] || 0,
  }));

  const tierData = Object.entries(tierRevenue).map(([tier, data]) => ({
    tier,
    sats: data.sats,
    count: data.count,
  }));

  const summary = {
    totalRevenue,
    totalCount,
    avgRevenue: totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0,
    totalExpenses,
  };

  return (
    <AnalyticsClient
      monthlyData={monthlyData}
      tierData={tierData}
      summary={summary}
      expenses={expenses ?? []}
      btcKrwRate={btcKrwRate}
      dateRange={dateRange}
      preset={preset}
    />
  );
}
