'use client';

import React, { useState } from 'react';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Video, 
  Plus, 
  Search, 
  RefreshCw,
  Clock
} from 'lucide-react';
import type { CallLog } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface CallsViewProps {
  calls: CallLog[];
  onStartCall: (userId: string, userName: string, isVideo?: boolean) => void;
  onOpenContacts: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const CallsView: React.FC<CallsViewProps> = ({
  calls,
  onStartCall,
  onOpenContacts,
  onRefresh,
  loading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [search, setSearch] = useState('');
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  const formatCallDate = (unixDate: number) => {
    if (!unixDate) return '';
    const date = new Date(unixDate < 10000000000 ? unixDate * 1000 : unixDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (isToday) return `Hari ini, ${timeStr}`;

    const dateStr = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return `${dateStr}, ${timeStr}`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'Tidak terhubung';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs} detik`;
  };

  const filteredCalls = calls
    .filter((c) => {
      if (filter === 'missed') {
        return c.type === 'missed' || c.type === 'cancelled';
      }
      return true;
    })
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        c.peerName.toLowerCase().includes(q) ||
        (c.peerUsername && c.peerUsername.toLowerCase().includes(q))
      );
    });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-hidden text-black dark:text-white">
      {/* Top Header Controls */}
      <div className="p-2 border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 shrink-0 space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold border border-black dark:border-white cursor-pointer transition-colors ${
              filter === 'all'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white text-black dark:bg-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
          >
            Semua Panggilan ({calls.length})
          </button>
          <button
            onClick={() => setFilter('missed')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold border border-black dark:border-white cursor-pointer transition-colors ${
              filter === 'missed'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-black dark:bg-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
          >
            Tak Terjawab ({calls.filter((c) => c.type === 'missed' || c.type === 'cancelled').length})
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            title="Segarkan Riwayat Panggilan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 border border-black dark:border-white px-2 py-1 bg-white dark:bg-black">
          <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari riwayat panggilan..."
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

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
        {loading && calls.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>[ Memuat riwayat panggilan Telegram... ]</span>
          </div>
        )}

        {!loading && filteredCalls.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-500 space-y-3">
            <div className="w-12 h-12 border border-black dark:border-white mx-auto flex items-center justify-center text-xl bg-neutral-100 dark:bg-neutral-900">
              📞
            </div>
            <div>
              {filter === 'missed'
                ? '[ Tidak ada panggilan tak terjawab ]'
                : '[ Belum ada riwayat panggilan ]'}
            </div>
            <button
              onClick={onOpenContacts}
              className="px-3 py-1.5 border border-black dark:border-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            >
              + Mulai Panggilan Baru
            </button>
          </div>
        )}

        {filteredCalls.map((call) => {
          const avatarUrl = apiClient.getAvatarUrl(call.peerId);
          const hasError = avatarErrors[call.peerId];
          const isMissed = call.type === 'missed' || call.type === 'cancelled';
          const isOutgoing = call.type === 'outgoing' || call.type === 'cancelled';

          return (
            <div
              key={`${call.id}_${call.date}`}
              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
            >
              {/* Left: Avatar & Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-white dark:bg-black shrink-0 overflow-hidden">
                  {avatarUrl && !hasError ? (
                    <img
                      src={avatarUrl}
                      alt={call.peerName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarErrors((p) => ({ ...p, [call.peerId]: true }))}
                    />
                  ) : (
                    call.peerName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <span className={isMissed ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}>
                      {call.peerName}
                    </span>
                    {call.isVideo && (
                      <span className="text-[9px] border border-black dark:border-white px-1 bg-neutral-100 dark:bg-neutral-900 shrink-0">
                        VIDEO
                      </span>
                    )}
                  </div>

                  {/* Call Status line */}
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-0.5">
                    {call.type === 'incoming' && (
                      <PhoneIncoming className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {call.type === 'outgoing' && (
                      <PhoneOutgoing className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    {isMissed && (
                      <PhoneMissed className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                    )}

                    <span>{formatCallDate(call.date)}</span>
                    <span>•</span>
                    <span className={isMissed ? 'text-red-500 italic' : ''}>
                      {isMissed ? 'Tak terjawab' : formatDuration(call.duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Call Back Buttons */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => onStartCall(call.peerId, call.peerName, false)}
                  className="w-8 h-8 border border-black dark:border-white flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title={`Panggil Suara ${call.peerName}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onStartCall(call.peerId, call.peerName, true)}
                  className="w-8 h-8 border border-black dark:border-white flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title={`Panggilan Video ${call.peerName}`}
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
