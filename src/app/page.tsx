"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#0b141a] px-4 font-[family-name:var(--font-geist-sans)]">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#1f2c33_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative w-full max-w-md space-y-6 rounded-2xl border border-[#2a3942] bg-[#111b21] p-10 text-center shadow-2xl">
        <h1 className="text-3xl font-semibold text-white">Live Chat</h1>
        <p className="text-sm text-[#8696a0]">
          Connect instantly with your team. Sign up or sign in to continue to your dashboard.
        </p>

        <SignedOut>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <SignUpButton mode="modal" afterSignUpUrl="/dashboard">
              <button className="rounded-full bg-[#25D366] px-5 py-2 text-sm font-semibold text-black hover:bg-[#20bd5a]">
                Sign up
              </button>
            </SignUpButton>
            <SignInButton mode="modal" afterSignInUrl="/dashboard">
              <button className="rounded-full border border-[#2a3942] px-5 py-2 text-sm font-semibold text-white hover:bg-[#202c33]">
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <p className="text-sm text-[#8696a0]">
            You&apos;re already signed in. Go to your{" "}
            <a
              href="/dashboard"
              className="font-medium text-white underline underline-offset-4"
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
