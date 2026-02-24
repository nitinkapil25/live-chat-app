"use client";

import type { ReactNode } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convexClient";

type ConvexClientProviderProps = {
  children: ReactNode;
};

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

