"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Crown, Check, CreditCard, Clock, AlertCircle,
  RefreshCw, ChevronRight,
} from "lucide-react";

import { api, ApiError, type PaymentOrder, type Plan, type User } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cashfree?: any;
  }
}

function trialInfo(premiumUntil?: string): { daysLeft: number; isExpired: boolean } {
  if (!premiumUntil) return { daysLeft: 0, isExpired: true };
  const diff = new Date(premiumUntil).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { daysLeft: Math.max(0, days), isExpired: diff <= 0 };
}

function formatAmount(paise: number, currency: string) {
  const amount = paise / 100;
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount}`;
}

const PLAN_FEATURES = [
  "All voice matching sessions",
  "Text chat with practice partners",
  "Friend list & call-again",
  "Daily streak & level tracker",
  "Peer ratings & fluency score",
  "Full call history",
  "Priority matching queue",
];

export default function BillingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const cashfreeRef = useRef<unknown>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    setReady(true);
  }, [router]);

  const me = useQuery({
    queryKey: ["me"],
    enabled: ready,
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    enabled: ready,
    queryFn: () => api<{ plans: Plan[] }>("/api/v1/payments/plans"),
  });

  const historyQuery = useQuery({
    queryKey: ["payment-history"],
    enabled: ready,
    queryFn: () => api<{ orders: PaymentOrder[] }>("/api/v1/payments/history"),
  });

  const cashfreeConfig = useQuery({
    queryKey: ["cashfree-config"],
    enabled: ready,
    queryFn: () => api<{ env: string; app_id: string }>("/api/v1/payments/config"),
  });

  // Load Cashfree JS SDK
  useEffect(() => {
    if (!cashfreeConfig.data) return;
    const env = cashfreeConfig.data.env === "production" ? "production" : "sandbox";
    const sdkUrl = `https://sdk.cashfree.com/js/v3/cashfree.js`;
    const existing = document.querySelector(`script[src="${sdkUrl}"]`);
    if (existing) return;
    const script = document.createElement("script");
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) {
        cashfreeRef.current = window.Cashfree({ mode: env });
      }
    };
    document.head.appendChild(script);
  }, [cashfreeConfig.data]);

  const createOrder = useMutation({
    mutationFn: (planId: string) =>
      api<{ checkout: { payment_session_id: string }; id: string }>("/api/v1/payments/orders", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      }),
    onSuccess: async (data) => {
      setCheckoutError("");
      const sessionId = data.checkout?.payment_session_id;
      if (!sessionId) { setCheckoutError("Missing payment session. Try again."); return; }

      // Use Cashfree drop-in checkout
      if (cashfreeRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cf = cashfreeRef.current as any;
        const checkout = await cf.checkout({
          paymentSessionId: sessionId,
          redirectTarget: "_modal",
        });
        if (checkout.error) {
          setCheckoutError(checkout.error.message || "Payment failed.");
        } else if (checkout.paymentDetails?.paymentStatus === "SUCCESS") {
          await api("/api/v1/payments/verify", {
            method: "POST",
            body: JSON.stringify({ order_id: data.id }),
          });
          await qc.invalidateQueries({ queryKey: ["me"] });
          await qc.invalidateQueries({ queryKey: ["payment-history"] });
        }
      } else {
        setCheckoutError("Payment SDK not loaded. Please refresh and try again.");
      }
    },
    onError: (err: ApiError) => setCheckoutError(err.message || "Could not create order."),
  });

  if (!ready || me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const u = me.data!;
  const { daysLeft, isExpired } = trialInfo(u.premium_until);
  const plans = plansQuery.data?.plans ?? [];
  const orders = historyQuery.data?.orders ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8 space-y-6 text-foreground animate-fadeUp">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/profile"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Profile
        </Link>
        <h1 className="font-extrabold text-lg text-foreground">Billing & Plan</h1>
      </div>

      {/* Current plan status */}
      <div className={`rounded-2xl border p-6 space-y-3 ${
        isExpired
          ? "border-destructive/40 bg-destructive/5"
          : daysLeft <= 3
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-brand-blue/30 bg-brand-blue/5"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isExpired ? "bg-destructive/15 text-destructive" : "bg-brand-blue/15 text-brand-blue-light"
            }`}>
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-base text-foreground">
                {isExpired ? "Subscription Expired" : u.is_premium ? "Premium Active" : "No Plan"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isExpired
                  ? "Renew to continue practicing"
                  : u.premium_until
                  ? `Expires ${new Date(u.premium_until).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                  : "No expiry set"}
              </p>
            </div>
          </div>
          {!isExpired && daysLeft > 0 && (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              daysLeft <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-brand-blue/15 text-brand-blue-light"
            }`}>
              <Clock className="h-3 w-3" />
              {daysLeft} days left
            </div>
          )}
        </div>

        {isExpired && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Your practice access has expired. Choose a plan below to continue.
          </div>
        )}
        {!isExpired && daysLeft <= 3 && daysLeft > 0 && (
          <p className="text-xs text-amber-400 font-semibold">
            Your trial expires soon. Upgrade now to keep your streak and history.
          </p>
        )}
      </div>

      {/* Plans */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-sm text-foreground uppercase tracking-wider px-1">Choose a Plan</h2>
        {checkoutError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs font-semibold text-destructive">
            {checkoutError}
          </div>
        )}

        {plansQuery.isLoading && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading plans…</div>
        )}

        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl border border-brand-blue/30 bg-card p-5 space-y-4 hover:border-brand-blue/60 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-base text-foreground">{plan.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.duration_days} days access</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-xl text-foreground">{formatAmount(plan.amount_paise, plan.currency)}</p>
                <p className="text-[11px] text-muted-foreground">one-time</p>
              </div>
            </div>

            <ul className="space-y-1.5">
              {PLAN_FEATURES.slice(0, 4).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-brand-blue-light shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={createOrder.isPending}
              onClick={() => createOrder.mutate(plan.id)}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-brand-blue py-3 text-sm font-bold text-white shadow-blue-glow hover:bg-brand-blue-dark disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {createOrder.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pay {formatAmount(plan.amount_paise, plan.currency)}</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Payment history */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-sm text-foreground uppercase tracking-wider px-1">Payment History</h2>
        {historyQuery.isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">Loading…</div>
        )}
        {!historyQuery.isLoading && orders.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">No payments yet</p>
            <p className="text-xs text-muted-foreground">Your payment history will appear here after your first purchase.</p>
          </div>
        )}
        {orders.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {orders.map((order, i) => (
              <div key={order.id} className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10">
                  <CreditCard className="h-4 w-4 text-brand-blue-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate capitalize">{order.plan.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">{order.gateway}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatAmount(order.amount_paise, order.currency)}</p>
                  <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${
                    order.status === "paid"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : order.status === "created"
                      ? "bg-muted text-muted-foreground"
                      : "bg-destructive/15 text-destructive"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
