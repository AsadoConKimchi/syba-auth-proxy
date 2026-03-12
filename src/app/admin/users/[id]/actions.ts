'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

// 구독 연장 (기본 30일)
export async function extendSubscription(userId: string, days: number = 30, note?: string) {
  await requireAuth();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('admin_extend_subscription', {
    p_user_id: userId,
    p_days: days,
    p_note: note ?? `Admin: extended ${days} days`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

// 구독 취소
export async function revokeSubscription(userId: string, note?: string) {
  await requireAuth();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('admin_revoke_subscription', {
    p_user_id: userId,
    p_note: note ?? 'Admin: subscription revoked',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

// 구독 활성화
export async function activateSubscription(userId: string, tier: string = 'premium', note?: string) {
  await requireAuth();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('admin_activate_subscription', {
    p_user_id: userId,
    p_tier: tier,
    p_note: note ?? `Admin: activated ${tier} subscription`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}
