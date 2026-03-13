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
        setMessage({ type: 'success', text: '처리가 완료되었습니다.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? '오류가 발생했습니다.' });
      }
    });
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">구독 관리</p>

      <div className="flex flex-wrap gap-2">
        {/* 구독 연장 (30일) */}
        <button
          disabled={isPending}
          onClick={() => handleAction(() => extendSubscription(userId, 30))}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-xs font-medium"
        >
          {isPending ? '...' : '30일 연장'}
        </button>

        {/* 구독 활성화 */}
        {currentStatus !== 'active' && (
          <button
            disabled={isPending}
            onClick={() => handleAction(() => activateSubscription(userId, 'premium'))}
            className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-xs font-medium"
          >
            {isPending ? '...' : '활성화'}
          </button>
        )}

        {/* 구독 해지 */}
        {currentStatus === 'active' && (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm('이 사용자의 구독을 해지하시겠습니까?')) {
                handleAction(() => revokeSubscription(userId));
              }
            }}
            className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 text-xs font-medium"
          >
            {isPending ? '...' : '해지'}
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
