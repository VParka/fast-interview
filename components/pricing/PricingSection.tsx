"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PricingCard } from "@/components/pricing/PricingCard";
import { PlanSwitcher } from "@/components/pricing/PlanSwitcher";
import { PLANS } from "@/lib/constants/pricing";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { PaymentModal } from "@/components/pricing/PaymentModal";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userTier, setUserTier] = useState<string>("seed");
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.tier) {
        setUserTier(profile.tier);
      }
    };

    fetchUserProfile();
  }, [supabase]);

  const handleSubscribe = (planId: string) => {
    if (planId === "forest") {
      window.open("mailto:joy981017@aive.site?subject=Enterprise%20Plan%20Inquiry", "_blank");
      return;
    }

    if (planId === userTier) {
      return;
    }
    
    // In a real app, you might want to force login here
    // if (!userId) {
    //   toast.error("로그인이 필요합니다.");
    //   // Fallback alert in case toast is not visible
    //   alert("로그인이 필요합니다.\n로그인 후 이용해주세요.");
    //   return;
    // }
    
    setSelectedPlanId(planId);
    setIsPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!userId || !selectedPlanId) return;
    
    setIsProcessing(true);
    
    try {
      // 1. Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Call RPC to add credits (Mocking plan benefit)
      // Bloom plan gives 30,000 bonus credits for testing
      const bonusCredits = selectedPlanId === 'bloom' ? 30000 : 0;
      
      if (bonusCredits > 0) {
        const { error: creditError } = await supabase.rpc('add_credit', {
          p_user_id: userId,
          p_amount: bonusCredits,
          p_reason: `PLAN_UPGRADE_${selectedPlanId.toUpperCase()}`
        });

        if (creditError) {
          console.error("Credit Error:", creditError);
          throw new Error("크레딧 지급에 실패했습니다.");
        }
      }

      // 3. Update User Tier
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tier: selectedPlanId as any }) 
        .eq('id', userId);

      if (profileError) {
        console.error("Profile Error:", profileError);
        throw new Error("플랜 업데이트에 실패했습니다.");
      }

      // Success
      setUserTier(selectedPlanId);
      toast.success("결제가 완료되었습니다!", {
        description: `${selectedPlanId.toUpperCase()} 플랜이 시작되었습니다. (${bonusCredits.toLocaleString()} 크레딧 지급)`
      });
      setIsPaymentModalOpen(false);
      
    } catch (error: any) {
      console.error(error);
      toast.error("결제 처리 중 오류가 발생했습니다.", {
        description: error.message
      });
      alert(`결제 처리 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPlanData = PLANS.find(p => p.id === selectedPlanId);
  const currentPrice = selectedPlanData 
    ? (billingCycle === "monthly" ? selectedPlanData.price.monthly : selectedPlanData.price.annual)
    : "";

  return (
    <section className="py-24 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              당신에게 딱 맞는 요금제
            </h2>
            <p className="mt-4 max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              면접 준비의 시작부터 최종 합격까지, <br className="hidden sm:inline" />
              가장 효율적인 플랜을 선택하세요.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <PlanSwitcher
              isAnnual={billingCycle === "annual"}
              onToggle={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PricingCard
                {...plan}
                billingCycle={billingCycle}
                isCurrentPlan={userTier === plan.id}
                onSubscribe={handleSubscribe}
                isLoading={false}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        planName={selectedPlanData?.name ?? ""}
        price={currentPrice}
        onConfirm={processPayment}
        isLoading={isProcessing}
      />
    </section>
  );
}
