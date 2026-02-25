"use client";

import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatMessageTime } from "@/lib/utils";

type IconProps = {
  className?: string;
};

function MessageCircle({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

type EmptyStateProps = {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  className?: string;
};

function EmptyState({ icon: Icon, title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`text-center opacity-70 max-w-xs ${className}`}>
      <Icon className="mx-auto mb-3 h-8 w-8" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs">{description}</p>
    </div>
  );
}

type ChatMessage = {
  _id: Id<"messages">;
  _creationTime: number;
  senderId: Id<"users">;
  body: string;
  isDeleted?: boolean;
  replyToMessageId?: Id<"messages">;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [hasSyncedUser, setHasSyncedUser] = useState(false);
  const createUserIfNotExists = useMutation(api.users.createUserIfNotExists);
  const sidebarUsers = useQuery(api.conversations.getSidebarUsers, {});
  const currentUser = useQuery(api.users.getCurrentUser);
  const createOrGetConversation = useMutation(api.conversations.createOrGetConversation);
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markAsRead = useMutation(api.messages.markAsRead);
  const updatePresence = useMutation(api.presence.updatePresence);

  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const chatSectionRef = useRef<HTMLElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messages = useQuery(
    api.messages.getMessages,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );
  const filteredUsers = useMemo(() => {
    if (!sidebarUsers) return [];
    const searchValue = search.toLowerCase();
    return sidebarUsers.filter((item) => {
      if (item.otherUser._id === currentUser?._id) return false;
      return item.otherUser.name.toLowerCase().includes(searchValue);
    });
  }, [sidebarUsers, search, currentUser?._id]);
  const hasSearchText = search.trim().length > 0;
  const hasNoSidebarUsers = sidebarUsers !== undefined && sidebarUsers.length === 0;
  const hasNoSearchResults =
    sidebarUsers !== undefined &&
    sidebarUsers.length > 0 &&
    hasSearchText &&
    filteredUsers.length === 0;
  const selectedSidebarItem = useMemo(
    () => sidebarUsers?.find((item) => item.otherUser._id === selectedUserId),
    [sidebarUsers, selectedUserId]
  );
  const messagesById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    if (!messages) return map;
    for (const msg of messages) {
      map.set(String(msg._id), msg);
    }
    return map;
  }, [messages]);

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
      replyToMessageId: replyTo?._id,
    });
    setNewMessage("");
    setReplyTo(null);
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

  const closeMessageMenu = () => {
    setSelectedMessage(null);
    setMenuPosition(null);
  };

  const openMessageMenu = (msg: ChatMessage, clientX: number, clientY: number) => {
    const sectionRect = chatSectionRef.current?.getBoundingClientRect();
    if (!sectionRect) return;

    const x = Math.max(8, Math.min(clientX - sectionRect.left, sectionRect.width - 168));
    const y = Math.max(8, Math.min(clientY - sectionRect.top, sectionRect.height - 136));

    setSelectedMessage(msg);
    setMenuPosition({ x, y });
  };

  const handleMessageContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    msg: ChatMessage
  ) => {
    e.preventDefault();
    openMessageMenu(msg, e.clientX, e.clientY);
  };

  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleMessageTouchStart = (
    e: React.TouchEvent<HTMLDivElement>,
    msg: ChatMessage
  ) => {
    const touch = e.touches[0];
    if (!touch) return;
    clearLongPressTimer();
    longPressTimeoutRef.current = setTimeout(() => {
      openMessageMenu(msg, touch.clientX, touch.clientY);
    }, 450);
  };

  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    await navigator.clipboard.writeText(selectedMessage.body);
    closeMessageMenu();
  };

  const handleReplyToMessage = () => {
    if (!selectedMessage) return;
    setReplyTo(selectedMessage);
    inputRef.current?.focus();
    closeMessageMenu();
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || selectedMessage.senderId !== currentUser?._id) return;
    await deleteMessage({ messageId: selectedMessage._id });
    if (replyTo?._id === selectedMessage._id) {
      setReplyTo(null);
    }
    closeMessageMenu();
  };

  useEffect(() => {
    // Keep user online
    const interval = setInterval(() => {
      void updatePresence({ isOnline: true });
    }, 30000); // Heartbeat every 30s
    return () => clearInterval(interval);
  }, [updatePresence]);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowNewMessageButton(false);
    } else if (messages && messages.length > 0) {
      setShowNewMessageButton(true);
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (selectedConversationId) {
      void markAsRead({ conversationId: selectedConversationId });
    }
  }, [messages, selectedConversationId, markAsRead]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const threshold = 24;
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      setIsAtBottom(atBottom);
      if (atBottom) {
        setShowNewMessageButton(false);
      }
    };

    onScroll();
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [selectedConversationId]);

  useEffect(() => {
    setIsAtBottom(true);
    setShowNewMessageButton(false);
    setReplyTo(null);
    closeMessageMenu();
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [selectedConversationId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current) return;
      const target = event.target as Node;
      if (!menuRef.current.contains(target)) {
        closeMessageMenu();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, []);

  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);


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
    <main className="h-screen bg-[#f5f6f8] font-[family-name:var(--font-geist-sans)] text-slate-700">
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="h-full w-full p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-[1600px] gap-4">
          <aside
            className={`w-full sm:w-[30%] sm:min-w-[320px] sm:max-w-[420px] min-h-0 flex-col rounded-[28px] bg-gradient-to-b from-[#fff8f1] via-white/85 to-[#fff3e8] backdrop-blur-xl shadow-[0_10px_35px_rgba(148,163,184,0.22)] ring-1 ring-white/70 ${mobileView === "list" ? "flex" : "hidden sm:flex"
              }`}
          >
            <div className="h-16 sticky top-0 z-10 rounded-t-[28px] bg-white/80 backdrop-blur-xl flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
                    },
                  }}
                />
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
                </span>
              </div>
              <SignOutButton redirectUrl="/">
                <button className="text-xs text-[#f97316] font-semibold">
                  Sign out
                </button>
              </SignOutButton>
            </div>
            <div className="p-3">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl bg-[#eef1f5] px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#fb923c]/40"
              />
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
              {sidebarUsers === undefined && (
                <span className="text-center text-xs text-slate-400 block mt-4">
                  Loading users...
                </span>
              )}
              {hasNoSidebarUsers && (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <EmptyState
                    icon={MessageCircle}
                    title="No conversations yet"
                    description="Search for a user to start chatting"
                  />
                </div>
              )}
              {hasNoSearchResults && (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <EmptyState
                    icon={MessageCircle}
                    title="No users found"
                    description="Try a different name"
                  />
                </div>
              )}
              {sidebarUsers &&
                !hasNoSidebarUsers &&
                !hasNoSearchResults &&
                filteredUsers.map((item) => (
                  <div
                    key={item.otherUser._id}
                    onClick={() => handleUserClick(item.otherUser._id)}
                    className={`mx-2 flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-colors ${selectedUserId === item.otherUser._id ? "bg-white shadow-[0_8px_22px_rgba(251,146,60,0.2)] ring-1 ring-[#fdba74]/50" : "hover:bg-white/80"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={item.otherUser.image}
                        alt={item.otherUser.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      {item.presence?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22c55e]"></span>
                      )}
                      {!item.presence?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-slate-400"></span>
                      )}
                      {item.unreadCount > 0 && selectedUserId !== item.otherUser._id && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#fb923c] text-[10px] font-bold text-white">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate text-slate-800">{item.otherUser.name}</span>
                        {item.lastMessage && (
                          <span className="text-xs text-slate-400 ml-2 shrink-0">
                            {formatMessageTime(item.lastMessage._creationTime)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 truncate">
                        {item.presence?.typingIn === item.conversationId && item.conversationId !== null ? (
                          <span className="italic text-[#f97316]">Typing...</span>
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

          <section ref={chatSectionRef} className={`relative flex h-full flex-1 flex-col min-h-0 overflow-hidden rounded-[28px] bg-transparent shadow-[0_10px_35px_rgba(148,163,184,0.22)] ring-1 ring-white/70 ${mobileView === "chat" ? "flex" : "hidden sm:flex"
              }`}>
              {selectedConversationId && selectedUserId ? (
                <>
                  <div className="sticky top-0 z-30 h-16 flex-shrink-0 rounded-t-[28px] overflow-hidden shadow-sm transition-colors duration-300">
                    <div className="absolute inset-0 border-b border-white/20 bg-white/55 supports-[backdrop-filter]:bg-white/35 backdrop-blur-2xl" />
                    <div className="relative z-10 flex h-full items-center px-4 gap-4">
                    <button
                      className="sm:hidden -ml-2 p-2 text-slate-500 hover:text-slate-700"
                      onClick={() => setMobileView("list")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div className="flex items-center gap-3">
                      {selectedSidebarItem?.otherUser.image ? (
                        <img
                          src={selectedSidebarItem.otherUser.image}
                          alt={selectedSidebarItem.otherUser.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#eef1f5]" />
                      )}
                      <div className="flex flex-col">
                        <h2 className="text-sm font-medium text-slate-800">
                          {selectedSidebarItem?.otherUser.name ?? "Chat"}
                        </h2>
                        {selectedSidebarItem?.presence?.typingIn === selectedConversationId ? (
                          <span className="text-xs italic text-slate-500">Typing...</span>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${selectedSidebarItem?.presence?.isOnline ? "bg-[#22c55e]" : "bg-slate-400"}`} />
                            {selectedSidebarItem?.presence?.isOnline ? "Online" : "Offline"}
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                  <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                    {messages === undefined ? (
                      <p className="text-sm text-slate-400 text-center">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400">
                        <EmptyState
                          icon={MessageCircle}
                          title="No messages yet"
                          description="Send a message to start the conversation &#128075;"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {messages.map((msg) => {
                          const isMine = msg.senderId === currentUser?._id;
                          const repliedMessage = msg.replyToMessageId
                            ? messagesById.get(String(msg.replyToMessageId))
                            : null;
                          const incomingAvatar = selectedSidebarItem?.otherUser.image;
                          const outgoingAvatar = user?.imageUrl;
                          return (
                            <div
                              key={msg._id}
                              onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                              onTouchStart={(e) => handleMessageTouchStart(e, msg)}
                              onTouchMove={clearLongPressTimer}
                              onTouchEnd={clearLongPressTimer}
                              onTouchCancel={clearLongPressTimer}
                              className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                            >
                              {!isMine &&
                                (incomingAvatar ? (
                                  <img
                                    src={incomingAvatar}
                                    alt={selectedSidebarItem?.otherUser.name ?? "User"}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-[#eef1f5]" />
                                ))}
                              <div
                                className={`max-w-[65%] px-4 py-3 text-sm shadow-[0_8px_18px_rgba(148,163,184,0.22)] ${isMine
                                  ? "rounded-[22px] bg-gradient-to-br from-[#fb923c] to-[#f97316] text-white"
                                  : "rounded-[22px] bg-[#eef1f5] text-slate-700"
                                  }`}
                              >
                                {repliedMessage && (
                                  <div className={`mb-2 rounded-xl border-l-2 px-2 py-1 text-xs ${isMine ? "bg-white/25 border-white/80 text-white" : "bg-white border-[#fb923c] text-slate-500"}`}>
                                    <p className="truncate">
                                      {repliedMessage.isDeleted ? "This message was deleted" : repliedMessage.body}
                                    </p>
                                  </div>
                                )}
                                <span className={msg.isDeleted ? "italic opacity-80" : ""}>{msg.body}</span>
                                <span className={`text-[11px] mt-1 text-right block ${isMine ? "text-white/85" : "text-slate-400"} ${msg.isDeleted ? "italic" : ""}`}>
                                  {formatMessageTime(msg._creationTime)}
                                </span>
                              </div>
                              {isMine &&
                                (outgoingAvatar ? (
                                  <img
                                    src={outgoingAvatar}
                                    alt={user?.fullName ?? "Me"}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-[#fde6d0]" />
                                ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  {showNewMessageButton && (
                    <button
                      type="button"
                      onClick={() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                        setIsAtBottom(true);
                        setShowNewMessageButton(false);
                      }}
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-[#f97316] shadow-[0_8px_20px_rgba(148,163,184,0.25)] hover:opacity-95"
                    >
                      New messages &darr;
                    </button>
                  )}
                  {selectedMessage && menuPosition && (
                    <div
                      ref={menuRef}
                      className="absolute z-50 w-40 overflow-hidden rounded-2xl bg-white shadow-[0_14px_30px_rgba(148,163,184,0.35)]"
                      style={{ left: menuPosition.x, top: menuPosition.y }}
                    >
                      <button
                        type="button"
                        onClick={handleReplyToMessage}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyMessage()}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Copy
                      </button>
                      {selectedMessage.senderId === currentUser?._id && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteMessage()}
                          className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-slate-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                  <div className="sticky bottom-0 z-10 shrink-0 rounded-b-[28px] bg-white/85 backdrop-blur-xl px-4 py-3">
                    {replyTo && (
                      <div className="mb-2 flex items-center justify-between rounded-2xl border-l-2 border-[#fb923c] bg-[#eef1f5] px-3 py-2">
                        <p className="truncate text-xs text-slate-500">
                          Replying to: {replyTo.isDeleted ? "This message was deleted" : replyTo.body}
                        </p>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="ml-2 text-xs text-[#f97316] hover:opacity-80"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3 w-full">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleTyping}
                        className="flex-1 rounded-2xl bg-[#eef1f5] px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-[#fb923c]/40"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="rounded-2xl bg-gradient-to-br from-[#fb923c] to-[#f97316] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(251,146,60,0.35)] disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <EmptyState
                    icon={MessageCircle}
                    title="Select a chat"
                    description="Choose a user from the left to start messaging"
                  />
                </div>
              )}
          </section>
          </div>
        </div>
      </SignedIn>
    </main>
  );
}
