"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Live Chat – Public Landing
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base max-w-xl">
          This is a public landing page. Create an account or sign in to access
          your dashboard.
        </p>

        <SignedOut>
          <div className="flex flex-wrap gap-4">
            <SignUpButton mode="modal" afterSignUpUrl="/dashboard">
              <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background shadow-sm hover:opacity-90">
                Sign up
              </button>
            </SignUpButton>
            <SignInButton mode="modal" afterSignInUrl="/dashboard">
              <button className="rounded-full border border-foreground px-5 py-2 text-sm font-medium hover:bg-foreground/5">
                Sign in
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <p className="text-sm text-muted-foreground">
            You&apos;re already signed in. Go to your{" "}
            <a
              href="/dashboard"
              className="font-medium text-foreground underline underline-offset-4"
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
