'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Pin,
  CheckCheck,
  Check,
  MessageSquare
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

export const ChatListView: React.FC<ChatListViewProps> = ({
  chats,
  contacts = [],
  selectedChatId,
  onSelectChat,
  onOpenNewChat,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

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
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format relative time like mockup: "5 min", "15 min", "1 hour", "5 hour", "yesterday"
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const timeMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const diffSec = Math.floor((now - timeMs) / 1000);

    if (diffSec < 60) return 'now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} d`;

    return new Date(timeMs).toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const filteredChats = chats
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

  // Quick Contacts / Story Avatars carousel (Matching reference mockup top bar)
  const quickContacts = contacts.length > 0 
    ? contacts.slice(0, 10) 
    : chats.filter((c) => c.type === 'user').slice(0, 8).map((c) => ({
        id: c.id,
        firstName: c.title.split(' ')[0] || c.title,
        username: c.username,
        avatarUrl: c.avatarUrl,
      }));

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black text-black dark:text-white font-mono select-none overflow-hidden relative border-r-0 md:border-r-2 border-black dark:border-white">
      
      {/* 1. Header: "Messages" + [ 🔍 ] Search Icon (Matching Mockup 1:1) */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white">
          Messages
        </h1>
        <button
          onClick={() => {
            setShowSearchInput(!showSearchInput);
            if (showSearchInput) setSearchQuery('');
          }}
          className="w-10 h-10 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-transform active:scale-95"
          title="Cari"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Expandable Search Input (Neobrutalism Monochrome) */}
      {showSearchInput && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 rounded-full border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <Search className="w-4 h-4 shrink-0 opacity-70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats or messages..."
              autoFocus
              className="w-full bg-transparent text-xs font-mono focus:outline-hidden text-black dark:text-white placeholder-neutral-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-0.5 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Horizontal Story / Quick Contacts Carousel (Matching Mockup 1:1, Neobrutalism Monochrome) */}
      {!searchQuery && (
        <div className="px-5 py-2 border-b-2 border-black dark:border-white shrink-0 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
            {/* (+) Add Contact / Status Button */}
            <div 
              onClick={onOpenNewChat}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              title="Add New Contact / Chat"
            >
              <div className="w-13 h-13 rounded-full border-2 border-dashed border-black dark:border-white bg-white dark:bg-black flex items-center justify-center text-black dark:text-white group-hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 truncate max-w-[54px] text-center">
                New
              </span>
            </div>

            {/* Quick Contacts Circles */}
            {quickContacts.map((contact) => {
              const avatar = contact.avatarUrl || apiClient.getAvatarUrl(contact.id);
              const hasErr = avatarErrors[contact.id];
              const shortName = contact.firstName || 'User';

              return (
                <div
                  key={`quick_${contact.id}`}
                  onClick={() => {
                    const existingChat = chats.find((c) => String(c.id) === String(contact.id));
                    if (existingChat) {
                      onSelectChat(existingChat);
                    } else {
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
                    <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center font-bold text-sm text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:scale-105 transition-transform">
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
                    {/* Active Online Indicator (Neobrutalist Crisp Dot) */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-black dark:bg-white border-2 border-white dark:border-black rounded-full" />
                  </div>
                  <span className="text-[10px] font-bold text-black dark:text-white truncate max-w-[56px] text-center">
                    {shortName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Chat List Items (Matching Mockup 1:1, Pure Neobrutalism & Monochrome) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {loading && chats.length === 0 && (
          <div className="p-10 text-center text-xs text-neutral-500">
            [ Loading messages... ]
          </div>
        )}

        {!loading && filteredChats.length === 0 && (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">[ No messages found ]</p>
          </div>
        )}

        {filteredChats.map((chat) => {
          const isSelected = selectedChatId === chat.id;
          const avatarUrl = chat.avatarUrl || apiClient.getAvatarUrl(chat.id);
          const hasAvatarError = avatarErrors[chat.id];
          const hasUnread = (chat.unreadCount || 0) > 0;

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full p-3 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all border-2 ${
                isSelected
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                  : 'bg-transparent border-transparent hover:border-black/30 dark:hover:border-white/30 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
              }`}
            >
              {/* Circular Avatar with Neobrutalism Border */}
              <div className="relative shrink-0">
                <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center font-bold text-base text-black dark:text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                  {avatarUrl && !hasAvatarError ? (
                    <img
                      src={avatarUrl}
                      alt={chat.title}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarErrors((p) => ({ ...p, [chat.id]: true }))}
                    />
                  ) : (
                    chat.title.charAt(0).toUpperCase()
                  )}
                </div>

                {chat.isPinned && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center text-[9px]">
                    <Pin className="w-2.5 h-2.5 rotate-45" />
                  </span>
                )}
              </div>

              {/* Chat Title & Message Snippet */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-bold truncate pr-2 text-black dark:text-white">
                    {chat.title}
                  </h3>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0 font-medium font-mono">
                    {formatTime(chat.lastMessage?.date)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate flex items-center gap-1 font-mono">
                    {chat.lastMessage?.isOutgoing && (
                      <span className="inline-flex opacity-90">
                        {chat.lastMessage.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </span>
                    )}
                    <span className="truncate">
                      {chat.lastMessage?.text || (chat.lastMessage?.mediaType ? `[${chat.lastMessage.mediaType}]` : 'Start conversation')}
                    </span>
                  </p>

                  {/* Circular Unread Badge (Monochrome Neobrutalism) */}
                  {hasUnread && (
                    <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-[10px] font-bold flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Floating Action Button [+] (Matching Mockup 1:1, Neobrutalism Monochrome) */}
      <button
        onClick={onOpenNewChat}
        className="absolute bottom-5 right-5 z-20 w-13 h-13 rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center text-2xl font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        title="Start New Chat"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>
    </div>
  );
};
