'use client';

import React, { useState } from 'react';
import { Search, MessageSquare, UserPlus, Phone, Video } from 'lucide-react';
import type { TelegramContact } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface ContactsViewProps {
  contacts: TelegramContact[];
  onSelectContact: (contact: TelegramContact) => void;
  onAddContact?: () => void;
  onCallContact?: (contact: TelegramContact, isVideo?: boolean) => void;
  loading?: boolean;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onSelectContact,
  onAddContact,
  onCallContact,
  loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    if (q.startsWith('@')) {
      const u = q.replace(/^@/, '');
      return (c.username && c.username.toLowerCase().includes(u));
    }
    const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-hidden">
      {/* Top Action & Search Bar */}
      <div className="p-2 border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 shrink-0 space-y-2">
        {onAddContact && (
          <button
            onClick={onAddContact}
            className="w-full py-2 px-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>[ + TAMBAH KONTAK BARU ]</span>
          </button>
        )}

        <div className="flex items-center gap-2 border border-black dark:border-white px-2 py-1.5 bg-white dark:bg-black">
          <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kontak atau @username..."
            className="w-full text-xs bg-transparent text-black dark:text-white placeholder-neutral-500 focus:outline-hidden"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[10px] text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
            >
              [X]
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading && contacts.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-500">
            [ Memuat daftar kontak Telegram... ]
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-500 space-y-3">
            <div>[ Tidak ada kontak ditemukan ]</div>
            {onAddContact && (
              <button
                onClick={onAddContact}
                className="px-3 py-1.5 border border-black dark:border-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                + Tambah Kontak Pertama
              </button>
            )}
          </div>
        )}

        {filtered.map((contact) => {
          const avatarUrl = apiClient.getAvatarUrl(contact.id);
          const hasError = avatarErrors[contact.id];

          return (
            <div
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-950 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-white dark:bg-black shrink-0 overflow-hidden">
                  {avatarUrl && !hasError ? (
                    <img
                      src={avatarUrl}
                      alt={contact.firstName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarErrors((prev) => ({ ...prev, [contact.id]: true }))}
                    />
                  ) : (
                    contact.firstName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs leading-tight truncate">
                    {contact.firstName} {contact.lastName || ''}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight truncate">
                    {contact.username ? `@${contact.username}` : (contact.phone || 'online')}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {onCallContact && (
                  <>
                    <button
                      onClick={() => onCallContact(contact, false)}
                      className="w-7 h-7 border border-black dark:border-white flex items-center justify-center text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      title="Panggilan Suara"
                    >
                      <Phone className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onCallContact(contact, true)}
                      className="w-7 h-7 border border-black dark:border-white flex items-center justify-center text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      title="Panggilan Video"
                    >
                      <Video className="w-3 h-3" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => onSelectContact(contact)}
                  className="w-7 h-7 border border-black dark:border-white flex items-center justify-center text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  title="Kirim Pesan"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
