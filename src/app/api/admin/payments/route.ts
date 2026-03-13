import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

async function checkAuth() {
  const isValid = await verifySession();
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// 결제 상태 변경 (pending → expired만 허용)
export async function PATCH(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const { ids, status } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    if (status !== 'expired') {
      return NextResponse.json({ error: 'Only status change to "expired" is allowed' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // pending 상태인 것만 변경 (안전장치)
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'expired' })
      .in('id', ids)
      .eq('status', 'pending')
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (error) {
    console.error('[Payments] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 결제 삭제 (pending 상태만 허용)
export async function DELETE(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // pending 상태인 것만 삭제 (paid 삭제 방지)
    const { data, error } = await supabase
      .from('payments')
      .delete()
      .in('id', ids)
      .eq('status', 'pending')
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: data?.length ?? 0 });
  } catch (error) {
    console.error('[Payments] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
