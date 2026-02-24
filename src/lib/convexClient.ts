"use client";

import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Did you run `npx convex dev` and create your Convex deployment URL?"
  );
}

export const convex = new ConvexReactClient(convexUrl);

