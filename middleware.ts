import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)"],
  afterSignInUrl: "/dashboard",
  afterSignUpUrl: "/dashboard",
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/(api|trpc)(.*)"],
};

