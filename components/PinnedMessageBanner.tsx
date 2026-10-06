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
    <div className="w-full bg-neutral-100 dark:bg-neutral-900 border-b-2 border-black dark:border-white px-4 py-2 flex items-center justify-between text-xs font-mono select-none transition-all shadow-xs">
      <div 
        onClick={() => onJumpToMessage(pinnedMessage.id)}
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="w-6 h-6 rounded-md bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
          <Pin className="w-3.5 h-3.5 rotate-45" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-black dark:text-white">
            <span>Pinned Message</span>
            {totalPinnedCount > 1 && (
              <span className="text-[9px] bg-black text-white dark:bg-white dark:text-black px-1 rounded-xs font-bold">
                +{totalPinnedCount - 1}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate font-mono">
            {getPreviewText()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          onClick={() => onJumpToMessage(pinnedMessage.id)}
          className="p-1 text-black dark:text-white hover:scale-110 transition-transform cursor-pointer"
          title="Jump to message"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {onUnpin && (
          <button
            onClick={() => onUnpin(pinnedMessage.id)}
            className="p-1 text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer rounded-full"
            title="Unpin message"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
