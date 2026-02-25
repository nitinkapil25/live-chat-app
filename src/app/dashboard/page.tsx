"use client";

import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatMessageTime } from "@/lib/utils";

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
    <main className="h-screen bg-[#0b141a] font-[family-name:var(--font-geist-sans)] text-white flex items-center justify-center">
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        <div className="w-[95vw] h-[95vh] max-w-[1600px] bg-[#111b21] flex rounded-lg overflow-hidden shadow-2xl">
          <aside
            className={`w-full sm:w-[30%] min-w-[320px] max-w-[420px] bg-[#111b21] border-r border-[#222d34] min-h-0 flex-col ${mobileView === "list" ? "flex" : "hidden sm:flex"
              }`}
          >
            <div className="h-16 bg-[#202c33] flex items-center justify-between px-4">
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
                <button className="text-xs text-[#00a884] font-semibold">
                  Sign out
                </button>
              </SignOutButton>
            </div>
            <div className="p-3 bg-[#111b21]">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#202c33] text-sm text-white placeholder:text-gray-400 rounded-lg px-4 py-2 outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#2a3942] [&::-webkit-scrollbar-track]:bg-transparent">
              {sidebarUsers === undefined && (
                <span className="text-center text-xs text-gray-400 block mt-4">
                  Loading users...
                </span>
              )}
              {sidebarUsers && !hasSearchText && filteredUsers.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">No conversations yet</p>
                    <p className="text-xs text-gray-400">Start a chat to begin messaging</p>
                  </div>
                </div>
              )}
              {sidebarUsers && hasSearchText && filteredUsers.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-center">
                  <p className="text-sm text-gray-400">No users found</p>
                </div>
              )}
              {sidebarUsers &&
                filteredUsers.map((item) => (
                  <div
                    key={item.otherUser._id}
                    onClick={() => handleUserClick(item.otherUser._id)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors ${selectedUserId === item.otherUser._id ? "bg-[#202c33]" : ""
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={item.otherUser.image}
                        alt={item.otherUser.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      {item.presence?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21] bg-[#00a884]"></span>
                      )}
                      {!item.presence?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21] bg-gray-500"></span>
                      )}
                      {item.unreadCount > 0 && selectedUserId !== item.otherUser._id && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a884] text-[10px] font-bold text-[#111b21]">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate text-white">{item.otherUser.name}</span>
                        {item.lastMessage && (
                          <span className="text-xs text-gray-400 ml-2 shrink-0">
                            {formatMessageTime(item.lastMessage._creationTime)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 truncate">
                        {item.presence?.typingIn === item.conversationId && item.conversationId !== null ? (
                          <span className="italic text-[#00a884]">Typing...</span>
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

          <section ref={chatSectionRef} className={`relative flex-1 flex flex-col bg-[#0b141a] min-h-0 ${mobileView === "chat" ? "flex" : "hidden sm:flex"
              }`}>
              {selectedConversationId && selectedUserId ? (
                <>
                  <div className="h-16 bg-[#202c33] flex items-center px-4 border-l border-[#222d34] shrink-0 gap-4">
                    <button
                      className="sm:hidden -ml-2 p-2 text-gray-300 hover:text-white"
                      onClick={() => setMobileView("list")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-medium text-white">
                        Chat with {sidebarUsers?.find((i) => i.otherUser._id === selectedUserId)?.otherUser.name}
                      </h2>
                      {sidebarUsers?.find((i) => i.otherUser._id === selectedUserId && i.presence?.typingIn === selectedConversationId) && (
                        <span className="text-xs italic text-gray-300">Typing...</span>
                      )}
                    </div>
                  </div>
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-[#0b141a] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#2a3942] [&::-webkit-scrollbar-track]:bg-transparent">
                    {messages === undefined ? (
                      <p className="text-sm text-gray-400 text-center">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center">
                        <p className="text-sm text-gray-400 text-center">Start the conversation 👋</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {messages.map((msg) => {
                          const isMine = msg.senderId === currentUser?._id;
                          const repliedMessage = msg.replyToMessageId
                            ? messagesById.get(String(msg.replyToMessageId))
                            : null;
                          return (
                            <div
                              key={msg._id}
                              onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                              onTouchStart={(e) => handleMessageTouchStart(e, msg)}
                              onTouchMove={clearLongPressTimer}
                              onTouchEnd={clearLongPressTimer}
                              onTouchCancel={clearLongPressTimer}
                              className={`max-w-[65%] px-3 py-2 text-sm text-white ${isMine
                                ? "ml-auto bg-[#005c4b] rounded-lg rounded-tr-none"
                                : "mr-auto bg-[#202c33] rounded-lg rounded-tl-none"
                                }`}
                            >
                              {repliedMessage && (
                                <div className={`mb-2 rounded-md border-l-2 px-2 py-1 text-xs ${isMine ? "bg-[#014436] border-[#7cd8c1] text-gray-200" : "bg-[#27343c] border-[#00a884] text-gray-200"}`}>
                                  <p className="truncate">
                                    {repliedMessage.isDeleted ? "This message was deleted" : repliedMessage.body}
                                  </p>
                                </div>
                              )}
                              <span className={msg.isDeleted ? "italic text-gray-300" : ""}>{msg.body}</span>
                              <span className={`text-[11px] mt-1 text-right block ${msg.isDeleted ? "italic text-gray-400" : "text-gray-300"}`}>
                                {formatMessageTime(msg._creationTime)}
                              </span>
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
                      className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-[#202c33] border border-[#2a3942] px-4 py-2 text-xs font-medium text-[#00a884] shadow-md hover:opacity-95"
                    >
                      New messages &darr;
                    </button>
                  )}
                  {selectedMessage && menuPosition && (
                    <div
                      ref={menuRef}
                      className="absolute z-50 w-40 overflow-hidden rounded-md border border-[#2a3942] bg-[#202c33] shadow-xl"
                      style={{ left: menuPosition.x, top: menuPosition.y }}
                    >
                      <button
                        type="button"
                        onClick={handleReplyToMessage}
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2a3942]"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyMessage()}
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2a3942]"
                      >
                        Copy
                      </button>
                      {selectedMessage.senderId === currentUser?._id && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteMessage()}
                          className="block w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-[#2a3942]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                  <div className="bg-[#202c33] px-4 py-2 shrink-0">
                    {replyTo && (
                      <div className="mb-2 flex items-center justify-between rounded-md border-l-2 border-[#00a884] bg-[#2a3942] px-3 py-2">
                        <p className="truncate text-xs text-gray-200">
                          Replying to: {replyTo.isDeleted ? "This message was deleted" : replyTo.body}
                        </p>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="ml-2 text-xs text-[#00a884] hover:opacity-80"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3 w-full">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleTyping}
                        className="flex-1 bg-[#2a3942] text-white rounded-lg px-4 py-2 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="text-[#00a884] font-semibold text-sm disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-sm text-gray-400">
                    Select a user to start chatting.
                  </p>
                </div>
              )}
            </section>
        </div>
      </SignedIn>
    </main>
  );
}
