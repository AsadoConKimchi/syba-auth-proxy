'use client';

import { useState, useTransition } from 'react';
import { extendSubscription, revokeSubscription, activateSubscription } from './actions';

interface UserActionsProps {
  userId: string;
  currentStatus: string | null;
}

export default function UserActions({ userId, currentStatus }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 액션 실행 후 결과 표시
  function handleAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMessage({ type: 'success', text: 'Action completed successfully.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Something went wrong.' });
      }
    });
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Manage Subscription</p>

      <div className="flex flex-wrap gap-2">
        {/* 구독 연장 (30일) */}
        <button
          disabled={isPending}
          onClick={() => handleAction(() => extendSubscription(userId, 30))}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-xs font-medium"
        >
          {isPending ? '...' : 'Extend 30d'}
        </button>

        {/* 구독 활성화 */}
        {currentStatus !== 'active' && (
          <button
            disabled={isPending}
            onClick={() => handleAction(() => activateSubscription(userId, 'premium'))}
            className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-xs font-medium"
          >
            {isPending ? '...' : 'Activate'}
          </button>
        )}

        {/* 구독 취소 */}
        {currentStatus === 'active' && (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm('Are you sure you want to revoke this subscription?')) {
                handleAction(() => revokeSubscription(userId));
              }
            }}
            className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 text-xs font-medium"
          >
            {isPending ? '...' : 'Revoke'}
          </button>
        )}
      </div>

      {/* 결과 메시지 */}
      {message && (
        <div
          className={`mt-3 p-2 rounded text-xs ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
