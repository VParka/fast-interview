'use client';

import { useCreditTransactions } from '@/hooks/useCredits';

export function TransactionList() {
  const { transactions, isLoading } = useCreditTransactions(50);

  if (isLoading) {
    return <div className="rounded-lg border p-4">불러오는 중...</div>;
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="text-sm font-semibold">최근 거래 내역</div>
      <div className="space-y-2">
        {transactions.length === 0 && (
          <div className="text-sm text-muted-foreground">거래 내역이 없습니다.</div>
        )}
        {transactions.map((tx: any) => (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium">{tx.reason}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(tx.created_at).toLocaleString()}
              </div>
            </div>
            <div className="text-sm font-semibold">
              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

