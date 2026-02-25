import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        body: v.string(),
        replyToMessageId: v.optional(v.id("messages")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated call to sendMessage");
        }

        const { conversationId, senderId, body, replyToMessageId } = args;
        if (replyToMessageId) {
            const replyTarget = await ctx.db.get(replyToMessageId);
            if (!replyTarget || replyTarget.conversationId !== conversationId) {
                throw new Error("Invalid reply target");
            }
        }

        await ctx.db.insert("messages", {
            conversationId,
            senderId,
            body,
            isRead: false,
            isDeleted: false,
            replyToMessageId,
        });
    },
});

export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const message = await ctx.db.get(args.messageId);
        if (!message) return;
        if (message.senderId !== user._id) {
            throw new Error("Not authorized to delete this message");
        }

        await ctx.db.patch(args.messageId, {
            isDeleted: true,
            body: "This message was deleted",
        });
    },
});

export const markAsRead = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return;

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        for (const msg of messages) {
            if (!msg.isRead && msg.senderId !== user._id) {
                await ctx.db.patch(msg._id, { isRead: true });
            }
        }
    },
});

export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        // Optionally we could check auth here as well
        const { conversationId } = args;

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .order("asc")
            .collect();

        return messages;
    },
});
