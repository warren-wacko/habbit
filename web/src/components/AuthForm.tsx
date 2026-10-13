"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { Wordmark } from "./Logo";

// A decorative "last six weeks" grid: the same pattern every time, so the
// server and the browser always agree on it
const GRID = (() => {
  let seed = 3;
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const colors = ["#232927", "#4a5a1e", "#8db02a", "#ccf33c"];
  return Array.from({ length: 42 }, (_, i) => {
    if (i === 41) return "#f1f4ee"; // today
    const x = next() + i / 120;
    return colors[x > 0.62 ? 3 : x > 0.4 ? 2 : x > 0.18 ? 1 : 0];
  });
})();

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLogin = mode === "login";

  // The sign-in pages are always dark, so the page behind them must be too (otherwise a light
  // strip shows when a phone keyboard shifts the view). The flag is set only while this page
  // is on screen: after sign-in the app keeps it hidden rather than removed, and its cleanup
  // still runs then.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.auth = "";
    return () => {
      delete root.dataset.auth;
    };
  }, []);

  const auth = useMutation({
    mutationFn: () =>
      api<AuthResponse>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (data) => {
      tokenStore.set(data.token);
      queryClient.clear(); // drop cached data from any previous user
      router.push("/");
    },
  });

  function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    auth.mutate();
  }

  return (
    <div className="auth-page min-h-dvh bg-[#0e1111] text-[#f1f4ee]">
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        <div className="flex flex-1 flex-col gap-[22px] px-6 pb-6 pt-9">
          <Wordmark size={22} variant="ink" />
          <h1 className="display mt-2 text-[2.75rem] uppercase leading-[0.96]">
            {isLogin ? (
              <>
                Every day
                <br />
                <span className="text-[#ccf33c]">counts.</span>
              </>
            ) : (
              <>
                Start your
                <br />
                <span className="text-[#ccf33c]">streak.</span>
              </>
            )}
          </h1>
          <div
            aria-hidden="true"
            className="grid gap-[5px]"
            style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
          >
            {GRID.map((c, i) => (
              <span key={i} className="aspect-square rounded-[5px]" style={{ background: c }} />
            ))}
          </div>
          <p className="text-sm text-[#9aa39e]">Tick off your habits and keep your streak going.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3.5 rounded-t-[28px] bg-ground px-6 pb-7 pt-6 text-ink"
        >
          <h2 className="display text-2xl">{isLogin ? "Log in" : "Create account"}</h2>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              autoComplete={isLogin ? "current-password" : "new-password"}
              aria-describedby={isLogin ? undefined : "password-hint"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            {!isLogin && (
              <p id="password-hint" className="hint">
                At least 8 characters.
              </p>
            )}
          </div>

          {auth.isError && (
            <p role="alert" className="alert">
              {auth.error.message}
            </p>
          )}

          <button type="submit" disabled={auth.isPending} className="btn">
            {auth.isPending ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
          </button>

          <p className="text-center text-muted">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <Link href={isLogin ? "/register" : "/login"} className="font-bold">
              {isLogin ? "Create an account" : "Log in"}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
