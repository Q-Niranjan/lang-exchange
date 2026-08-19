"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState } from "@/components/app/empty-state";
import { useToast } from "@/components/app/toast-provider";
import { api, ApiError, PaymentOrder, Plan, User } from "@/lib/api";
import { PRACTICE_PARTNER_LABEL } from "@/lib/labels";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cashfree?: any;
  }
}

function trialDaysLeft(premiumUntil?: string): number | null {
  if (!premiumUntil) return null;
  const diff = new Date(premiumUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatAmount(paise: number, currency: string) {
  const amount = paise / 100;
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const FEATURES = [
  `Unlimited ${PRACTICE_PARTNER_LABEL.toLowerCase()} sessions`,
  "Text chat with partners",
  "Friends list & call again",
  "Streak & level tracking",
  "Call history & leaderboard",
];

function downloadInvoice(order: PaymentOrder, username: string) {
  const lines = [
    "LangFluency — Invoice",
    "─────────────────────────────",
    `Invoice ID: ${order.id}`,
    `Customer: ${username}`,
    `Plan: ${order.plan.replace(/_/g, " ")}`,
    `Amount: ${formatAmount(order.amount_paise, order.currency)}`,
    `Status: ${order.status}`,
    `Gateway: ${order.gateway}`,
    `Date: ${formatDate(order.created_at)}`,
    order.gateway_order_id ? `Gateway Order: ${order.gateway_order_id}` : "",
    "─────────────────────────────",
    "Thank you for your purchase.",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `langfluency-invoice-${order.id.slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlanPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const cashfreeRef = useRef<unknown>(null);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: Plan[] }>("/api/v1/payments/plans"),
  });

  const historyQuery = useQuery({
    queryKey: ["payment-history"],
    queryFn: () => api<{ orders: PaymentOrder[] }>("/api/v1/payments/history"),
  });

  const cashfreeConfig = useQuery({
    queryKey: ["cashfree-config"],
    queryFn: () => api<{ env: string; app_id: string }>("/api/v1/payments/config"),
  });

  useEffect(() => {
    if (!cashfreeConfig.data) return;
    const env = cashfreeConfig.data.env === "production" ? "production" : "sandbox";
    const sdkUrl = "https://sdk.cashfree.com/js/v3/cashfree.js";
    if (document.querySelector(`script[src="${sdkUrl}"]`)) return;
    const script = document.createElement("script");
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) cashfreeRef.current = window.Cashfree({ mode: env });
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
      const sessionId = data.checkout?.payment_session_id;
      if (!sessionId) { toast.error("Missing payment session."); return; }
      if (cashfreeRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cf = cashfreeRef.current as any;
        const checkout = await cf.checkout({ paymentSessionId: sessionId, redirectTarget: "_modal" });
        if (checkout.error) {
          toast.error(checkout.error.message || "Payment failed.");
        } else if (checkout.paymentDetails?.paymentStatus === "SUCCESS") {
          await api("/api/v1/payments/verify", { method: "POST", body: JSON.stringify({ order_id: data.id }) });
          toast.success("Payment successful! Premium activated.");
          void qc.invalidateQueries({ queryKey: ["me"] });
          void qc.invalidateQueries({ queryKey: ["payment-history"] });
        }
      } else {
        toast.error("Payment SDK not loaded. Refresh and try again.");
      }
    },
    onError: (err: ApiError) => toast.error(err.message || "Could not create order."),
  });

  if (me.isLoading) return <LoadingState />;

  const u = me.data!;
  const daysLeft = trialDaysLeft(u.premium_until);
  const plans = plansQuery.data?.plans ?? [];
  const orders = historyQuery.data?.orders ?? [];
  const paidOrder = orders.find((o) => o.status === "paid");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Plan"
        description="Manage your subscription and billing."
      />

      {/* Current plan */}
      <section className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Current plan</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">
              {u.is_premium ? "Premium" : "Free"}
            </p>
            <p className="text-sm text-muted-foreground">
              {u.premium_until
                ? `Renews / expires ${formatDate(u.premium_until)}`
                : "No active subscription"}
            </p>
            {daysLeft !== null && u.is_premium && (
              <p className="text-xs text-muted-foreground mt-1">{daysLeft} days remaining</p>
            )}
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
            u.is_premium ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {u.is_premium ? "Active" : "Inactive"}
          </span>
        </div>
        {paidOrder && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Last purchase</p>
              <p className="font-medium">{formatDate(paidOrder.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium">{formatAmount(paidOrder.amount_paise, paidOrder.currency)}</p>
            </div>
          </div>
        )}
      </section>

      {/* Available plans */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-foreground">Available plans</h2>
        {plansQuery.isLoading ? (
          <LoadingState label="Loading plans…" />
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.duration_days} days access</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {formatAmount(plan.amount_paise, plan.currency)}
                  </p>
                </div>
                <ul className="mb-4 space-y-1.5">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={createOrder.isPending}
                  onClick={() => createOrder.mutate(plan.id)}
                  className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createOrder.isPending ? (
                    <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Processing…</span>
                  ) : (
                    `Upgrade — ${formatAmount(plan.amount_paise, plan.currency)}`
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Billing history */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">Billing history</h2>
        {historyQuery.isLoading ? (
          <LoadingState label="Loading history…" />
        ) : orders.length === 0 ? (
          <EmptyState title="No invoices yet" description="Your payment history will appear here." />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium capitalize text-foreground">{order.plan.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)} · {formatAmount(order.amount_paise, order.currency)}
                  </p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                    order.status === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { downloadInvoice(order, u.username); toast.info("Invoice downloaded."); }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Invoice
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
