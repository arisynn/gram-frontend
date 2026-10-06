'use client';

import React, { useState } from 'react';
import { Search, PenSquare, Users, Landmark, Bookmark, Bot, Pin, MessageSquare } from 'lucide-react';
import type { ChatSummary } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface ChatListViewProps {
  chats: ChatSummary[];
  selectedChatId?: string | null;
  onSelectChat: (chat: ChatSummary) => void;
  onOpenNewChat?: () => void;
  loading?: boolean;
}

type FilterCategory = 'all' | 'users' | 'groups' | 'channels' | 'unread';

export const ChatListView: React.FC<ChatListViewProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onOpenNewChat,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  const formatTimestamp = (unixSeconds?: number) => {
    if (!unixSeconds) return '';
    const date = new Date(unixSeconds * 1000);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Kemarin';

    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const filteredChats = chats.filter((c) => {
    if (c.isArchived) return false;

    // Filter by Category Tab
    if (categoryFilter === 'users' && c.type !== 'user' && c.type !== 'saved' && c.type !== 'bot') return false;
    if (categoryFilter === 'groups' && c.type !== 'group') return false;
    if (categoryFilter === 'channels' && c.type !== 'channel') return false;
    if (categoryFilter === 'unread' && (c.unreadCount || 0) <= 0) return false;

    // Filter by Search Query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (q.startsWith('@')) {
      const u = q.replace(/^@/, '');
      return (c.username && c.username.toLowerCase().includes(u)) || c.title.toLowerCase().includes(u);
    }
    return (
      c.title.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.lastMessage?.date || 0) - (a.lastMessage?.date || 0);
  });

  const renderAvatar = (chat: ChatSummary) => {
    const avatarUrl = apiClient.getAvatarUrl(chat.id);
    const hasError = avatarErrors[chat.id];

    if (avatarUrl && !hasError && chat.type !== 'saved') {
      return (
        <img
          src={avatarUrl}
          alt={chat.title}
          className="w-full h-full object-cover"
          onError={() => setAvatarErrors((prev) => ({ ...prev, [chat.id]: true }))}
        />
      );
    }

    if (chat.type === 'saved') {
      return <Bookmark className="w-4 h-4 text-black dark:text-white" />;
    }
    if (chat.type === 'channel') {
      return <Landmark className="w-4 h-4 text-black dark:text-white" />;
    }
    if (chat.type === 'group') {
      return <Users className="w-4 h-4 text-black dark:text-white" />;
    }
    if (chat.type === 'bot') {
      return <Bot className="w-4 h-4 text-black dark:text-white" />;
    }

    const firstLetter = chat.title ? chat.title.trim().charAt(0).toUpperCase() : '?';
    return <span className="font-bold text-sm text-black dark:text-white">{firstLetter}</span>;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-hidden animate-fadeIn">
      {/* Search Bar */}
      <div className="p-2 border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 shrink-0">
        <div className="flex items-center gap-2 border border-black dark:border-white px-2.5 py-1.5 bg-white dark:bg-black">
          <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari percakapan, @username, teks..."
            className="w-full text-xs bg-transparent text-black dark:text-white placeholder-neutral-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer font-bold"
            >
              [X]
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="px-2 py-1.5 border-b border-black dark:border-white bg-white dark:bg-black flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-[11px] font-bold">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
            categoryFilter === 'all'
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
              : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setCategoryFilter('users')}
          className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
            categoryFilter === 'users'
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
              : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
          }`}
        >
          Pribadi
        </button>
        <button
          onClick={() => setCategoryFilter('groups')}
          className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
            categoryFilter === 'groups'
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
              : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
          }`}
        >
          Grup
        </button>
        <button
          onClick={() => setCategoryFilter('channels')}
          className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
            categoryFilter === 'channels'
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
              : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
          }`}
        >
          Channel
        </button>
        <button
          onClick={() => setCategoryFilter('unread')}
          className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
            categoryFilter === 'unread'
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
              : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
          }`}
        >
          Belum Dibaca
        </button>
      </div>

      {/* Chat list items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading && chats.length === 0 && (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 border border-neutral-300 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-1/3 h-3 bg-neutral-200 dark:bg-neutral-800" />
                  <div className="w-3/4 h-2.5 bg-neutral-100 dark:bg-neutral-900" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sortedChats.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-8 h-8 text-neutral-400" />
            <span>{searchQuery ? '[ Tidak ada percakapan yang cocok ]' : '[ Tidak ada obrolan ]'}</span>
          </div>
        )}

        {sortedChats.map((chat) => {
          const isSelected = selectedChatId === chat.id;

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors text-left cursor-pointer relative ${
                isSelected
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-l-4 border-l-black dark:border-l-white'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-950 active:bg-neutral-100 dark:active:bg-neutral-900'
              }`}
            >
              {/* Square Avatar Box */}
              <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center bg-white dark:bg-black shrink-0 overflow-hidden">
                {renderAvatar(chat)}
              </div>

              {/* Chat Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 leading-tight">
                  <div className="font-bold text-xs truncate text-black dark:text-white flex items-center gap-1.5">
                    {chat.isPinned && <Pin className="w-3 h-3 text-black dark:text-white shrink-0 fill-current" />}
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 shrink-0">
                    {formatTimestamp(chat.lastMessage?.date)}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1 leading-tight">
                  <div className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                    {chat.lastMessage?.text || (chat.username ? `@${chat.username}` : 'Belum ada pesan')}
                  </div>

                  {chat.unreadCount > 0 && (
                    <div className="min-w-4 px-1 py-0.5 bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] text-center leading-none shrink-0">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Compose Button */}
      {onOpenNewChat && (
        <button
          onClick={onOpenNewChat}
          className="absolute bottom-4 right-4 w-11 h-11 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:opacity-90 transition-opacity cursor-pointer z-10"
          title="Tulis Pesan Baru"
        >
          <PenSquare className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
