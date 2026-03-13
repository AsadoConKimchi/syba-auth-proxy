import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
}

function MetricCard({ title, value, sub }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  await requireAuth();
  const supabase = getSupabaseAdmin();

  // 총 사용자 수
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // 활성 구독자 수
  const { count: activeSubscribers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // 이번 달 수익
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthlyPayments } = await supabase
    .from('payments')
    .select('amount_sats')
    .eq('status', 'paid')
    .gte('paid_at', monthStart.toISOString());

  const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + (p.amount_sats || 0), 0) ?? 0;

  // 대기 중인 티켓 수
  const { count: openTickets } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress']);

  // 최근 결제 5건
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*, users(display_id)')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="전체 사용자" value={totalUsers ?? 0} />
        <MetricCard title="활성 구독자" value={activeSubscribers ?? 0} />
        <MetricCard
          title="이번 달 수익"
          value={`${monthlyRevenue.toLocaleString()} sats`}
          sub={new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
        />
        <MetricCard title="미처리 티켓" value={openTickets ?? 0} />
      </div>

      {/* 최근 결제 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">최근 결제</h2>
        </div>
        <div className="divide-y">
          {recentPayments?.map((p) => (
            <div key={p.id} className="px-6 py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{(p.users as { display_id: string })?.display_id ?? p.user_id.slice(0, 8)}</span>
                <span className="ml-2 text-gray-500">{p.tier}</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{p.amount_sats.toLocaleString()} sats</span>
                <span className="ml-2 text-gray-400 text-xs">
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString('ko-KR') : ''}
                </span>
              </div>
            </div>
          )) ?? (
            <div className="px-6 py-8 text-center text-gray-400">결제 내역이 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
