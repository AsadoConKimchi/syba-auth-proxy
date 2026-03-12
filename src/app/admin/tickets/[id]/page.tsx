import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';

const STATUS_OPTIONS = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_user: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 티켓 정보 조회
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*, users(display_id, email)')
    .eq('id', id)
    .single();

  if (!ticket) {
    redirect('/admin/tickets');
  }

  // 메시지 목록 조회
  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  // 상태/우선순위 변경 Server Action
  async function updateTicket(formData: FormData) {
    'use server';
    const newStatus = formData.get('status') as string;
    const newPriority = formData.get('priority') as string;
    const supabase = getSupabaseAdmin();

    await supabase.rpc('admin_update_ticket_status', {
      p_ticket_id: id,
      p_status: newStatus,
      p_priority: newPriority,
    });

    revalidatePath(`/admin/tickets/${id}`);
  }

  // 관리자 답변 Server Action
  async function sendReply(formData: FormData) {
    'use server';
    const message = formData.get('message') as string;
    if (!message?.trim()) return;

    const supabase = getSupabaseAdmin();

    await supabase.from('ticket_messages').insert({
      ticket_id: id,
      sender_type: 'admin',
      sender_id: null,
      message: message.trim(),
    });

    // 답변 후 상태를 waiting_user로 변경
    await supabase.rpc('admin_update_ticket_status', {
      p_ticket_id: id,
      p_status: 'waiting_user',
      p_priority: ticket.priority,
    });

    revalidatePath(`/admin/tickets/${id}`);
  }

  const user = ticket.users as { display_id: string; email: string } | null;

  return (
    <div className="max-w-4xl">
      {/* 뒤로 가기 */}
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        &larr; Back to tickets
      </Link>

      {/* 티켓 헤더 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">{ticket.subject}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{ticket.category}</span>
              <span>|</span>
              <span>{user?.display_id ?? ticket.display_id ?? '-'}</span>
              <span>|</span>
              <span>{user?.email ?? ticket.user_email ?? '-'}</span>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {ticket.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex gap-6 text-xs text-gray-400">
          <span>Created: {formatDate(ticket.created_at)}</span>
          <span>Updated: {formatDate(ticket.updated_at)}</span>
          {ticket.resolved_at && <span>Resolved: {formatDate(ticket.resolved_at)}</span>}
        </div>
      </div>

      {/* 상태/우선순위 변경 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3 text-sm">Update Status</h2>
        <form action={updateTicket} className="flex items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              name="status"
              defaultValue={ticket.status}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Priority</label>
            <select
              name="priority"
              defaultValue={ticket.priority}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-800 transition-colors"
          >
            Update
          </button>
        </form>
      </div>

      {/* 메시지 스레드 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-4 text-sm">Messages ({messages?.length || 0})</h2>
        <div className="space-y-4">
          {messages && messages.length > 0 ? (
            messages.map((msg) => {
              const isAdmin = msg.sender_type === 'admin';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 ${
                      isAdmin
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${isAdmin ? 'text-gray-300' : 'text-gray-500'}`}>
                        {isAdmin ? 'Admin' : 'User'}
                      </span>
                      <span className={`text-xs ${isAdmin ? 'text-gray-400' : 'text-gray-400'}`}>
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-400 py-4">No messages yet</p>
          )}
        </div>
      </div>

      {/* 관리자 답변 폼 */}
      {ticket.status !== 'closed' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3 text-sm">Reply</h2>
          <form action={sendReply}>
            <textarea
              name="message"
              rows={4}
              required
              placeholder="Type your reply..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors"
              >
                Send Reply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
