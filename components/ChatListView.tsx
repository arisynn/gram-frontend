'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  PenSquare, 
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
  CheckCheck
} from 'lucide-react';
import type { ChatSummary, GlobalSearchResult } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface ChatListViewProps {
  chats: ChatSummary[];
  selectedChatId?: string | null;
  onSelectChat: (chat: ChatSummary) => void;
  onOpenNewChat?: () => void;
  onPinChat?: (chatId: string, pinned: boolean) => void;
  onArchiveChat?: (chatId: string, archived: boolean) => void;
  onSelectGlobalEntity?: (entity: any) => void;
  loading?: boolean;
}

type FilterCategory = 'all' | 'users' | 'groups' | 'channels' | 'unread';

export const ChatListView: React.FC<ChatListViewProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onOpenNewChat,
  onPinChat,
  onArchiveChat,
  onSelectGlobalEntity,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  // Global search results state
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult | null>(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  // Debounced global search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 3) {
      setGlobalResults(null);
      setSearchingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingGlobal(true);
      try {
        const results = await apiClient.searchGlobal(q);
        setGlobalResults(results);
      } catch {
        setGlobalResults(null);
      } finally {
        setSearchingGlobal(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    return <span className="font-bold text-xs text-black dark:text-white">{firstLetter}</span>;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-hidden animate-fadeIn">
      {/* Search Input Bar */}
      <div className="p-2 border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 shrink-0">
        <div className="flex items-center gap-2 border border-black dark:border-white px-2.5 py-1.5 bg-white dark:bg-black">
          <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari obrolan, @username, teks..."
            className="w-full text-xs bg-transparent text-black dark:text-white placeholder-neutral-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setGlobalResults(null);
              }}
              className="text-[10px] text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer font-bold shrink-0"
            >
              [X]
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="px-2 py-1.5 border-b border-black dark:border-white bg-white dark:bg-black flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-[11px] font-bold">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'users', label: 'Pribadi' },
          { id: 'groups', label: 'Grup' },
          { id: 'channels', label: 'Channel' },
          { id: 'unread', label: 'Belum Dibaca' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id as FilterCategory)}
            className={`px-2 py-0.5 border transition-colors cursor-pointer shrink-0 ${
              categoryFilter === tab.id
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat list items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading && chats.length === 0 && (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
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

        {!loading && sortedChats.length === 0 && !searchQuery && (
          <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border border-black dark:border-white flex items-center justify-center text-xl bg-neutral-50 dark:bg-neutral-950">
              ✉
            </div>
            <span>[ Belum ada daftar percakapan aktif ]</span>
            {onOpenNewChat && (
              <button
                onClick={onOpenNewChat}
                className="mt-1 px-3 py-1.5 border border-black dark:border-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                + Mulai Obrolan Baru
              </button>
            )}
          </div>
        )}

        {!loading && sortedChats.length === 0 && searchQuery && (
          <div className="p-4 text-center text-xs text-neutral-500">
            [ Tidak ditemukan obrolan lokal yang cocok ]
          </div>
        )}

        {/* Local matching chats */}
        {sortedChats.map((chat) => {
          const isSelected = selectedChatId === chat.id;
          const isMenuOpen = activeMenuChatId === chat.id;

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors text-left cursor-pointer relative group ${
                isSelected
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-l-4 border-l-black dark:border-l-white'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-950'
              }`}
            >
              {/* Square Avatar */}
              <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center bg-white dark:bg-black shrink-0 overflow-hidden">
                {renderAvatar(chat)}
              </div>

              {/* Chat info */}
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
                  <div className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate flex items-center gap-1">
                    {chat.lastMessage?.isOutgoing && (
                      <span className="shrink-0">
                        <Check className="w-3 h-3 inline text-neutral-400" />
                      </span>
                    )}
                    <span className="truncate">
                      {chat.lastMessage?.text || (chat.username ? `@${chat.username}` : 'Belum ada pesan')}
                    </span>
                  </div>

                  {chat.unreadCount > 0 && (
                    <div className="min-w-4 px-1 py-0.5 bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] text-center leading-none shrink-0">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat options button (hover trigger) */}
              <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setActiveMenuChatId(isMenuOpen ? null : chat.id)}
                  className="w-6 h-6 border border-transparent hover:border-black dark:hover:border-white opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-neutral-500 hover:text-black dark:hover:text-white"
                  title="Opsi Obrolan"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActiveMenuChatId(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-black border-2 border-black dark:border-white p-1 shadow-lg z-50 text-[11px] font-mono">
                      {onPinChat && (
                        <button
                          onClick={() => {
                            setActiveMenuChatId(null);
                            onPinChat(chat.id, !chat.isPinned);
                          }}
                          className="w-full px-2 py-1.5 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        >
                          {chat.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          <span>{chat.isPinned ? 'Lepas Semat' : 'Sematkan'}</span>
                        </button>
                      )}

                      {onArchiveChat && (
                        <button
                          onClick={() => {
                            setActiveMenuChatId(null);
                            onArchiveChat(chat.id, !chat.isArchived);
                          }}
                          className="w-full px-2 py-1.5 text-left flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Arsipkan</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Global Search Results Section */}
        {searchQuery.trim().length >= 3 && (
          <div className="p-2 bg-neutral-100 dark:bg-neutral-900 border-t-2 border-black dark:border-white">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 px-1">
              <Globe className="w-3 h-3" />
              <span>Pencarian Global Telegram</span>
              {searchingGlobal && <span className="animate-pulse">[Mencari...]</span>}
            </div>

            {globalResults?.publicEntity && (
              <div
                onClick={() => onSelectGlobalEntity && onSelectGlobalEntity(globalResults.publicEntity)}
                className="p-2 border border-black dark:border-white bg-white dark:bg-black flex items-center gap-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-950 mb-2"
              >
                <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-neutral-100 dark:bg-neutral-900 shrink-0">
                  {globalResults.publicEntity.type === 'channel' ? (
                    <Landmark className="w-4 h-4" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate">
                    {globalResults.publicEntity.title}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    @{globalResults.publicEntity.username} · {globalResults.publicEntity.type}
                  </div>
                </div>
              </div>
            )}

            {globalResults?.users && globalResults.users.length > 0 && (
              <div className="space-y-1">
                {globalResults.users.slice(0, 3).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => onSelectGlobalEntity && onSelectGlobalEntity(u)}
                    className="p-2 border border-black dark:border-white bg-white dark:bg-black flex items-center gap-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-950"
                  >
                    <div className="w-7 h-7 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-white dark:bg-black shrink-0">
                      {u.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate">
                        {u.firstName} {u.lastName || ''}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {u.username ? `@${u.username}` : (u.phone || 'Telegram User')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searchingGlobal &&
              !globalResults?.publicEntity &&
              (!globalResults?.users || globalResults.users.length === 0) && (
                <div className="p-2 text-center text-[10px] text-neutral-500">
                  [ Tidak ada hasil pencarian global untuk "{searchQuery}" ]
                </div>
              )}
          </div>
        )}
      </div>

      {/* Floating Compose Button */}
      {onOpenNewChat && (
        <button
          onClick={onOpenNewChat}
          className="absolute bottom-4 right-4 w-11 h-11 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:opacity-90 transition-opacity cursor-pointer z-10"
          title="Tulis Pesan / Cari Kontak"
        >
          <PenSquare className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
