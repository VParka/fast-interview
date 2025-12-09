'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReferralCode } from '@/hooks/useCredits';
import { toast } from 'sonner';

export function ReferralCard() {
  const { referralCode, refresh } = useReferralCode();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const copy = async () => {
    if (!referralCode) {
      toast.error('추천 코드가 없습니다.');
      return;
    }
    await navigator.clipboard.writeText(referralCode);
    toast.success('추천 코드가 복사되었습니다.');
  };

  const apply = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credit/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: input }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? '추천 적용 실패');
      } else {
        toast.success('추천 보상 지급 완료');
        await refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">나의 추천 코드</div>
          <div className="text-lg font-semibold">{referralCode || '생성 중...'}</div>
        </div>
        <Button variant="outline" onClick={copy} disabled={!referralCode}>
          복사
        </Button>
      </div>

      <div className="pt-2 space-y-2">
        <div className="text-sm font-medium">친구 추천 코드 입력</div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="예: ABCD1234"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
          />
          <Button onClick={apply} disabled={loading || !input}>
            {loading ? '적용 중...' : '적용'}
          </Button>
        </div>
      </div>
    </div>
  );
}

