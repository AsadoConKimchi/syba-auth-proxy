import { getSupabaseAdmin } from '@/lib/supabase';
import PromoCodesClient from './PromoCodesClient';

export default async function PromoCodesPage() {
  const supabase = getSupabaseAdmin();

  const { data: codes } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false });

  return <PromoCodesClient initialCodes={codes ?? []} />;
}
