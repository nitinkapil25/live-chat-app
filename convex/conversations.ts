import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createOrGetConversation = mutation({
    args: {
        participantOneId: v.id("users"),
        participantTwoId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { participantOneId, participantTwoId } = args;

        const existingOne = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.and(
                    q.eq(q.field("participantOne"), participantOneId),
                    q.eq(q.field("participantTwo"), participantTwoId)
                )
            )
            .first();

        if (existingOne) {
            return existingOne._id;
        }

        const existingTwo = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.and(
                    q.eq(q.field("participantOne"), participantTwoId),
                    q.eq(q.field("participantTwo"), participantOneId)
                )
            )
            .first();

        if (existingTwo) {
            return existingTwo._id;
        }

        const newConversationId = await ctx.db.insert("conversations", {
            participantOne: participantOneId,
            participantTwo: participantTwoId,
        });

        return newConversationId;
    },
});

export const getSidebarUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return [];

        const allUsers = await ctx.db.query("users").collect();
        const otherUsers = allUsers.filter((u) => u._id !== currentUser._id);

        const usersWithDetails = await Promise.all(
            otherUsers.map(async (otherUser) => {
                let conv = await ctx.db
                    .query("conversations")
                    .filter((q) =>
                        q.and(
                            q.eq(q.field("participantOne"), currentUser._id),
                            q.eq(q.field("participantTwo"), otherUser._id)
                        )
                    )
                    .first();

                if (!conv) {
                    conv = await ctx.db
                        .query("conversations")
                        .filter((q) =>
                            q.and(
                                q.eq(q.field("participantOne"), otherUser._id),
                                q.eq(q.field("participantTwo"), currentUser._id)
                            )
                        )
                        .first();
                }

                if (!conv) {
                    const presenceRaw = await ctx.db
                        .query("presence")
                        .withIndex("by_user", (q) => q.eq("userId", otherUser._id))
                        .unique();

                    const presence = presenceRaw ? {
                        ...presenceRaw,
                        isOnline: presenceRaw.isOnline && Date.now() - presenceRaw.lastSeen < 60000,
                    } : null;

                    return {
                        otherUser,
                        conversationId: null,
                        lastMessage: null,
                        unreadCount: 0,
                        presence,
                    };
                }

                const messages = await ctx.db
                    .query("messages")
                    .withIndex("by_conversation", (q) => q.eq("conversationId", conv!._id))
                    .order("desc")
                    .collect();

                const lastMessage = messages.length > 0 ? messages[0] : null;
                const unreadCount = messages.filter((msg) => !msg.isRead && msg.senderId !== currentUser._id).length;

                const presenceRaw = await ctx.db
                    .query("presence")
                    .withIndex("by_user", (q) => q.eq("userId", otherUser._id))
                    .unique();

                const presence = presenceRaw ? {
                    ...presenceRaw,
                    isOnline: presenceRaw.isOnline && Date.now() - presenceRaw.lastSeen < 60000,
                } : null;

                return {
                    otherUser,
                    conversationId: conv._id,
                    lastMessage,
                    unreadCount,
                    presence,
                };
            })
        );

        return usersWithDetails.sort((a, b) => {
            const timeA = a.lastMessage?._creationTime || 0;
            const timeB = b.lastMessage?._creationTime || 0;
            return timeB - timeA;
        });
    },
});
