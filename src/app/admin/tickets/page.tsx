import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase';

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_user: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  all: '전체',
  open: '신규',
  in_progress: '처리중',
  waiting_user: '사용자 대기',
  resolved: '해결',
  closed: '종료',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600 font-bold',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('support_tickets')
    .select('*, users(display_id)')
    .order('updated_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: tickets } = await query;

  const ticketIds = tickets?.map((t) => t.id) ?? [];
  let messageCounts: Record<string, number> = {};

  if (ticketIds.length > 0) {
    const { data: counts } = await supabase
      .from('ticket_messages')
      .select('ticket_id')
      .in('ticket_id', ticketIds);

    if (counts) {
      for (const row of counts) {
        messageCounts[row.ticket_id] = (messageCounts[row.ticket_id] || 0) + 1;
      }
    }
  }

  return (
    <div>
      <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6">티켓 관리</h1>

      {/* 상태 필터 */}
      <div className="flex flex-wrap gap-2 mb-4 lg:mb-6">
        {STATUS_OPTIONS.map((status) => (
          <Link
            key={status}
            href={status === 'all' ? '/admin/tickets' : `/admin/tickets?status=${status}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              statusFilter === status
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {STATUS_LABELS[status] || status}
          </Link>
        ))}
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="lg:hidden space-y-3">
        {tickets && tickets.length > 0 ? (
          tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/tickets/${ticket.id}`}
              className="block bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </span>
                <span className="text-xs text-gray-400">{formatDate(ticket.updated_at)}</span>
              </div>
              <p className="font-medium text-gray-900 text-sm mb-1">{ticket.subject}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{ticket.category}</span>
                <span className={PRIORITY_COLORS[ticket.priority] || 'text-gray-500'}>
                  {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                </span>
                <span>{(ticket.users as { display_id: string })?.display_id ?? ticket.display_id ?? '-'}</span>
                {(messageCounts[ticket.id] || 0) > 0 && (
                  <span className="ml-auto">💬 {messageCounts[ticket.id]}</span>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
            티켓이 없습니다
          </div>
        )}
      </div>

      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">우선순위</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">카테고리</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">제목</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">사용자</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">수정일</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">메시지</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block">
                      <span className={`text-xs ${PRIORITY_COLORS[ticket.priority] || 'text-gray-500'}`}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block text-gray-600">
                      {ticket.category}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block font-medium text-gray-900 hover:text-blue-600">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block text-gray-500">
                      {(ticket.users as { display_id: string })?.display_id ?? ticket.display_id ?? '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block text-gray-400">
                      {formatDate(ticket.updated_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/admin/tickets/${ticket.id}`} className="block text-gray-500">
                      {messageCounts[ticket.id] || 0}
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  티켓이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
