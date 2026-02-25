"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4 font-[family-name:var(--font-geist-sans)]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,#d9dee6_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative w-full max-w-md space-y-6 rounded-[28px] bg-white/70 p-10 text-center shadow-[0_20px_45px_rgba(148,163,184,0.28)] ring-1 ring-white/70 backdrop-blur-xl">
        <h1 className="text-3xl font-semibold text-slate-800">Live Chat</h1>
        <p className="text-sm text-slate-500">
          Connect instantly with your team. Sign up or sign in to continue to your dashboard.
        </p>

        <SignedOut>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <SignUpButton mode="modal" afterSignUpUrl="/dashboard">
              <button className="rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#f97316] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(251,146,60,0.35)] hover:opacity-95">
                Sign up
              </button>
            </SignUpButton>
            <SignInButton mode="modal" afterSignInUrl="/dashboard">
              <button className="rounded-2xl bg-[#eef1f5] px-5 py-2 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-[#e5eaf1]">
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <p className="text-sm text-slate-500">
            You&apos;re already signed in. Go to your{" "}
            <a
              href="/dashboard"
              className="font-medium text-slate-800 underline underline-offset-4"
            >
              dashboard
            </a>
            .
          </p>
        </SignedIn>
      </div>
    </main>
  );
}
