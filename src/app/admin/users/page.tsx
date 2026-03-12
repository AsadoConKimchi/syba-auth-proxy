import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

interface UsersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { q } = await searchParams;
  const supabase = getSupabaseAdmin();

  // 사용자 목록 조회 (구독 정보 포함)
  let query = supabase
    .from('users')
    .select('id, display_id, email, created_at, subscriptions(status, tier)')
    .order('created_at', { ascending: false })
    .limit(100);

  // 검색어가 있으면 display_id 또는 email로 필터
  if (q) {
    query = query.or(`display_id.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: users, error } = await query;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {/* 검색 폼 */}
      <form method="GET" className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by display_id or email..."
            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
          >
            Search
          </button>
          {q && (
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">
          Error: {error.message}
        </div>
      )}

      {/* 사용자 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Display ID</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Subscription</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users && users.length > 0 ? (
              users.map((user) => {
                // subscriptions는 배열로 반환될 수 있음 — 첫 번째(최신) 항목 사용
                const sub = Array.isArray(user.subscriptions)
                  ? user.subscriptions[0]
                  : user.subscriptions;

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
                      {sub ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            sub.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : sub.status === 'expired'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {sub.status} {sub.tier ? `(${sub.tier})` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  {q ? 'No users found matching your search.' : 'No users yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 결과 카운트 */}
      {users && (
        <p className="mt-4 text-sm text-gray-500">
          Showing {users.length} user{users.length !== 1 ? 's' : ''}
          {q ? ` for "${q}"` : ''}
        </p>
      )}
    </div>
  );
}
