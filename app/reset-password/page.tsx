"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
    setReady(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) return setError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে।");
    if (password !== confirm) return setError("দুইটি পাসওয়ার্ড মিলছে না।");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Reset failed.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold text-slate-900">Reset password</h1>
      {done ? (
        <>
          <p className="mt-3 text-sm text-slate-500">Your password has been updated. Please sign in with your new password.</p>
          <Link href="/account" className="mt-6 rounded-full bg-primary px-6 py-3 text-center text-sm font-bold text-white">
            Sign in
          </Link>
        </>
      ) : ready && !token ? (
        <>
          <p className="mt-3 text-sm text-slate-500">This reset link is invalid or incomplete.</p>
          <Link href="/account" className="mt-6 rounded-full bg-primary px-6 py-3 text-center text-sm font-bold text-white">
            Back to account
          </Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <input
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="New password"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            name="confirm"
            type="password"
            minLength={8}
            required
            placeholder="Confirm new password"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </main>
  );
}
