import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUserIfNotExists = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.string(),
  },
  handler: async (ctx, args) => {
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

export const getOtherUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const users = await ctx.db.query("users").collect();

    if (!identity) {
      // If we somehow don't have an identity, just return all users.
      return users;
    }

    return users.filter((user) => user.clerkId !== identity.subject);
  },
});

