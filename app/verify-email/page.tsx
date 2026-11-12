"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type State = "loading" | "ok" | "error";

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setMessage("Verification token is missing from the link.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setState("ok");
        } else {
          setState("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      {state === "loading" && <p className="text-slate-500">Verifying your email…</p>}
      {state === "ok" && (
        <>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">Email verified 🎉</h1>
          <p className="mt-3 text-sm text-slate-500">Your email address is confirmed. You can continue shopping now.</p>
          <Link href="/account" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">
            Go to account
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">Verification failed</h1>
          <p className="mt-3 text-sm text-slate-500">{message}</p>
          <Link href="/account" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">
            Back to account
          </Link>
        </>
      )}
    </main>
  );
}
