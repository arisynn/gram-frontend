'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { ChatMessage } from '@/shared/types';

interface CommentItem {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  date: number;
  avatarUrl?: string;
}

interface ChannelCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelTitle: string;
  post: ChatMessage;
  onMentionClick?: (username: string) => void;
}

export const ChannelCommentsModal: React.FC<ChannelCommentsModalProps> = ({
  isOpen,
  onClose,
  channelId,
  channelTitle,
  post,
  onMentionClick,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !post.id) return;
    let active = true;

    apiClient.getPostComments(channelId, post.id)
      .then((data) => {
        if (active) {
          setComments(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load comments:', err);
          setComments([]);
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [isOpen, post.id, channelId]);

  if (!isOpen) return null;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newComment = await apiClient.sendPostComment(channelId, post.id, textToSend);
      setComments((prev) => [...prev, newComment]);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim komentar.');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const formatCommentTime = (unixSeconds: number) => {
    if (!unixSeconds) return '';
    const d = new Date(unixSeconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Split text by URLs and @mentions
    const parts = text.split(/((?:https?:\/\/|www\.|t\.me\/)[^\s]+|@[a-zA-Z0-9_]{4,})/gi);

    return parts.map((part, index) => {
      if (!part) return null;

      // URL matching
      if (/^(https?:\/\/|www\.|t\.me\/)/i.test(part)) {
        const href = part.startsWith('http') ? part : (part.startsWith('www.') ? `https://${part}` : `https://${part}`);
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-bold underline text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 px-0.5 break-all inline"
          >
            {part}
          </a>
        );
      }

      // @mention matching
      if (/^@[a-zA-Z0-9_]{4,}/i.test(part)) {
        const username = part.replace(/^@/, '');
        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onMentionClick) onMentionClick(username);
            }}
            className="font-bold underline text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 px-0.5 inline cursor-pointer"
          >
            {part}
          </button>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-mono select-none">
      <div className="w-full max-w-lg h-[90vh] bg-white dark:bg-black border-2 border-black dark:border-white shadow-2xl flex flex-col overflow-hidden text-black dark:text-white">
        {/* Header */}
        <div className="p-3 border-b-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <div className="truncate">
              <div className="font-bold text-xs truncate">Diskusi Komentar</div>
              <div className="text-[10px] text-neutral-500 truncate">{channelTitle}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-black dark:text-white" />
          </button>
        </div>

        {/* Original Post Snippet Card */}
        <div className="p-3 border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 text-xs">
          <div className="text-[10px] font-bold uppercase text-neutral-500 mb-1">
            Postingan Channel
          </div>
          <div className="line-clamp-3 text-xs leading-relaxed italic bg-white dark:bg-black p-2 border border-neutral-200 dark:border-neutral-800">
            {post.text || (post.media ? `[${post.media.type || 'Media'}]` : 'Postingan')}
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-neutral-500">
              [ Memuat diskusi komentar... ]
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <div className="font-bold text-xs">Belum ada komentar</div>
              <div className="text-[10px] text-neutral-500 mt-1">Jadilah yang pertama menulis komentar di postingan ini!</div>
            </div>
          ) : (
            comments.map((comment) => {
              const avatar = comment.avatarUrl ? apiClient.getMediaUrl(comment.avatarUrl) : null;
              return (
                <div
                  key={comment.id}
                  className="p-2.5 border border-black dark:border-white bg-white dark:bg-black flex gap-2.5 items-start text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                >
                  <div className="w-7 h-7 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-neutral-100 dark:bg-neutral-900 shrink-0 overflow-hidden">
                    {avatar && !avatarErrors[comment.senderId] ? (
                      <img
                        src={avatar}
                        alt={comment.senderName}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarErrors((p) => ({ ...p, [comment.senderId]: true }))}
                      />
                    ) : (
                      comment.senderName.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate">{comment.senderName}</span>
                      <span className="text-[9px] text-neutral-500 shrink-0 ml-2">
                        {formatCommentTime(comment.date)}
                      </span>
                    </div>
                    <div className="text-xs whitespace-pre-wrap break-words leading-relaxed text-black dark:text-white">
                      {renderFormattedText(comment.text)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Comment Box */}
        <div className="p-2 border-t-2 border-black dark:border-white bg-white dark:bg-black shrink-0">
          <form onSubmit={handleSendComment} className="flex gap-2 items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis komentar..."
              className="flex-1 border border-black dark:border-white px-3 py-2 text-xs bg-white dark:bg-black text-black dark:text-white placeholder-neutral-500 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="py-2 px-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>[ KIRIM ]</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
