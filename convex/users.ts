import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createUserIfNotExists = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthorized: no identity");
    }

    // Optional extra safety: ensure the caller's identity matches the clerkId they send
    if (identity.subject !== args.clerkId) {
      throw new Error("Unauthorized: identity mismatch");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      image: args.image,
    });

    return userId;
  },
});

