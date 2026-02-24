export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Full-stack app shell
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          The core project setup is ready. Start building features by adding routes in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs sm:text-sm">
            src/app
          </code>{" "}
          and shared modules under{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs sm:text-sm">
            src/components
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs sm:text-sm">
            src/lib
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs sm:text-sm">
            src/hooks
          </code>
          , and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs sm:text-sm">
            src/convex
          </code>
          .
        </p>
      </div>
    </main>
  );
}
