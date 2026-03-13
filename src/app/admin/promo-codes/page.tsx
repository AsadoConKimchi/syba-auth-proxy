import { getSupabaseAdmin } from '@/lib/supabase';
import PromoCodesClient from './PromoCodesClient';

export default async function PromoCodesPage() {
  const supabase = getSupabaseAdmin();

  const { data: codes } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });

  // payments 테이블에서 실제 사용 횟수 집계 (discount_code_id가 있는 결제만)
  const codeIds = codes?.map((c) => c.id) ?? [];
  const usageMap: Record<string, number> = {};

  if (codeIds.length > 0) {
    const { data: usages } = await supabase
      .from('payments')
      .select('discount_code_id')
      .in('discount_code_id', codeIds)
      .eq('status', 'paid');

    if (usages) {
      for (const row of usages) {
        usageMap[row.discount_code_id] = (usageMap[row.discount_code_id] || 0) + 1;
      }
    }
  }

  return <PromoCodesClient initialCodes={codes ?? []} usageMap={usageMap} />;
}
