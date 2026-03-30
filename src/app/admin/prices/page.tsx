import { getSupabaseAdmin } from '@/lib/supabase';
import PricesClient from './PricesClient';

export default async function PricesPage() {
  const supabase = getSupabaseAdmin();

  const { data: prices } = await supabase
    .from('subscription_prices')
    .select('*')
    .order('base_multiplier', { ascending: true });

  // 티어별 실제 결제 건수 조회 (status = 'paid')
  const { data: paymentCounts } = await supabase
    .from('payments')
    .select('tier')
    .eq('status', 'paid');

  const soldByTier: Record<string, number> = {};
  (paymentCounts ?? []).forEach((p) => {
    soldByTier[p.tier] = (soldByTier[p.tier] || 0) + 1;
  });

  // 최근 결제 내역 (최신 20건)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('id, user_id, tier, amount_sats, status, paid_at, created_at, discount_code_id')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(20);

  // user_id → display_id 매핑
  const userIds = [...new Set((recentPayments ?? []).map((p) => p.user_id))];
  const { data: users } = userIds.length > 0
    ? await supabase.from('users').select('id, display_id').in('id', userIds)
    : { data: [] };

  const userMap: Record<string, string> = {};
  (users ?? []).forEach((u) => { userMap[u.id] = u.display_id || u.id.slice(0, 8); });

  // discount_code_id → code 매핑
  const discountIds = [...new Set((recentPayments ?? []).filter((p) => p.discount_code_id).map((p) => p.discount_code_id))];
  const { data: discountCodes } = discountIds.length > 0
    ? await supabase.from('discount_codes').select('id, code').in('id', discountIds)
    : { data: [] };

  const discountMap: Record<string, string> = {};
  (discountCodes ?? []).forEach((d) => { discountMap[d.id] = d.code; });

  const paymentsWithDisplay = (recentPayments ?? []).map((p) => ({
    ...p,
    display_id: userMap[p.user_id] || p.user_id.slice(0, 8),
    discount_code: p.discount_code_id ? discountMap[p.discount_code_id] || null : null,
  }));

  // prices에 실제 판매 수량 주입
  const enrichedPrices = (prices ?? []).map((p) => ({
    ...p,
    actual_sold: soldByTier[p.tier] || 0,
  }));

  return <PricesClient initialPrices={enrichedPrices} recentPayments={paymentsWithDisplay} />;
}
