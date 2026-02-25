"use client";

import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatMessageTime } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUser();
  const [hasSyncedUser, setHasSyncedUser] = useState(false);
  const createUserIfNotExists = useMutation(api.users.createUserIfNotExists);
  const sidebarUsers = useQuery(api.conversations.getSidebarUsers, {});
  const currentUser = useQuery(api.users.getCurrentUser);
  const createOrGetConversation = useMutation(api.conversations.createOrGetConversation);
  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markAsRead);
  const updatePresence = useMutation(api.presence.updatePresence);

  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messages = useQuery(
    api.messages.getMessages,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );

  const handleUserClick = async (otherUserId: Id<"users">) => {
    if (!currentUser) return;
    setSelectedUserId(otherUserId);
    const conversationId = await createOrGetConversation({
      participantOneId: currentUser._id,
      participantTwoId: otherUserId,
    });
    setSelectedConversationId(conversationId);
    setMobileView("chat");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId || !currentUser) return;

    await sendMessage({
      conversationId: selectedConversationId,
      senderId: currentUser._id,
      body: newMessage.trim(),
    });
    setNewMessage("");
    void updatePresence({ isOnline: true, typingIn: undefined });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!selectedConversationId) return;

    void updatePresence({ isOnline: true, typingIn: selectedConversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      void updatePresence({ isOnline: true, typingIn: undefined });
    }, 2000);
  };

  useEffect(() => {
    // Keep user online
    const interval = setInterval(() => {
      void updatePresence({ isOnline: true });
    }, 30000); // Heartbeat every 30s
    return () => clearInterval(interval);
  }, [updatePresence]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (selectedConversationId) {
      void markAsRead({ conversationId: selectedConversationId });
    }
  }, [messages, selectedConversationId, markAsRead]);


  useEffect(() => {
    if (!user || hasSyncedUser) return;

    const clerkId = user.id;
    const name = user.fullName ?? "";
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const image = user.imageUrl ?? "";

    void createUserIfNotExists({ clerkId, name, email, image }).finally(() => {
      setHasSyncedUser(true);
    });
  }, [user, hasSyncedUser, createUserIfNotExists]);

  return (
    <main className="min-h-screen bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl flex-col gap-6 px-4 py-8 sm:h-auto sm:flex-row sm:px-6 sm:py-16">
          <aside
            className={`w-full shrink-0 flex-col rounded-lg border border-border bg-card px-4 py-6 shadow-sm sm:w-80 sm:flex ${mobileView === "list" ? "flex" : "hidden"
              }`}
          >
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
              Users
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {sidebarUsers === undefined && (
                <span className="text-xs text-muted-foreground">
                  Loading users...
                </span>
              )}
              {sidebarUsers && sidebarUsers.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  No other users yet.
                </span>
              )}
              {sidebarUsers &&
                sidebarUsers.map((item) => (
                  <div
                    key={item.otherUser._id}
                    onClick={() => handleUserClick(item.otherUser._id)}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted cursor-pointer transition-colors ${selectedUserId === item.otherUser._id ? "bg-muted" : ""
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={item.otherUser.image}
                        alt={item.otherUser.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      {item.presence?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500"></span>
                      )}
                      {!item.presence?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-gray-400"></span>
                      )}
                      {item.unreadCount > 0 && selectedUserId !== item.otherUser._id && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.otherUser.name}</span>
                        {item.lastMessage && (
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                            {formatMessageTime(item.lastMessage._creationTime)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.presence?.typingIn === item.conversationId && item.conversationId !== null ? (
                          <span className="italic text-primary">Typing...</span>
                        ) : item.lastMessage ? (
                          item.lastMessage.body
                        ) : (
                          "No messages yet"
                        )}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </aside>

          <div className="flex flex-1 flex-col gap-6">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
                    },
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Signed in as
                  </span>
                  <span className="text-base font-medium">
                    {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
              <SignOutButton redirectUrl="/">
                <button className="rounded-full border border-foreground px-4 py-2 text-xs font-medium hover:bg-foreground/5">
                  Sign out
                </button>
              </SignOutButton>
            </header>

            <section className={`flex flex-1 flex-col rounded-lg border border-border bg-card shadow-sm sm:flex h-[calc(100vh-12rem)] sm:h-[500px] ${mobileView === "chat" ? "flex" : "hidden"
              }`}>
              {selectedConversationId && selectedUserId ? (
                <>
                  <div className="border-b border-border px-6 py-4 flex items-center gap-4">
                    <button
                      className="sm:hidden -ml-2 p-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setMobileView("list")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-xl font-semibold tracking-tight">
                        Chat with {sidebarUsers?.find((i) => i.otherUser._id === selectedUserId)?.otherUser.name}
                      </h2>
                      {sidebarUsers?.find((i) => i.otherUser._id === selectedUserId && i.presence?.typingIn === selectedConversationId) && (
                        <span className="text-xs italic text-muted-foreground">Typing...</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                    {messages === undefined ? (
                      <p className="text-sm text-muted-foreground text-center">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">
                        This is the start of your conversation.
                      </p>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.senderId === currentUser?._id;
                        return (
                          <div
                            key={msg._id}
                            className={`flex max-w-[75%] flex-col gap-1 rounded-lg px-4 py-2 text-sm ${isMine
                              ? "self-end bg-primary text-primary-foreground"
                              : "self-start bg-muted text-foreground"
                              }`}
                          >
                            <span>{msg.body}</span>
                            <span className="text-[10px] self-end opacity-70">
                              {formatMessageTime(msg._creationTime)}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="border-t border-border p-4">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleTyping}
                        className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-sm text-muted-foreground">
                    Select a user to start chatting.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </SignedIn>
    </main>
  );
}

