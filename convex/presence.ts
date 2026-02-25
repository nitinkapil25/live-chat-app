import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const updatePresence = mutation({
    args: {
        isOnline: v.boolean(),
        typingIn: v.optional(v.id("conversations")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return;

        const existingPresence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();

        if (existingPresence) {
            await ctx.db.patch(existingPresence._id, {
                isOnline: args.isOnline,
                lastSeen: Date.now(),
                typingIn: args.typingIn,
            });
        } else {
            await ctx.db.insert("presence", {
                userId: user._id,
                isOnline: args.isOnline,
                lastSeen: Date.now(),
                typingIn: args.typingIn,
            });
        }
    },
});

export const getPresence = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();

        if (!presence) return null;

        // Auto offline if not seen for 1 minute
        const isActuallyOnline = presence.isOnline && Date.now() - presence.lastSeen < 60000;

        return {
            ...presence,
            isOnline: isActuallyOnline,
        };
    },
});
