'use client';

import { useCreditBalance } from '@/hooks/useCredits';

export function CreditBalanceCard() {
  const { balance, totalEarned, totalUsed, isLoading } = useCreditBalance();

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="text-sm text-muted-foreground">현재 크레딧</div>
      <div className="text-3xl font-semibold">{isLoading ? '…' : balance}</div>
      <div className="text-xs text-muted-foreground">
        적립 {totalEarned} / 사용 {totalUsed}
      </div>
    </div>
  );
}

