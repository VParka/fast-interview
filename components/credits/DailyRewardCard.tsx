'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreditBalance } from '@/hooks/useCredits';
import { toast } from 'sonner';

export function DailyRewardCard() {
  const { balance, refresh } = useCreditBalance();
  const [loading, setLoading] = useState(false);

  const claim = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credit/daily', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? '이미 수령했거나 오류가 발생했습니다.');
      } else {
        toast.success('일일 보상 지급 완료');
        await refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="text-sm text-muted-foreground">오늘의 일일 보상</div>
      <div className="text-lg font-semibold">현재 크레딧: {balance}</div>
      <Button onClick={claim} disabled={loading}>
        {loading ? '처리 중...' : '일일 보상 받기'}
      </Button>
    </div>
  );
}

