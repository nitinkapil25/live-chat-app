import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-foreground text-background hover:bg-foreground/90",
          },
        }}
        afterSignInUrl="/dashboard"
      />
    </main>
  );
}

