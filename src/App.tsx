'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RetroHeader } from '@/components/RetroHeader';
import type { MainTabType } from '@/components/RetroTabs';
import { RetroDrawer } from '@/components/RetroDrawer';
import { LoginView } from '@/components/LoginView';
import { ChatListView } from '@/components/ChatListView';
import { ConversationView } from '@/components/ConversationView';
import { ProfileView } from '@/components/ProfileView';
import { GroupView } from '@/components/GroupView';
import { ChannelView } from '@/components/ChannelView';
import { ContactsView } from '@/components/ContactsView';
import { CallsView } from '@/components/CallsView';
import { SettingsView } from '@/components/SettingsView';
import { EditProfileModal } from '@/components/EditProfileModal';
import { AddContactModal } from '@/components/AddContactModal';
import { CallModal } from '@/components/CallModal';
import { MessageSquare, Plus, Settings, Users, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { 
  UserProfile, 
  ChatSummary, 
  ChatMessage, 
  TelegramContact, 
  GroupDetail, 
  ChannelDetail,
  AuthStatusResponse,
  AccountInfo,
  CallLog
} from '@/shared/types';

export default function GramApp() {
  // Authentication State
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTabType>('chats');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Chat & Messaging State
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Detailed views state
  const [detailView, setDetailView] = useState<'profile' | 'group' | 'channel' | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [channelDetail, setChannelDetail] = useState<ChannelDetail | null>(null);

  // Contacts
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Calls (Real Telegram Call History & WebRTC Calls)
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  // Real-time Telegram User Typing Status
  const [typingChats, setTypingChats] = useState<Record<string, { userId?: string; timer: any }>>({});

  // Multi-Account State (Unlimited)
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Profile & Contact Modals
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactCallModal, setContactCallModal] = useState<{
    isOpen: boolean;
    contact: TelegramContact;
    isVideo: boolean;
    isIncoming?: boolean;
  } | null>(null);

  // Theme & WebSocket
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gram_theme') === 'dark';
    }
    return false;
  });
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Sync theme with DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        localStorage.setItem('gram_theme', 'dark');
      } else {
        localStorage.setItem('gram_theme', 'light');
      }
      return next;
    });
  };

  const loadAccounts = useCallback(async () => {
    try {
      const res = await apiClient.getAccounts();
      if (res.accounts) {
        setAccounts(res.accounts);
      }
    } catch {}
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const status = await apiClient.getAuthStatus();
      if (status.authenticated && status.user) {
        setCurrentUser(status.user);
        await loadAccounts();
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, [loadAccounts]);

  useEffect(() => {
    let active = true;
    apiClient.getAuthStatus()
      .then((status: AuthStatusResponse) => {
        if (!active) return;
        if (status.authenticated && status.user) {
          setCurrentUser(status.user);
          loadAccounts();
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      })
      .finally(() => {
        if (active) setLoadingAuth(false);
      });

    return () => { active = false; };
  }, [loadAccounts]);

  const selectedChatRef = useRef<ChatSummary | null>(selectedChat);
  const chatsRef = useRef<ChatSummary[]>(chats);
  const contactsRef = useRef<TelegramContact[]>(contacts);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Load Chats
  const loadChats = useCallback(async (showSpinner = true) => {
    if (!currentUser) return;
    if (showSpinner) setLoadingChats(true);
    try {
      const list = await apiClient.getChats(50);
      setChats(list);
    } catch (err) {
      if (showSpinner) console.error('Failed to load chats:', err);
    } finally {
      if (showSpinner) setLoadingChats(false);
    }
  }, [currentUser]);

  // Load Contacts
  const loadContacts = useCallback(async (showSpinner = true) => {
    if (!currentUser) return;
    if (showSpinner) setLoadingContacts(true);
    try {
      const list = await apiClient.getContacts();
      setContacts(list);
    } catch (err) {
      if (showSpinner) console.error('Failed to load contacts:', err);
    } finally {
      if (showSpinner) setLoadingContacts(false);
    }
  }, [currentUser]);

  // Load Calls
  const loadCalls = useCallback(async (showSpinner = true) => {
    if (!currentUser) return;
    if (showSpinner) setLoadingCalls(true);
    try {
      const list = await apiClient.getCalls();
      setCalls(list);
    } catch (err) {
      if (showSpinner) console.error('Failed to load calls:', err);
    } finally {
      if (showSpinner) setLoadingCalls(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    apiClient.getChats(50)
      .then((list: ChatSummary[]) => {
        if (active) setChats(list);
      })
      .catch(() => {});

    apiClient.getContacts()
      .then((list: TelegramContact[]) => {
        if (active) setContacts(list);
      })
      .catch(() => {});

    apiClient.getCalls()
      .then((list: CallLog[]) => {
        if (active) setCalls(list);
      })
      .catch(() => {});

    return () => { active = false; };
  }, [currentUser]);

  // Load Messages
  const loadMessages = useCallback(async (chatId: string, showSpinner = true) => {
    if (showSpinner) {
      setLoadingMessages(true);
      setHasMoreHistory(true);
    }
    try {
      const history = await apiClient.getMessages(chatId, 50);
      setMessages(history);
      if (history.length < 50) setHasMoreHistory(false);

      apiClient.markChatRead(chatId).catch(() => {});
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      if (showSpinner) {
        console.error('Failed to load messages:', err);
        setMessages([]);
      }
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  }, []);

  const handleLoadMoreHistory = async () => {
    if (!selectedChat || messages.length === 0 || loadingMessages) return;
    const oldestId = messages[0].id;
    setLoadingMessages(true);

    try {
      const older = await apiClient.getMessages(selectedChat.id, 50, oldestId);
      if (older.length === 0 || older.length < 50) {
        setHasMoreHistory(false);
      }
      setMessages((prev) => [...older, ...prev]);
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectChat = (chat: ChatSummary) => {
    setSelectedChat(chat);
    setDetailView(null);
    loadMessages(chat.id, true);
  };

  const handlePinChat = async (chatId: string, pinned: boolean) => {
    try {
      await apiClient.pinChat(chatId, pinned);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isPinned: pinned } : c))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal menyematkan obrolan.');
    }
  };

  const handleArchiveChat = async (chatId: string, archived: boolean) => {
    try {
      await apiClient.archiveChat(chatId, archived);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isArchived: archived } : c))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengarsipkan obrolan.');
    }
  };

  const handleSendMessage = async (text: string, replyToMsgId?: number) => {
    if (!selectedChat) return;

    const tempMsg: ChatMessage = {
      id: Date.now(),
      chatId: selectedChat.id,
      senderId: currentUser?.id || 'me',
      senderName: 'You',
      text,
      date: Math.floor(Date.now() / 1000),
      isOutgoing: true,
      replyToMsgId,
    };
    setMessages((prev) => [...prev, tempMsg]);

    const sent = await apiClient.sendMessage(selectedChat.id, text, replyToMsgId);
    setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? sent : m)));

    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== selectedChat.id);
      const current = prev.find((c) => c.id === selectedChat.id) || selectedChat;
      const updated: ChatSummary = {
        ...current,
        lastMessage: {
          id: sent.id,
          text: sent.text,
          date: sent.date,
          isOutgoing: true,
        },
        unreadCount: 0,
      };
      return [updated, ...remaining];
    });
  };

  const handleSendMedia = async (file: File, caption?: string, replyToMsgId?: number) => {
    if (!selectedChat) return;

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const sent = await apiClient.sendMedia(selectedChat.id, base64Data, file.name, caption, replyToMsgId);

    setMessages((prev) => [...prev, sent]);
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== selectedChat.id);
      const current = prev.find((c) => c.id === selectedChat.id) || selectedChat;
      const updated: ChatSummary = {
        ...current,
        lastMessage: {
          id: sent.id,
          text: sent.text || `[${sent.media?.type || 'Media'}]`,
          date: sent.date,
          isOutgoing: true,
        },
        unreadCount: 0,
      };
      return [updated, ...remaining];
    });
  };

  const handleEditMessage = async (msgId: number, text: string) => {
    if (!selectedChat) return;
    await apiClient.editMessage(selectedChat.id, msgId, text);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, text, isEdited: true } : m))
    );
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!selectedChat) return;
    await apiClient.deleteMessage(selectedChat.id, msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const handleForwardMessage = async (fromChatId: string, toChatId: string, msgId: number) => {
    await apiClient.forwardMessage(fromChatId, toChatId, msgId);
    alert('Pesan berhasil diteruskan!');
  };

  // Realtime WebSocket
  useEffect(() => {
    if (!currentUser) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let socket: WebSocket | null = null;
    let pingInterval: any = null;
    let reconnectTimeout: any = null;
    let isCleanedUp = false;
    let retryCount = 0;

    const connectWebSocket = () => {
      if (isCleanedUp) return;

      const wsUrl = apiClient.getWsUrl();
      if (!wsUrl) return;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
          retryCount = 0;

          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              try {
                socket.send(JSON.stringify({ type: 'ping' }));
              } catch {}
            }
          }, 15000);

          loadChats(false);
          if (selectedChatRef.current) {
            loadMessages(selectedChatRef.current.id, false);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          if (pingInterval) clearInterval(pingInterval);
          if (!isCleanedUp) {
            const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
            retryCount++;
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          }
        };

        socket.onerror = () => {
          setWsConnected(false);
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const eventType = parsed.type;
            const data = parsed.data;

            if (eventType === 'new_message' && data?.message) {
              const incoming: ChatMessage = data.message;
              const targetChatId = String(data.chatId || incoming.chatId);
              const activeChatId = selectedChatRef.current ? String(selectedChatRef.current.id) : null;
              const isCurrentlyActive = activeChatId === targetChatId;

              if (isCurrentlyActive) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === incoming.id)) return prev;
                  return [...prev, incoming];
                });
                apiClient.markChatRead(targetChatId).catch(() => {});
              }

              setChats((prev) => {
                const existingChat = prev.find((c) => String(c.id) === targetChatId);
                const remaining = prev.filter((c) => String(c.id) !== targetChatId);

                if (existingChat) {
                  const updated: ChatSummary = {
                    ...existingChat,
                    lastMessage: {
                      id: incoming.id,
                      text: incoming.text,
                      date: incoming.date,
                      isOutgoing: incoming.isOutgoing,
                    },
                    unreadCount: isCurrentlyActive ? 0 : (existingChat.unreadCount + 1),
                  };
                  return [updated, ...remaining];
                } else {
                  loadChats(false);
                  return prev;
                }
              });
            } else if (eventType === 'edit_message' && data?.message) {
              const edited: ChatMessage = data.message;
              const targetChatId = String(data.chatId || edited.chatId);
              const activeChatId = selectedChatRef.current ? String(selectedChatRef.current.id) : null;

              if (activeChatId === targetChatId) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === edited.id ? { ...m, text: edited.text, isEdited: true } : m))
                );
              }

              setChats((prev) =>
                prev.map((c) => {
                  if (String(c.id) === targetChatId && c.lastMessage?.id === edited.id) {
                    return {
                      ...c,
                      lastMessage: {
                        ...c.lastMessage,
                        text: edited.text,
                      },
                    };
                  }
                  return c;
                })
              );
            } else if (eventType === 'delete_message' && data?.messageIds) {
              const deletedIds: number[] = data.messageIds;
              setMessages((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
            } else if (eventType === 'read_history' && data?.chatId) {
              const targetChatId = String(data.chatId);
              setChats((prev) =>
                prev.map((c) =>
                  String(c.id) === targetChatId ? { ...c, unreadCount: data.stillUnreadCount || 0 } : c
                )
              );
            } else if (eventType === 'read_outbox' && data?.maxId) {
              const maxId = Number(data.maxId);
              const targetChatId = data.chatId ? String(data.chatId) : null;
              const activeChatId = selectedChatRef.current ? String(selectedChatRef.current.id) : null;

              if (!targetChatId || activeChatId === targetChatId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.isOutgoing && m.id <= maxId ? { ...m, isRead: true } : m
                  )
                );
              }
            } else if (eventType === 'user_typing' && data?.chatId) {
              const targetChatId = String(data.chatId);
              setTypingChats((prev) => {
                if (prev[targetChatId]?.timer) {
                  clearTimeout(prev[targetChatId].timer);
                }
                const timer = setTimeout(() => {
                  setTypingChats((current) => {
                    const next = { ...current };
                    delete next[targetChatId];
                    return next;
                  });
                }, 4000);
                return {
                  ...prev,
                  [targetChatId]: { userId: data.userId, timer },
                };
              });
            } else if (eventType === 'phone_call_update' && data) {
              window.dispatchEvent(new CustomEvent('telegram_ws_event', { detail: { eventType, data } }));
              const status = data.status;
              if (status === 'PhoneCallRequested' || status === 'PhoneCallWaiting') {
                const peerId = data.participantId || data.call?.adminId;
                const contact = contactsRef.current.find((c) => String(c.id) === String(peerId));
                setContactCallModal({
                  isOpen: true,
                  contact: contact || {
                    id: String(peerId || 'caller'),
                    firstName: 'Panggilan Masuk Telegram',
                  },
                  isVideo: Boolean(data.isVideo),
                  isIncoming: true,
                });
              } else if (status === 'PhoneCallDiscarded') {
                setContactCallModal((current) => (current?.isIncoming ? null : current));
                loadCalls(false);
              }
            }
          } catch {}
        };
      } catch (err) {
        setWsConnected(false);
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadChats(false);
        if (selectedChatRef.current) {
          loadMessages(selectedChatRef.current.id, false);
        }
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const backgroundInterval = setInterval(() => {
      loadChats(false);
      if (selectedChatRef.current) {
        loadMessages(selectedChatRef.current.id, false);
      }
    }, 10000);

    return () => {
      isCleanedUp = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (backgroundInterval) clearInterval(backgroundInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (socket) socket.close();
    };
  }, [currentUser, loadChats, loadMessages]);

  const handleSwitchAccount = async (sessionId: string) => {
    try {
      setLoadingChats(true);
      setSelectedChat(null);
      setMessages([]);
      const res = await apiClient.switchAccount(sessionId);
      if (res.user) {
        setCurrentUser(res.user);
        await loadAccounts();
        await loadChats();
        await loadContacts();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal beralih akun.');
    } finally {
      setLoadingChats(false);
    }
  };

  const handleLogoutAccount = async (sessionId: string) => {
    try {
      const res = await apiClient.logoutAccount(sessionId);
      if (res.hasRemaining && res.nextUser) {
        setCurrentUser(res.nextUser);
        setSelectedChat(null);
        setMessages([]);
        await loadAccounts();
        await loadChats();
        await loadContacts();
      } else {
        setCurrentUser(null);
        setAccounts([]);
        setSelectedChat(null);
        setChats([]);
        setMessages([]);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus akun.');
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch {}
    const res = await apiClient.getAccounts().catch(() => ({ accounts: [] }));
    if (res.accounts && res.accounts.length > 0) {
      handleSwitchAccount(res.accounts[0].sessionId);
    } else {
      setCurrentUser(null);
      setAccounts([]);
      setSelectedChat(null);
      setChats([]);
      setMessages([]);
    }
  };

  const handleViewChatInfo = async () => {
    if (!selectedChat) return;

    if (selectedChat.type === 'group') {
      try {
        const detail = await apiClient.getGroupDetail(selectedChat.id);
        setGroupDetail(detail);
      } catch {
        setGroupDetail({
          id: selectedChat.id,
          title: selectedChat.title,
          membersCount: 0,
          members: [],
        });
      }
      setDetailView('group');
    } else if (selectedChat.type === 'channel') {
      try {
        const detail = await apiClient.getChannelDetail(selectedChat.id);
        setChannelDetail(detail);
      } catch {
        setChannelDetail({
          id: selectedChat.id,
          title: selectedChat.title,
          subscribersCount: 0,
          isJoined: true,
        });
      }
      setDetailView('channel');
    } else {
      setDetailView('profile');
    }
  };

  const handleStartContactChat = (contact: TelegramContact) => {
    const existing = chats.find((c) => String(c.id) === String(contact.id));
    if (existing) {
      setSelectedChat(existing);
      loadMessages(existing.id);
    } else {
      const newChat: ChatSummary = {
        id: contact.id,
        title: `${contact.firstName} ${contact.lastName || ''}`.trim() || contact.username || 'Contact',
        type: 'user',
        username: contact.username,
        unreadCount: 0,
      };
      setSelectedChat(newChat);
      loadMessages(newChat.id);
    }
    setActiveTab('chats');
  };

  const handleGlobalEntitySelect = async (entity: any) => {
    if (entity.type === 'channel') {
      try {
        const detail = await apiClient.getChannelDetail(entity.id);
        setChannelDetail(detail);
        setDetailView('channel');
      } catch {
        const newChat: ChatSummary = {
          id: entity.id,
          title: entity.title,
          type: 'channel',
          username: entity.username,
          unreadCount: 0,
        };
        setSelectedChat(newChat);
        loadMessages(newChat.id);
      }
    } else if (entity.type === 'group') {
      try {
        const detail = await apiClient.getGroupDetail(entity.id);
        setGroupDetail(detail);
        setDetailView('group');
      } catch {
        const newChat: ChatSummary = {
          id: entity.id,
          title: entity.title,
          type: 'group',
          username: entity.username,
          unreadCount: 0,
        };
        setSelectedChat(newChat);
        loadMessages(newChat.id);
      }
    } else {
      handleStartContactChat({
        id: entity.id,
        firstName: entity.firstName || entity.title || 'User',
        lastName: entity.lastName,
        username: entity.username,
        phone: entity.phone,
      });
    }
  };

  const handleMentionClick = async (username: string) => {
    const cleanUser = username.replace(/^@/, '').trim();
    if (!cleanUser) return;

    const existingChat = chats.find(
      (c) => c.username?.toLowerCase() === cleanUser.toLowerCase() ||
             c.title.toLowerCase().includes(cleanUser.toLowerCase())
    );
    if (existingChat) {
      handleSelectChat(existingChat);
      return;
    }

    const existingContact = contacts.find(
      (c) => c.username?.toLowerCase() === cleanUser.toLowerCase()
    );
    if (existingContact) {
      handleStartContactChat(existingContact);
      return;
    }

    try {
      const res = await apiClient.searchGlobal('@' + cleanUser);
      if (res.publicEntity) {
        handleGlobalEntitySelect(res.publicEntity);
      } else if (res.users && res.users.length > 0) {
        handleStartContactChat(res.users[0]);
      } else {
        alert(`Pengguna atau channel @${cleanUser} tidak ditemukan.`);
      }
    } catch {
      alert(`Gagal membuka @${cleanUser}.`);
    }
  };

  if (loadingAuth) {
    return (
      <div className="w-screen h-[100dvh] flex flex-col items-center justify-center bg-white dark:bg-black font-mono text-black dark:text-white p-4 overflow-hidden">
        <div className="w-16 h-16 border-2 border-black dark:border-white flex items-center justify-center text-xl font-bold mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          G
        </div>
        <div className="text-sm font-bold tracking-widest">
          GRAM<span className="terminal-cursor">_</span>
        </div>
        <div className="text-xs text-neutral-500 mt-2">[ Menghubungkan ke MTProto... ]</div>
      </div>
    );
  }

  if (isAddingAccount) {
    return (
      <LoginView
        isAddMode={true}
        onCancel={() => setIsAddingAccount(false)}
        onLoginSuccess={(user: UserProfile) => {
          setIsAddingAccount(false);
          setCurrentUser(user);
          loadAccounts();
          loadChats();
          loadContacts();
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user: UserProfile) => {
          setCurrentUser(user);
          checkAuth();
        }}
      />
    );
  }

  const unreadTotal = chats.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);

  return (
    <div className="w-screen h-[100dvh] flex justify-center bg-neutral-200 dark:bg-neutral-900 font-mono text-black dark:text-white overflow-hidden select-none">
      <div className="w-full max-w-4xl h-[100dvh] bg-white dark:bg-black flex flex-col border-x-0 sm:border-x-2 border-black dark:border-white shadow-2xl relative overflow-hidden">
        {/* Detail view overlays */}
        {detailView === 'profile' && selectedChat && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-black">
            <ProfileView
              user={{
                id: selectedChat.id,
                firstName: selectedChat.title,
                username: selectedChat.username,
                isSelf: false,
              }}
              onBack={() => setDetailView(null)}
            />
          </div>
        )}

        {detailView === 'group' && groupDetail && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-black">
            <GroupView
              group={groupDetail}
              onBack={() => setDetailView(null)}
              onMemberClick={(memberId: string) => {
                const memberContact = contacts.find((c) => c.id === memberId);
                if (memberContact) handleStartContactChat(memberContact);
                setDetailView(null);
              }}
            />
          </div>
        )}

        {detailView === 'channel' && channelDetail && (
          <div className="absolute inset-0 z-30 bg-white dark:bg-black">
            <ChannelView
              channel={channelDetail}
              onBack={() => setDetailView(null)}
              onJoinSuccess={loadChats}
            />
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Chat List / Contacts / Settings */}
          <div
            className={`w-full md:w-80 md:border-r-2 border-black dark:border-white flex flex-col h-full overflow-hidden ${
              selectedChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Clean top header for non-chat views or drawer */}
            {activeTab !== 'chats' && (
              <RetroHeader
                title={activeTab.toUpperCase()}
                subtitle="open source messenger"
                showBack={true}
                onBack={() => setActiveTab('chats')}
                currentUser={currentUser}
                accounts={accounts}
                onSwitchAccount={handleSwitchAccount}
                onAddAccount={() => setIsAddingAccount(true)}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
              />
            )}

            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'chats' && (
                <ChatListView
                  chats={chats}
                  contacts={contacts}
                  selectedChatId={selectedChat?.id}
                  onSelectChat={handleSelectChat}
                  onOpenNewChat={() => setActiveTab('contacts')}
                  onPinChat={handlePinChat}
                  onArchiveChat={handleArchiveChat}
                  onSelectGlobalEntity={handleGlobalEntitySelect}
                  loading={loadingChats}
                />
              )}

              {activeTab === 'calls' && (
                <CallsView
                  calls={calls}
                  onStartCall={(userId: string, userName: string, isVideo?: boolean) => {
                    setContactCallModal({
                      isOpen: true,
                      contact: {
                        id: userId,
                        firstName: userName,
                      },
                      isVideo: Boolean(isVideo),
                    });
                  }}
                  onOpenContacts={() => setActiveTab('contacts')}
                  onRefresh={() => loadCalls(true)}
                  loading={loadingCalls}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactsView
                  contacts={contacts}
                  onSelectContact={handleStartContactChat}
                  onAddContact={() => setIsAddingContact(true)}
                  onCallContact={(contact: TelegramContact, isVideo?: boolean) => {
                    setContactCallModal({
                      isOpen: true,
                      contact,
                      isVideo: Boolean(isVideo),
                    });
                  }}
                  loading={loadingContacts}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  currentUser={currentUser}
                  accounts={accounts}
                  onSwitchAccount={handleSwitchAccount}
                  onAddAccount={() => setIsAddingAccount(true)}
                  onLogoutAccount={handleLogoutAccount}
                  onEditProfile={() => setIsEditingProfile(true)}
                  onLogout={handleLogout}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={toggleDarkMode}
                  wsConnected={wsConnected}
                />
              )}
            </div>

            {/* Bottom Navigation Dock (Matching Mockup 1:1, Neobrutalism Monochrome) */}
            <nav 
              aria-label="Navigasi Utama"
              className="h-16 border-t-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-around px-2 shrink-0 z-20 font-mono select-none"
            >
              {/* Messages Tab */}
              <button
                onClick={() => setActiveTab('chats')}
                className="flex flex-col items-center justify-center gap-1 cursor-pointer py-1 flex-1 text-black dark:text-white"
                title="Messages"
              >
                <div className="relative">
                  <MessageSquare className={`w-6 h-6 stroke-[2] ${activeTab === 'chats' ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`} />
                  {unreadTotal > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white rounded-full">
                      {unreadTotal}
                    </span>
                  )}
                </div>
                {activeTab === 'chats' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                )}
              </button>

              {/* Contacts Tab */}
              <button
                onClick={() => setActiveTab('contacts')}
                className="flex flex-col items-center justify-center gap-1 cursor-pointer py-1 flex-1 text-black dark:text-white"
                title="Contacts"
              >
                <Users className={`w-6 h-6 stroke-[2] ${activeTab === 'contacts' ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`} />
                {activeTab === 'contacts' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                )}
              </button>

              {/* Calls Tab */}
              <button
                onClick={() => setActiveTab('calls')}
                className="flex flex-col items-center justify-center gap-1 cursor-pointer py-1 flex-1 text-black dark:text-white"
                title="Calls"
              >
                <Phone className={`w-6 h-6 stroke-[2] ${activeTab === 'calls' ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`} />
                {activeTab === 'calls' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                )}
              </button>

              {/* Settings Tab */}
              <button
                onClick={() => setActiveTab('settings')}
                className="flex flex-col items-center justify-center gap-1 cursor-pointer py-1 flex-1 text-black dark:text-white"
                title="Settings"
              >
                <Settings className={`w-6 h-6 stroke-[2] ${activeTab === 'settings' ? 'opacity-100' : 'opacity-40 hover:opacity-75'}`} />
                {activeTab === 'settings' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                )}
              </button>
            </nav>
          </div>

          {/* Right Column: Conversation View */}
          <div
            className={`flex-1 flex flex-col h-full overflow-hidden ${
              selectedChat ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedChat ? (
              <ConversationView
                chat={selectedChat}
                onBack={() => setSelectedChat(null)}
                onViewInfo={handleViewChatInfo}
                onSendMessage={handleSendMessage}
                onSendMedia={handleSendMedia}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onForwardMessage={handleForwardMessage}
                onLoadMoreHistory={handleLoadMoreHistory}
                onMentionClick={handleMentionClick}
                messages={messages}
                loadingMessages={loadingMessages}
                hasMoreHistory={hasMoreHistory}
                allChats={chats}
                isTyping={Boolean(selectedChat && typingChats[selectedChat.id])}
                onSendTyping={() => {
                  if (selectedChat) apiClient.sendTyping(selectedChat.id).catch(() => {});
                }}
                onStartCall={(userId: string, userName: string, isVideo?: boolean) => {
                  setContactCallModal({
                    isOpen: true,
                    contact: {
                      id: userId,
                      firstName: userName,
                      username: selectedChat?.username,
                    },
                    isVideo: Boolean(isVideo),
                  });
                }}
              />
            ) : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-950 font-mono">
                <div className="w-16 h-16 border-2 border-black dark:border-white flex items-center justify-center text-2xl font-bold mb-4 bg-white dark:bg-black text-black dark:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                  ✉
                </div>
                <div className="font-bold text-sm text-black dark:text-white">
                  PILIH PERCAKAPAN
                </div>
                <div className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  Pilih percakapan dari daftar di sebelah kiri untuk membaca dan mengirim pesan MTProto secara aman.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Retro Drawer */}
        <RetroDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentUser={currentUser}
          accounts={accounts}
          onSwitchAccount={handleSwitchAccount}
          onAddAccount={() => setIsAddingAccount(true)}
          onLogoutAccount={handleLogoutAccount}
          onEditProfile={() => setIsEditingProfile(true)}
          onAddContact={() => setIsAddingContact(true)}
          onOpenSavedMessages={() => {
            const savedChat = chats.find((c) => c.type === 'saved');
            if (savedChat) {
              handleSelectChat(savedChat);
            } else {
              const newSaved: ChatSummary = {
                id: currentUser.id,
                title: 'Saved Messages',
                type: 'saved',
                unreadCount: 0,
              };
              handleSelectChat(newSaved);
            }
          }}
          onOpenArchivedChats={() => {
            alert('Arsip Obrolan');
          }}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        {/* Edit Profile Modal */}
        {isEditingProfile && currentUser && (
          <EditProfileModal
            isOpen={isEditingProfile}
            onClose={() => setIsEditingProfile(false)}
            currentUser={currentUser}
            onProfileUpdated={(updated: UserProfile) => {
              setCurrentUser(updated);
              loadAccounts();
            }}
          />
        )}

        {/* Add Contact Modal */}
        {isAddingContact && (
          <AddContactModal
            isOpen={isAddingContact}
            onClose={() => setIsAddingContact(false)}
            onContactAdded={(contact: TelegramContact) => {
              setContacts((prev) => [contact, ...prev.filter((c) => c.id !== contact.id)]);
              handleStartContactChat(contact);
            }}
          />
        )}

        {/* Global / Contacts Call Modal */}
        {contactCallModal && (
          <CallModal
            isOpen={contactCallModal.isOpen}
            onClose={() => {
              setContactCallModal(null);
              loadCalls(false);
            }}
            onCallEnded={() => {
              loadCalls(false);
            }}
            targetId={contactCallModal.contact.id}
            targetName={`${contactCallModal.contact.firstName} ${contactCallModal.contact.lastName || ''}`.trim() || contactCallModal.contact.username || 'Contact'}
            targetUsername={contactCallModal.contact.username}
            isVideoCall={contactCallModal.isVideo}
            isIncoming={contactCallModal.isIncoming}
          />
        )}
      </div>
    </div>
  );
}
