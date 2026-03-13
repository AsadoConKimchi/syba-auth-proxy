import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

const VALID_CATEGORIES = ['서버/인프라', '도메인/SSL', '개발비', '마케팅', '기타'] as const;

async function checkAuth() {
  const isValid = await verifySession();
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// 비용 목록 조회
export async function GET(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expenses: data });
  } catch (error) {
    console.error('[Expenses] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 비용 추가
export async function POST(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const { date, category, description, amount_sats, btc_krw_rate } = await req.json();

    if (!date || !category || !amount_sats) {
      return NextResponse.json({ error: 'date, category, amount_sats are required' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    if (typeof amount_sats !== 'number' || amount_sats <= 0) {
      return NextResponse.json({ error: 'amount_sats must be a positive number' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        date,
        category,
        description: description || '',
        amount_sats,
        btc_krw_rate: btc_krw_rate || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ expense: data });
  } catch (error) {
    console.error('[Expenses] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 비용 삭제
export async function DELETE(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Expenses] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
