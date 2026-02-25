import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  conversations: defineTable({
    participantOne: v.id("users"),
    participantTwo: v.id("users"),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    isRead: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
    replyToMessageId: v.optional(v.id("messages")),
  }).index("by_conversation", ["conversationId"]),

  presence: defineTable({
    userId: v.id("users"),
    isOnline: v.boolean(),
    lastSeen: v.number(),
    typingIn: v.optional(v.id("conversations")),
  }).index("by_user", ["userId"]),
});

export default schema;
