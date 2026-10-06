'use client';

import React from 'react';
import { Pin, X, ChevronRight } from 'lucide-react';
import type { ChatMessage } from '@/shared/types';

interface PinnedMessageBannerProps {
  pinnedMessage: ChatMessage;
  totalPinnedCount?: number;
  onJumpToMessage: (messageId: number) => void;
  onUnpin?: (messageId: number) => void;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessage,
  totalPinnedCount = 1,
  onJumpToMessage,
  onUnpin,
}) => {
  const getPreviewText = () => {
    if (pinnedMessage.text) return pinnedMessage.text;
    if (pinnedMessage.media?.isSticker) return 'Stiker Telegram';
    if (pinnedMessage.media?.type === 'photo') return 'Foto';
    if (pinnedMessage.media?.type === 'video') return 'Video';
    if (pinnedMessage.media?.type === 'voice') return 'Pesan Suara';
    return 'Pesan Tersemat';
  };

  return (
    <div className="w-full bg-blue-50/90 dark:bg-neutral-800/80 backdrop-blur-md border-b border-blue-100 dark:border-neutral-700/60 px-3 py-1.5 flex items-center justify-between text-xs select-none transition-all animate-in fade-in slide-in-from-top-1 duration-150">
      <div 
        onClick={() => onJumpToMessage(pinnedMessage.id)}
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Pin className="w-3.5 h-3.5 rotate-45" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <span>Pesan Tersemat</span>
            {totalPinnedCount > 1 && (
              <span className="text-[9px] bg-blue-200 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1 rounded-sm">
                +{totalPinnedCount - 1}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-800 dark:text-neutral-200 truncate font-medium">
            {getPreviewText()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          onClick={() => onJumpToMessage(pinnedMessage.id)}
          className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          title="Lompat ke pesan"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {onUnpin && (
          <button
            onClick={() => onUnpin(pinnedMessage.id)}
            className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
            title="Lepas sematan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
