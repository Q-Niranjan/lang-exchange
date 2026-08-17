"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, Smartphone, ArrowRight, ShieldCheck } from "lucide-react";

import { api, ApiError, TokenPair } from "@/lib/api";
import { setTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [form, setForm] = useState({ mobile_number: "", password: "", otp: "" });

  const login = useMutation({
    mutationFn: () =>
      api<TokenPair>("/api/v1/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          mobile_number: form.mobile_number,
          password: form.password,
        }),
      }),
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/app");
    },
    onError: (err: ApiError) => {
      if (err.error === "unverified") {
        setNeedOtp(true);
        setError("Account not verified. Enter the OTP that was resent.");
        return;
      }
      setError(err.message || "Could not log in");
    },
  });

  const verify = useMutation({
    mutationFn: () =>
      api<TokenPair>("/api/v1/auth/verify-otp", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ mobile_number: form.mobile_number, otp: form.otp }),
      }),
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/app");
    },
    onError: (err: ApiError) => setError(err.message || "Invalid OTP"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (needOtp) verify.mutate();
    else login.mutate();
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-12 bg-background text-foreground">
      <div className="w-full max-w-md space-y-6">

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-extrabold text-2xl sm:text-3xl text-foreground">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Log in to enter the EngFluency practice studio.</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5 text-card-foreground">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mobile Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  required
                  type="text"
                  placeholder="+19876543210"
                  value={form.mobile_number}
                  onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
              </div>
            </div>

            {needOtp ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Verification OTP Code
                </label>
                <input
                  required
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                />
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                ⚠️ {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={login.isPending || verify.isPending}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <span>{needOtp ? "Verify & Continue" : "Log In"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            Don't have an account yet?{" "}
            <Link href="/register" className="text-foreground font-bold hover:underline">
              Register for Free
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
