import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useCreditBalance() {
  const { data, error, isLoading, mutate } = useSWR('/api/credit/balance', fetcher);
  return {
    balance: data?.balance ?? 0,
    totalEarned: data?.totalEarned ?? 0,
    totalUsed: data?.totalUsed ?? 0,
    updatedAt: data?.updatedAt ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}

export function useCreditTransactions(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/credit/transactions?limit=${limit}`,
    fetcher
  );
  return {
    transactions: data?.transactions ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}

export function useReferralCode() {
  const { data, error, isLoading, mutate } = useSWR('/api/credit/referral-code', fetcher);
  return {
    referralCode: data?.referralCode ?? '',
    error,
    isLoading,
    refresh: mutate,
  };
}

