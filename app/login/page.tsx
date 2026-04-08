"use client";

import { useEffect, useState } from "react";
import { ArrowRight, RefreshCcw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

function safeRedirectTarget(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function buildCentralLoginUrl({
  redirectTo,
  reason,
  attempt,
}: {
  redirectTo: string;
  reason: string;
  attempt: number;
}) {
  const loginUrl = new URL(
    process.env.NEXT_PUBLIC_CENTRAL_LOGIN_URL ?? "https://cumulush.com/login"
  );

  loginUrl.searchParams.set("redirectTo", redirectTo);
  loginUrl.searchParams.set("auth_src", "rune");
  loginUrl.searchParams.set("auth_reason", reason);
  loginUrl.searchParams.set("auth_rid", crypto.randomUUID());
  loginUrl.searchParams.set("auth_attempt", String(Math.max(1, attempt)));

  return loginUrl.toString();
}

function readQueryState() {
  if (typeof window === "undefined") {
    return {
      redirectTarget: "/",
      authReason: "no_user",
      authAttempt: 0,
      handoff: false,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    redirectTarget: safeRedirectTarget(params.get("redirectTo")),
    authReason: params.get("auth_reason") ?? params.get("authReason") ?? "no_user",
    authAttempt:
      Number.parseInt(params.get("auth_attempt") ?? params.get("authAttempt") ?? "0", 10) || 0,
    handoff: params.get("handoff") === "1",
  };
}

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<"checking" | "redirecting" | "retry">("checking");
  const [queryState] = useState(readQueryState);

  const { redirectTarget, authReason, authAttempt, handoff } = queryState;

  useEffect(() => {
    let isActive = true;

    const continueToTarget = () => {
      setStatus("redirecting");
      window.location.replace(redirectTarget);
    };

    const redirectToCentralLogin = () => {
      setStatus("redirecting");

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("handoff", "1");

      window.location.replace(
        buildCentralLoginUrl({
          redirectTo: returnUrl.toString(),
          reason: authReason,
          attempt: authAttempt + 1,
        })
      );
    };

    const resolveSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) return;

      if (session?.user) {
        continueToTarget();
        return;
      }

      if (handoff) {
        setStatus("retry");
        return;
      }

      redirectToCentralLogin();
    };

    void resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive || !session?.user) return;
      continueToTarget();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [authAttempt, authReason, handoff, redirectTarget, supabase]);

  const retryLogin = () => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set("handoff", "1");

    window.location.replace(
      buildCentralLoginUrl({
        redirectTo: returnUrl.toString(),
        reason: authReason,
        attempt: authAttempt + 1,
      })
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/12 bg-[color:var(--metric-surface-2)] p-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-[color:var(--metric-surface-3)] text-lg font-semibold">
            R
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Rune</p>
            <h1 className="text-xl font-semibold text-white">Workflow Access</h1>
          </div>
        </div>

        {status === "retry" ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-white/70">
              Rune did not detect a shared session after the last sign-in handoff. Retry the federated login once from here.
            </p>
            <button
              type="button"
              onClick={retryLogin}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:border-white/35 hover:bg-white/14"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry Sign In
            </button>
            <a
              href="https://cumulush.com/dashboard"
              className="flex items-center justify-center gap-2 text-sm text-white/50 transition hover:text-white"
            >
              Back to Cumulus
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-white/70">
              {status === "redirecting"
                ? "Finishing your sign-in and loading Rune."
                : "Checking your shared Cumulus session."}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-white/70" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
