import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import UserActions from './UserActions';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 사용자 기본 정보 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (userError || !user) {
    notFound();
  }

  // 구독 정보 조회
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 결제 내역 조회
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      {/* 상단 네비게이션 */}
      <div className="mb-6">
        <Link href="/admin/users" className="text-orange-600 hover:underline text-sm">
          &larr; Back to Users
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        User: {user.display_id ?? user.id.slice(0, 8)}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 사용자 정보 카드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-lg mb-4">User Info</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">ID</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Display ID</dt>
              <dd className="font-medium">{user.display_id ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd>{user.email ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Linking Key</dt>
              <dd className="font-mono text-xs truncate max-w-[200px]">
                {user.linking_key ?? '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd>{new Date(user.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        {/* 구독 정보 카드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-lg mb-4">Subscription</h2>
          {subscription ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      subscription.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : subscription.status === 'expired'
                          ? 'bg-yellow-100 text-yellow-700'
                          : subscription.status === 'revoked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {subscription.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tier</dt>
                <dd className="font-medium">{subscription.tier ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Expires</dt>
                <dd>
                  {subscription.expires_at
                    ? new Date(subscription.expires_at).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Lifetime</dt>
                <dd>{subscription.is_lifetime ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-400 text-sm">No subscription</p>
          )}

          {/* 관리 액션 버튼 */}
          <div className="mt-6 pt-4 border-t">
            <UserActions
              userId={user.id}
              currentStatus={subscription?.status ?? null}
            />
          </div>
        </div>
      </div>

      {/* 결제 내역 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Payment History</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Amount</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Tier</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments && payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">
                    {p.paid_at
                      ? new Date(p.paid_at).toLocaleDateString()
                      : new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {p.amount_sats?.toLocaleString() ?? 0} sats
                  </td>
                  <td className="px-6 py-3">{p.tier ?? '-'}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{p.payment_method ?? '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No payments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
