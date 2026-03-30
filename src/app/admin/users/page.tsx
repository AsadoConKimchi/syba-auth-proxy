import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface UsersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { q } = await searchParams;
  const supabase = getSupabaseAdmin();

  // 사용자 목록 조회 (구독 정보 + 만료일 포함)
  let query = supabase
    .from('users')
    .select('id, display_id, email, created_at, subscriptions(status, tier, expires_at, is_lifetime)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`display_id.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: users, error } = await query;

  // 만료된 구독 자동 업데이트 (status='active' && expires_at < now && !is_lifetime)
  const now = new Date();
  const expiredSubIds: string[] = [];
  if (users) {
    for (const user of users) {
      const sub = Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions;
      if (sub && sub.status === 'active' && !sub.is_lifetime && sub.expires_at) {
        if (new Date(sub.expires_at) < now) {
          expiredSubIds.push(user.id);
        }
      }
    }
  }

  // 만료된 구독 DB status 일괄 업데이트
  if (expiredSubIds.length > 0) {
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .in('user_id', expiredSubIds)
      .eq('status', 'active')
      .lt('expires_at', now.toISOString())
      .eq('is_lifetime', false);
  }

  // 실시간 상태 계산 헬퍼
  function getEffectiveStatus(sub: { status: string; expires_at: string | null; is_lifetime: boolean } | null) {
    if (!sub) return null;
    if (sub.status !== 'active') return sub.status;
    if (sub.is_lifetime) return 'active';
    if (sub.expires_at && new Date(sub.expires_at) < now) return 'expired';
    return 'active';
  }

  function getStatusLabel(status: string | null) {
    if (!status) return null;
    switch (status) {
      case 'active': return '활성';
      case 'expired': return '만료';
      case 'revoked': return '해지';
      case 'cancelled': return '취소';
      default: return status;
    }
  }

  function getStatusColor(status: string | null) {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-yellow-100 text-yellow-700';
      case 'revoked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">사용자 관리</h1>

      {/* 검색 폼 */}
      <form method="GET" className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Display ID 또는 이메일로 검색..."
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
          >
            검색
          </button>
          {q && (
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              초기화
            </Link>
          )}
        </div>
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">
          오류: {error.message}
        </div>
      )}

      {/* 사용자 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Display ID</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">이메일</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">구독</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users && users.length > 0 ? (
              users.map((user) => {
                const sub = Array.isArray(user.subscriptions)
                  ? user.subscriptions[0]
                  : user.subscriptions;

                const effectiveStatus = getEffectiveStatus(sub as { status: string; expires_at: string | null; is_lifetime: boolean } | null);

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-orange-600 hover:underline font-medium"
                      >
                        {user.display_id ?? '-'}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{user.email ?? '-'}</td>
                    <td className="px-6 py-3">
                      {sub && effectiveStatus ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(effectiveStatus)}`}
                        >
                          {getStatusLabel(effectiveStatus)}
                          {(sub as { tier?: string }).tier ? ` (${(sub as { tier?: string }).tier})` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">없음</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  {q ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {users && (
        <p className="mt-4 text-sm text-gray-500">
          {users.length}명 표시 중
          {q ? ` (검색어: "${q}")` : ''}
        </p>
      )}
    </div>
  );
}
