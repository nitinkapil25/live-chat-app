"use client";

import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function DashboardPage() {
  const { user } = useUser();
  const [hasSyncedUser, setHasSyncedUser] = useState(false);
  const createUserIfNotExists = useMutation(api.users.createUserIfNotExists);

  useEffect(() => {
    if (!user || hasSyncedUser) return;

    const clerkId = user.id;
    const name = user.fullName ?? "";
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const image = user.imageUrl ?? "";

    void createUserIfNotExists({ clerkId, name, email, image }).finally(() => {
      setHasSyncedUser(true);
    });
  }, [user, hasSyncedUser, createUserIfNotExists]);

  return (
    <main className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-16">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Signed in as</span>
                <span className="text-base font-medium">
                  {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>
            <SignOutButton redirectUrl="/">
              <button className="rounded-full border border-foreground px-4 py-2 text-xs font-medium hover:bg-foreground/5">
                Sign out
              </button>
            </SignOutButton>
          </header>

          <section className="rounded-lg border border-border bg-card px-6 py-8 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">
              Dashboard (Protected)
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This page is protected by Clerk. Only authenticated users can see
              it. Use this area to build your application&apos;s main
              experience.
            </p>
          </section>
        </div>
      </SignedIn>
    </main>
  );
}

