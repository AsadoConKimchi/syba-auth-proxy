import { getSupabaseAdmin } from '@/lib/supabase';
import PaymentsTable from './PaymentsTable';

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const tierFilter = params.tier || 'all';
  const supabase = getSupabaseAdmin();

  // 결제 목록 조회
  let query = supabase
    .from('payments')
    .select('*, users(display_id), discount_codes(code)')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (tierFilter !== 'all') {
    query = query.eq('tier', tierFilter);
  }

  const { data: payments } = await query;

  return (
    <PaymentsTable
      payments={payments ?? []}
      statusFilter={statusFilter}
      tierFilter={tierFilter}
    />
  );
}
