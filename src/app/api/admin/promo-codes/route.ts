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

// 프로모션 코드 목록 조회
export async function GET() {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes: data });
  } catch (error) {
    console.error('[Promo Codes] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 새 프로모션 코드 생성
export async function POST(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_tiers, description } = body;

    if (!code || !discount_type || discount_value == null) {
      return NextResponse.json({ error: 'code, discount_type, discount_value are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('discount_codes')
      .insert({
        code: code.toUpperCase(),
        discount_type,
        discount_value,
        max_uses: max_uses ?? -1,
        valid_from: valid_from || new Date().toISOString(),
        valid_until: valid_until || null,
        applicable_tiers: applicable_tiers || ['monthly', 'annual', 'lifetime'],
        description: description || null,
        is_active: true,
        current_uses: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: data }, { status: 201 });
  } catch (error) {
    console.error('[Promo Codes] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 프로모션 코드 수정
export async function PATCH(req: NextRequest) {
  const authError = await checkAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 허용된 필드만 업데이트
    const allowedFields = ['is_active', 'valid_until', 'max_uses', 'description'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('discount_codes')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: data });
  } catch (error) {
    console.error('[Promo Codes] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
