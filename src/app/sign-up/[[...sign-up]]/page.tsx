import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-foreground text-background hover:bg-foreground/90",
          },
        }}
        afterSignUpUrl="/dashboard"
      />
    </main>
  );
}

