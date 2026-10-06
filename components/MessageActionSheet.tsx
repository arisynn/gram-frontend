'use client';

import React from 'react';
import { 
  Copy, 
  Reply, 
  Forward, 
  Pin, 
  Trash2, 
  Edit2, 
  Plus, 
  X,
  PinOff
} from 'lucide-react';
import type { ChatMessage } from '@/shared/types';

interface MessageActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

const QUICK_REACTIONS = ['🔥', '😱', '😭', '🙈', '🙏', '🥹', '❤️'];

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  isOpen,
  onClose,
  message,
  onReact,
  onCopy,
  onReply,
  onForward,
  onPin,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !message) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs font-mono animate-in fade-in duration-150 p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-black border-2 border-black dark:border-white rounded-t-2xl sm:rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden p-4 select-none animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Preview Snippet */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white">
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[240px]">
            {message.text ? (
              <span className="italic truncate block">"{message.text}"</span>
            ) : message.media?.isSticker ? (
              <span>[Stiker Telegram]</span>
            ) : (
              <span>[Media Attachment]</span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-black dark:border-white bg-white dark:bg-black flex items-center justify-center text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1. React Row (Matching Mockup 1:1, Neobrutalism Monochrome) */}
        <div className="py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2 px-1">
            React
          </div>
          <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border-2 border-black dark:border-white p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
                className="text-xl sm:text-2xl hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
                title={`Kirim reaksi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => {
                onReact('👍');
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white flex items-center justify-center hover:scale-110 cursor-pointer"
              title="More reactions"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 2. Action Menu Items (Matching Mockup 1:1, Neobrutalism Monochrome) */}
        <div className="divide-y divide-black/10 dark:divide-white/10 text-xs font-bold">
          {/* Copy */}
          {message.text && (
            <button
              onClick={() => {
                onCopy();
                onClose();
              }}
              className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-black dark:text-white cursor-pointer"
            >
              <span>Copy</span>
              <Copy className="w-4 h-4 opacity-70" />
            </button>
          )}

          {/* Reply */}
          <button
            onClick={() => {
              onReply();
              onClose();
            }}
            className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-black dark:text-white cursor-pointer"
          >
            <span>Replay</span>
            <Reply className="w-4 h-4 opacity-70" />
          </button>

          {/* Forward */}
          <button
            onClick={() => {
              onForward();
              onClose();
            }}
            className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-black dark:text-white cursor-pointer"
          >
            <span>Forward</span>
            <Forward className="w-4 h-4 opacity-70" />
          </button>

          {/* Pin Message */}
          <button
            onClick={() => {
              onPin();
              onClose();
            }}
            className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-black dark:text-white cursor-pointer"
          >
            <span>{message.isPinned ? 'Lepas Sematan (Unpin)' : 'Sematkan Pesan (Pin)'}</span>
            {message.isPinned ? (
              <PinOff className="w-4 h-4 opacity-70" />
            ) : (
              <Pin className="w-4 h-4 opacity-70" />
            )}
          </button>

          {/* Edit (if outgoing text) */}
          {message.isOutgoing && message.text && onEdit && (
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-black dark:text-white cursor-pointer"
            >
              <span>Edit</span>
              <Edit2 className="w-4 h-4 opacity-70" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-black dark:text-white cursor-pointer font-bold"
          >
            <span>Delete</span>
            <Trash2 className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
