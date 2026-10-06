'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Users, 
  Landmark, 
  Bookmark, 
  Bot, 
  Pin, 
  PinOff,
  Archive,
  MessageSquare,
  Globe,
  MoreVertical,
  Check,
  CheckCheck,
  X,
  Filter
} from 'lucide-react';
import type { ChatSummary, GlobalSearchResult, TelegramContact } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface ChatListViewProps {
  chats: ChatSummary[];
  contacts?: TelegramContact[];
  selectedChatId?: string | null;
  onSelectChat: (chat: ChatSummary) => void;
  onOpenNewChat?: () => void;
  onPinChat?: (chatId: string, pinned: boolean) => void;
  onArchiveChat?: (chatId: string, archived: boolean) => void;
  onSelectGlobalEntity?: (entity: any) => void;
  loading?: boolean;
}

type FilterCategory = 'all' | 'unread' | 'users' | 'groups' | 'channels';

export const ChatListView: React.FC<ChatListViewProps> = ({
  chats,
  contacts = [],
  selectedChatId,
  onSelectChat,
  onOpenNewChat,
  onPinChat,
  onArchiveChat,
  onSelectGlobalEntity,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  // Global search results
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult | null>(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 3) {
      setGlobalResults(null);
      setSearchingGlobal(false);
      return;
    }

    setSearchingGlobal(true);
    const timer = setTimeout(() => {
      apiClient.searchGlobal(q)
        .then((res) => setGlobalResults(res))
        .catch(() => setGlobalResults(null))
        .finally(() => setSearchingGlobal(false));
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // Filter chats by folder & search
  const filteredChats = chats
    .filter((c) => {
      if (categoryFilter === 'unread') return c.unreadCount > 0;
      if (categoryFilter === 'users') return c.type === 'user';
      if (categoryFilter === 'groups') return c.type === 'group';
      if (categoryFilter === 'channels') return c.type === 'channel';
      return true;
    })
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.lastMessage?.date || 0) - (a.lastMessage?.date || 0);
    });

  // Story / Quick contacts row
  const quickContacts = contacts.length > 0 
    ? contacts.slice(0, 10) 
    : chats.filter((c) => c.type === 'user').slice(0, 8).map((c) => ({
        id: c.id,
        firstName: c.title.split(' ')[0] || c.title,
        username: c.username,
        avatarUrl: c.avatarUrl,
      }));

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-neutral-950 font-sans select-none overflow-hidden text-neutral-900 dark:text-neutral-100">
      
      {/* 1. Header: "Mengobrol" Title + Search Toggle Button (Matching Mockup 1:1) */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Mengobrol
        </h1>
        <button
          onClick={() => {
            setShowSearchBar(!showSearchBar);
            if (showSearchBar) setSearchQuery('');
          }}
          className={`p-2 rounded-full cursor-pointer transition-colors ${
            showSearchBar 
              ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white' 
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
          }`}
          title="Cari"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input Bar (when toggled or active) */}
      {showSearchBar && (
        <div className="px-5 pb-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-3.5 py-2 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari obrolan, kontak, atau pesan..."
              autoFocus
              className="w-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Story / Quick Contacts Avatar Carousel (Matching Mockup 1:1) */}
      {!searchQuery && (
        <div className="px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-900 shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            {/* First Item: [+] Add Contact / Start Chat */}
            <div 
              onClick={onOpenNewChat}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:border-black dark:group-hover:border-white group-hover:text-black dark:group-hover:text-white transition-colors bg-neutral-50 dark:bg-neutral-900">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[11px] text-neutral-500 font-medium truncate max-w-[56px] text-center">
                Baru
              </span>
            </div>

            {/* Quick Contacts Avatars */}
            {quickContacts.map((contact) => {
              const avatar = contact.avatarUrl || apiClient.getAvatarUrl(contact.id);
              const hasErr = avatarErrors[contact.id];
              const shortName = contact.firstName || 'User';

              return (
                <div
                  key={`quick_${contact.id}`}
                  onClick={() => {
                    const existingChat = chats.find((c) => String(c.id) === String(contact.id));
                    if (existingChat) onSelectChat(existingChat);
                    else {
                      onSelectChat({
                        id: contact.id,
                        title: `${contact.firstName || ''} ${(contact as any).lastName || ''}`.trim() || 'User',
                        type: 'user',
                        username: contact.username,
                        unreadCount: 0,
                      });
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-base text-neutral-700 dark:text-neutral-200 group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                      {avatar && !hasErr ? (
                        <img
                          src={avatar}
                          alt={shortName}
                          className="w-full h-full object-cover"
                          onError={() => setAvatarErrors((p) => ({ ...p, [contact.id]: true }))}
                        />
                      ) : (
                        shortName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Live Online Green Dot */}
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-neutral-950 rounded-full" />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[60px] text-center">
                    {shortName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Section Header: "Chats" with filter tabs */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
        <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <span>Chats</span>
          <span className="text-xs font-normal text-neutral-400">({filteredChats.length})</span>
        </h2>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {(['all', 'unread', 'groups', 'channels'] as FilterCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Semua' : cat === 'unread' ? 'Belum Dibaca' : cat === 'groups' ? 'Grup' : 'Channel'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Chat List Cards (Matching Mockup 1:1) */}
      <div className="flex-1 overflow-y-auto px-2 divide-y divide-neutral-100/60 dark:divide-neutral-900/60">
        {loading && chats.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-400">
            [ Memuat obrolan Telegram... ]
          </div>
        )}

        {!loading && filteredChats.length === 0 && (
          <div className="p-10 text-center text-neutral-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">Tidak ada obrolan ditemukan</p>
          </div>
        )}

        {filteredChats.map((chat) => {
          const isSelected = selectedChatId === chat.id;
          const avatarUrl = chat.avatarUrl || apiClient.getAvatarUrl(chat.id);
          const hasAvatarError = avatarErrors[chat.id];
          const hasUnread = chat.unreadCount > 0;

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full px-3 py-3 flex items-center gap-3.5 rounded-2xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-neutral-900/90'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/40'
              }`}
            >
              {/* Circular Avatar (w-12 h-12) */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-neutral-700 dark:text-neutral-300">
                  {avatarUrl && !hasAvatarError ? (
                    <img
                      src={avatarUrl}
                      alt={chat.title}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarErrors((p) => ({ ...p, [chat.id]: true }))}
                    />
                  ) : chat.type === 'saved' ? (
                    <Bookmark className="w-5 h-5 text-blue-500" />
                  ) : chat.type === 'group' ? (
                    <Users className="w-5 h-5 text-emerald-500" />
                  ) : chat.type === 'channel' ? (
                    <Landmark className="w-5 h-5 text-purple-500" />
                  ) : chat.type === 'bot' ? (
                    <Bot className="w-5 h-5 text-amber-500" />
                  ) : (
                    chat.title.charAt(0).toUpperCase()
                  )}
                </div>

                {chat.isPinned && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs">
                    <Pin className="w-2.5 h-2.5 rotate-45" />
                  </span>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate pr-2">
                    {chat.title}
                  </h3>
                  <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                    {formatTime(chat.lastMessage?.date)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate pr-2 flex items-center gap-1 font-normal">
                    {chat.lastMessage?.isOutgoing && (
                      <span className="text-blue-500 inline-flex">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="truncate">
                      {chat.lastMessage?.text || (chat.lastMessage?.mediaType ? `[${chat.lastMessage.mediaType}]` : 'Belum ada pesan')}
                    </span>
                  </p>

                  {/* Circular Blue Unread Badge (Matching Mockup: Blue circle with white number) */}
                  {hasUnread && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
