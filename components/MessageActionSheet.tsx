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

const QUICK_REACTIONS = ['🔥', '😱', '😭', '🙈', '🙏', '🥹', '✨'];

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs font-sans animate-in fade-in duration-150 p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-neutral-900 border-t sm:border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 select-none animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Preview Snippet */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 truncate max-w-[240px]">
            {message.text ? (
              <span className="italic truncate block">"{message.text}"</span>
            ) : message.media?.isSticker ? (
              <span>[Stiker Telegram]</span>
            ) : (
              <span>[Lampiran Media]</span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. React Row (Matching Mockup 1:1) */}
        <div className="py-3">
          <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 mb-2 px-1">
            React
          </div>
          <div className="flex items-center justify-between bg-neutral-100/70 dark:bg-neutral-800/60 p-2 rounded-2xl">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
                className="text-2xl hover:scale-130 active:scale-95 transition-transform p-1 cursor-pointer"
                title={`Kirim reaksi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => {
                onReact('❤️');
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:scale-110 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Action Menu Items (Matching Mockup 1:1) */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm font-medium">
          {/* Copy */}
          {message.text && (
            <button
              onClick={() => {
                onCopy();
                onClose();
              }}
              className="w-full py-3 px-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-800 dark:text-neutral-100 cursor-pointer"
            >
              <span>Copy</span>
              <Copy className="w-4 h-4 text-neutral-500" />
            </button>
          )}

          {/* Reply */}
          <button
            onClick={() => {
              onReply();
              onClose();
            }}
            className="w-full py-3 px-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-800 dark:text-neutral-100 cursor-pointer"
          >
            <span>Replay</span>
            <Reply className="w-4 h-4 text-neutral-500" />
          </button>

          {/* Forward */}
          <button
            onClick={() => {
              onForward();
              onClose();
            }}
            className="w-full py-3 px-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-800 dark:text-neutral-100 cursor-pointer"
          >
            <span>Forward</span>
            <Forward className="w-4 h-4 text-neutral-500" />
          </button>

          {/* Pin Message (Requested by user!) */}
          <button
            onClick={() => {
              onPin();
              onClose();
            }}
            className="w-full py-3 px-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-800 dark:text-neutral-100 cursor-pointer"
          >
            <span>{message.isPinned ? 'Lepas Sematan (Unpin)' : 'Sematkan Pesan (Pin)'}</span>
            {message.isPinned ? (
              <PinOff className="w-4 h-4 text-amber-500" />
            ) : (
              <Pin className="w-4 h-4 text-blue-500" />
            )}
          </button>

          {/* Edit (if outgoing text) */}
          {message.isOutgoing && message.text && onEdit && (
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full py-3 px-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-800 dark:text-neutral-100 cursor-pointer"
            >
              <span>Edit</span>
              <Edit2 className="w-4 h-4 text-neutral-500" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full py-3 px-2 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400 cursor-pointer"
          >
            <span>Delete</span>
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
