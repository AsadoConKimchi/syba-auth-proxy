import { getSupabaseAdmin } from '@/lib/supabase';
import PricesClient from './PricesClient';

export default async function PricesPage() {
  const supabase = getSupabaseAdmin();

  const { data: prices } = await supabase
    .from('subscription_prices')
    .select('*')
    .order('base_multiplier', { ascending: true });

  return <PricesClient initialPrices={prices ?? []} />;
}
