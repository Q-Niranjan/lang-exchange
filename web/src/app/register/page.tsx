"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, ArrowRight } from "lucide-react";

import { PhoneInput } from "@/components/ui/phone-input";

import { api, ApiError, TokenPair } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useToast } from "@/components/app/toast-provider";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [form, setForm] = useState({
    mobile_number: "",
    password: "",
    otp: "",
  });

  const register = useMutation({
    mutationFn: () =>
      api("/api/v1/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          mobile_number: form.mobile_number,
          password: form.password,
        }),
      }),
    onSuccess: () => {
      toast.info("Enter the OTP sent to your phone.");
      setStep("otp");
    },
    onError: (err: ApiError) => toast.error(err.message || "Could not register"),
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
      toast.success("Account verified! Welcome to LangFluency.");
      router.push("/app/home");
    },
    onError: (err: ApiError) => toast.error(err.message || "Invalid OTP"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "form") register.mutate();
    else verify.mutate();
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-12 bg-background text-foreground">
      <div className="w-full max-w-md space-y-6">

        <div className="text-center space-y-2">
          <h1 className="font-extrabold text-2xl sm:text-3xl text-foreground">
            {step === "form" ? "Create Account" : "Verify Phone Number"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {step === "form"
              ? "Sign up with your mobile number and a password."
              : `Enter the OTP code sent to ${form.mobile_number}.`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5 text-card-foreground">
          <form className="space-y-4" onSubmit={onSubmit}>
            {step === "form" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Mobile Number
                  </label>
                  <PhoneInput
                    required
                    value={form.mobile_number}
                    onChange={(mobile_number) => setForm({ ...form, mobile_number })}
                  />
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
                      autoComplete="new-password"
                      placeholder="Choose a password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Enter OTP Code
                </label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={register.isPending || verify.isPending}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <span>{step === "form" ? "Send OTP Code" : "Verify & Continue"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
