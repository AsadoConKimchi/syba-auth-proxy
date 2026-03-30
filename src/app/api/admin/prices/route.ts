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

// 가격 목록 조회
export async function GET() {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('subscription_prices')
      .select('*')
      .order('base_multiplier', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prices: data });
  } catch (error) {
    console.error('[Prices] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 가격 수정 (price_sats, is_active, max_quantity)
export async function PATCH(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const allowedFields = ['price_sats', 'is_active', 'max_quantity'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // price_sats 유효성 검사
    if ('price_sats' in safeUpdates) {
      const val = Number(safeUpdates.price_sats);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ error: 'price_sats must be a non-negative number' }, { status: 400 });
      }
      safeUpdates.price_sats = val;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('subscription_prices')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ price: data });
  } catch (error) {
    console.error('[Prices] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
