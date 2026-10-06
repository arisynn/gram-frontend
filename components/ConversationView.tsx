'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  Paperclip, 
  Users,
  Landmark,
  Bookmark,
  Reply,
  Edit2,
  Trash2,
  Copy,
  Forward,
  Download,
  X,
  FileText,
  Video,
  Check,
  CheckCheck,
  MessageSquare,
  Phone,
  Video as VideoCallIcon,
  Smile,
  Send as SendIcon
} from 'lucide-react';
import type { ChatSummary, ChatMessage } from '@/shared/types';
import { apiClient } from '@/lib/api-client';
import { FormattedText } from './FormattedText';
import { ChannelCommentsModal } from './ChannelCommentsModal';
import { CallModal } from './CallModal';

interface ConversationViewProps {
  chat: ChatSummary;
  onBack: () => void;
  onViewInfo: () => void;
  onSendMessage: (text: string, replyToMsgId?: number) => Promise<void>;
  onSendMedia: (file: File, caption?: string, replyToMsgId?: number) => Promise<void>;
  onEditMessage: (msgId: number, text: string) => Promise<void>;
  onDeleteMessage: (msgId: number) => Promise<void>;
  onForwardMessage: (fromChatId: string, toChatId: string, msgId: number) => Promise<void>;
  onLoadMoreHistory: () => Promise<void>;
  onMentionClick?: (username: string) => void;
  messages: ChatMessage[];
  loadingMessages?: boolean;
  hasMoreHistory?: boolean;
  allChats?: ChatSummary[];
  isTyping?: boolean;
  onSendTyping?: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  chat,
  onBack,
  onViewInfo,
  onSendMessage,
  onSendMedia,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onLoadMoreHistory,
  onMentionClick,
  messages,
  loadingMessages = false,
  hasMoreHistory = false,
  allChats = [],
  isTyping = false,
  onSendTyping,
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Message actions state
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingTarget, setEditingTarget] = useState<ChatMessage | null>(null);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<ChatMessage | null>(null);
  const [forwardModalMsg, setForwardModalMsg] = useState<ChatMessage | null>(null);
  const [commentsPost, setCommentsPost] = useState<ChatMessage | null>(null);

  // Call modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  // Media preview modal state
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string>(chat.id);

  const scrollToBottomInstant = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  // Instant positioning without any scroll animation when opening or switching chat
  useEffect(() => {
    scrollToBottomInstant();
    const timer = setTimeout(scrollToBottomInstant, 50);
    return () => clearTimeout(timer);
  }, [chat.id]);

  // When messages load or change, jump directly to bottom if on current chat
  useEffect(() => {
    if (!editingTarget) {
      if (prevChatIdRef.current !== chat.id) {
        prevChatIdRef.current = chat.id;
        scrollToBottomInstant();
      } else {
        scrollToBottomInstant();
      }
    }
  }, [messages.length, editingTarget, chat.id]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      if (editingTarget) {
        await onEditMessage(editingTarget.id, textToSend);
        setEditingTarget(null);
      } else {
        await onSendMessage(textToSend, replyTarget?.id);
        setReplyTarget(null);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSending(true);
    try {
      await onSendMedia(file, inputText.trim() || undefined, replyTarget?.id);
      setInputText('');
      setReplyTarget(null);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim berkas.');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setSelectedMsgForMenu(null);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMoreHistory && !loadingMessages) {
      onLoadMoreHistory();
    }
  };

  const formatMessageTime = (unixTime: number) => {
    if (!unixTime) return '';
    const ms = unixTime < 10000000000 ? unixTime * 1000 : unixTime;
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const jumpToMessage = (msgId: number) => {
    const elem = document.getElementById(`msg-${msgId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.classList.add('ring-2', 'ring-black', 'dark:ring-white');
      setTimeout(() => {
        elem.classList.remove('ring-2', 'ring-black', 'dark:ring-white');
      }, 1800);
    }
  };

  const [avatarError, setAvatarError] = useState(false);
  const lastTypingSentRef = useRef<number>(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const now = Date.now();
    if (onSendTyping && now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now;
      onSendTyping();
    }
  };

  const getChatAvatar = () => {
    const avatarUrl = apiClient.getAvatarUrl(chat.id);
    if (avatarUrl && !avatarError && chat.type !== 'saved') {
      return (
        <img
          src={avatarUrl}
          alt={chat.title}
          className="w-full h-full object-cover"
          onError={() => setAvatarError(true)}
        />
      );
    }
    if (chat.type === 'saved') return <Bookmark className="w-4 h-4 text-black dark:text-white" />;
    if (chat.type === 'channel') return <Landmark className="w-4 h-4 text-black dark:text-white" />;
    if (chat.type === 'group') return <Users className="w-4 h-4 text-black dark:text-white" />;
    const initial = chat.title ? chat.title.trim().charAt(0).toUpperCase() : '?';
    return <span className="font-bold text-sm text-black dark:text-white">{initial}</span>;
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-hidden relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Copied Notice Banner */}
      {copiedNotice && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-black dark:bg-white text-white dark:text-black px-3 py-1 text-xs border border-white dark:border-black shadow-lg flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>Teks berhasil disalin!</span>
        </div>
      )}

      {/* Top Header - Baby Blue Pastel Soft-morphism */}
      <header className="sticky top-0 z-20 px-3.5 py-2.5 border-b-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#D2EBFA] dark:bg-[#082F49] text-neutral-900 dark:text-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800 hover:bg-white cursor-pointer shrink-0 transition-transform active:scale-95"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-900 dark:text-white" />
          </button>

          {/* Rounded avatar */}
          <div 
            onClick={onViewInfo}
            className="w-9 h-9 rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 flex items-center justify-center bg-white dark:bg-neutral-800 cursor-pointer shrink-0 overflow-hidden shadow-xs"
          >
            {getChatAvatar()}
          </div>

          <div 
            onClick={onViewInfo}
            className="flex flex-col cursor-pointer overflow-hidden text-left"
          >
            <h2 className="font-extrabold text-sm truncate leading-tight text-neutral-900 dark:text-white">
              {chat.title}
            </h2>
            <span className="text-[11px] leading-tight flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-300">
              {isTyping ? (
                <span className="text-pink-600 dark:text-pink-400 font-bold flex items-center gap-1">
                  <span>sedang mengetik...</span>
                </span>
              ) : (
                <span>
                  {chat.type === 'channel' 
                    ? 'Channel' 
                    : chat.type === 'group' 
                    ? 'Group' 
                    : (chat.username ? `@${chat.username}` : 'online')}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {chat.type === 'user' && (
            <>
              <button
                onClick={() => {
                  setIsVideoCall(false);
                  setShowCallModal(true);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800 hover:bg-white cursor-pointer text-neutral-900 dark:text-white transition-transform active:scale-95"
                title="Panggilan Suara"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsVideoCall(true);
                  setShowCallModal(true);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800 hover:bg-white cursor-pointer text-neutral-900 dark:text-white transition-transform active:scale-95"
                title="Panggilan Video"
              >
                <VideoCallIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={onViewInfo}
            className="w-8 h-8 flex items-center justify-center rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800 hover:bg-white cursor-pointer text-neutral-900 dark:text-white shrink-0 transition-transform active:scale-95"
            title="Detail Chat"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Scroll View with Pastel Warm Tint Wallpaper */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-[#FEFAF3] dark:bg-[#121212]"
      >
        {hasMoreHistory && (
          <div className="text-center py-1">
            <button
              onClick={() => onLoadMoreHistory()}
              disabled={loadingMessages}
              className="text-[11px] font-bold border-[1.5px] border-neutral-900 dark:border-neutral-700 rounded-full px-3 py-1 bg-white/90 dark:bg-neutral-800 cursor-pointer shadow-xs hover:bg-neutral-100"
            >
              {loadingMessages ? 'Memuat riwayat...' : 'Muat pesan sebelumnya'}
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isOutgoing = msg.isOutgoing;
          const media = msg.media;
          const repliedMsg = msg.replyToMsgId ? messages.find((m) => m.id === msg.replyToMsgId) : null;

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group transition-all duration-300`}
            >
              {/* Message Bubble - Rounded Pastel Style */}
              <div
                onClick={() => setSelectedMsgForMenu(msg)}
                className={`max-w-[85%] sm:max-w-[75%] p-3 border-[1.5px] border-neutral-900 dark:border-neutral-700 shadow-xs cursor-pointer transition-transform active:scale-[0.99] ${
                  isOutgoing
                    ? 'bg-[#FCE7F3] dark:bg-[#831843] text-neutral-900 dark:text-white rounded-2xl rounded-tr-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl rounded-tl-xs'
                }`}
              >
                {/* Incoming sender name header */}
                {!isOutgoing && msg.senderName && chat.type !== 'user' && (
                  <div className="text-[11px] font-bold text-pink-600 dark:text-pink-400 mb-1">
                    <span>{msg.senderName}</span>
                  </div>
                )}

                {/* Reply quote banner */}
                {msg.replyToMsgId && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToMessage(msg.replyToMsgId!);
                    }}
                    className="mb-2 p-1.5 border-l-2 border-pink-500 bg-neutral-100 dark:bg-neutral-700/60 rounded-r-lg text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
                    title="Klik untuk melompat ke pesan asli"
                  >
                    <div className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                      {msg.replyToSender || repliedMsg?.senderName || (repliedMsg?.isOutgoing ? 'Anda' : (chat.title || 'Balasan'))}
                    </div>
                    <div className="truncate text-neutral-500 dark:text-neutral-400 italic">
                      {msg.replyToText || repliedMsg?.text || (repliedMsg?.media ? `[${repliedMsg.media.type || 'Media'}]` : `Membalas pesan #${msg.replyToMsgId}`)}
                    </div>
                  </div>
                )}

                {/* Photo Media Preview */}
                {media && media.type === 'photo' && (
                  <div className="mb-2 rounded-xl border-[1.5px] border-neutral-900 dark:border-neutral-700 overflow-hidden bg-black max-h-64">
                    <img
                      src={apiClient.getMediaUrl(media.url)}
                      alt="Telegram media"
                      className="w-full h-auto object-contain cursor-pointer hover:opacity-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewMediaUrl(apiClient.getMediaUrl(media.url));
                      }}
                    />
                  </div>
                )}

                {/* Video Media Preview */}
                {media && media.type === 'video' && (
                  <div className="mb-2 rounded-xl border-[1.5px] border-neutral-900 dark:border-neutral-700 p-2.5 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Video className="w-4 h-4 shrink-0" />
                      <span className="truncate">{media.fileName || 'Video'}</span>
                    </div>
                    <a
                      href={apiClient.getMediaUrl(media.url)}
                      download
                      className="p-1 rounded-lg border border-neutral-900 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Document Preview */}
                {media && media.type === 'document' && (
                  <div className="mb-2 rounded-xl border-[1.5px] border-neutral-900 dark:border-neutral-700 p-2.5 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 shrink-0" />
                      <div className="truncate">
                        <div className="truncate font-bold text-[11px]">{media.fileName || 'Dokumen'}</div>
                        {media.fileSize && (
                          <div className="text-[9px] text-neutral-500">
                            {(media.fileSize / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={apiClient.getMediaUrl(media.url)}
                      download
                      className="p-1 rounded-lg border border-neutral-900 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Call Action Card */}
                {msg.callAction && (
                  <div className="mb-2 p-2 rounded-xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border border-neutral-900 dark:border-neutral-700 flex items-center justify-center bg-white dark:bg-neutral-800">
                        {msg.callAction.isVideo ? (
                          <VideoCallIcon className="w-3.5 h-3.5" />
                        ) : (
                          <Phone className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[11px]">
                          {msg.callAction.isVideo ? 'Panggilan Video' : 'Panggilan Suara'}
                        </div>
                        <div className="text-[9px] text-neutral-500">
                          {msg.callAction.reason === 'missed'
                            ? 'Tak Terjawab'
                            : msg.callAction.duration
                            ? `${Math.floor(msg.callAction.duration / 60)}m ${msg.callAction.duration % 60}s`
                            : 'Selesai'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVideoCall(Boolean(msg.callAction?.isVideo));
                        setShowCallModal(true);
                      }}
                      className="px-2.5 py-1 rounded-full border border-neutral-900 dark:border-neutral-700 text-[10px] font-bold bg-white dark:bg-neutral-800 hover:bg-neutral-200 cursor-pointer"
                    >
                      Panggil Balik
                    </button>
                  </div>
                )}

                {/* Message Text with Link & Mention support */}
                {msg.text && (
                  <p className="text-xs whitespace-pre-wrap break-words leading-relaxed font-sans font-medium">
                    <FormattedText text={msg.text} onMentionClick={onMentionClick} />
                  </p>
                )}

                {/* Channel Comments Trigger */}
                {(chat.type === 'channel' || msg.hasComments || (msg.repliesCount && msg.repliesCount > 0)) && (
                  <div className="mt-2 pt-1.5 border-t border-dashed border-neutral-300 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentsPost(msg);
                      }}
                      className="py-1 px-2 rounded-lg border border-neutral-900 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer text-neutral-900 dark:text-white transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>
                        {msg.repliesCount ? `💬 ${msg.repliesCount} Komentar` : '💬 Buka Komentar'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Footer with time & read checks */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-500 font-sans">
                  {msg.isEdited && <span className="italic">[diedit]</span>}
                  <span>{formatMessageTime(msg.date)}</span>
                  {isOutgoing && (
                    <span>
                      {msg.isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyTarget && (
        <div className="px-4 py-2 border-t-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#FFFDF8] dark:bg-[#161616] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold">Balas: </span>
              <span className="text-neutral-600 dark:text-neutral-400 truncate">{replyTarget.text || 'Media'}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="p-1 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingTarget && (
        <div className="px-4 py-2 border-t-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#FFFDF8] dark:bg-[#161616] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Edit2 className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            <span className="font-bold truncate">Mengubah Pesan</span>
          </div>
          <button
            onClick={() => {
              setEditingTarget(null);
              setInputText('');
            }}
            className="p-1 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom Composer: Pill Input Container matching mockup */}
      <div className="sticky bottom-0 z-20 border-t-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#FFFDF8] dark:bg-[#161616] p-2.5 shrink-0 shadow-lg">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <div className="flex-1 flex items-center gap-2 rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white cursor-pointer shrink-0"
              title="Kirim Foto / Berkas"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={editingTarget ? 'Ubah pesan...' : 'Ketik pesan...'}
              className="flex-1 text-xs bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden font-sans font-medium"
            />

            <button
              type="button"
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-10 h-10 rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#F472B6] hover:bg-[#EC4899] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            title="Kirim"
          >
            <SendIcon className="w-4 h-4 translate-x-0.5" />
          </button>
        </form>
      </div>

      {/* Message Context Action Popover Modal */}
      {selectedMsgForMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-mono"
          onClick={() => setSelectedMsgForMenu(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-black border-2 border-black dark:border-white p-3 shadow-2xl flex flex-col gap-2 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold pb-2 border-b border-black dark:border-white flex items-center justify-between">
              <span>Aksi Pesan</span>
              <button onClick={() => setSelectedMsgForMenu(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reply */}
            <button
              onClick={() => {
                setReplyTarget(selectedMsgForMenu);
                setSelectedMsgForMenu(null);
              }}
              className="px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2 border border-black dark:border-white cursor-pointer"
            >
              <Reply className="w-4 h-4" />
              <span>Balas Pesan</span>
            </button>

            {/* Copy */}
            {selectedMsgForMenu.text && (
              <button
                onClick={() => handleCopyText(selectedMsgForMenu.text)}
                className="px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2 border border-black dark:border-white cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Salin Teks</span>
              </button>
            )}

            {/* Forward */}
            <button
              onClick={() => {
                setForwardModalMsg(selectedMsgForMenu);
                setSelectedMsgForMenu(null);
              }}
              className="px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2 border border-black dark:border-white cursor-pointer"
            >
              <Forward className="w-4 h-4" />
              <span>Teruskan Pesan</span>
            </button>

            {/* Edit (only if outgoing) */}
            {selectedMsgForMenu.isOutgoing && selectedMsgForMenu.text && (
              <button
                onClick={() => {
                  setEditingTarget(selectedMsgForMenu);
                  setInputText(selectedMsgForMenu.text);
                  setSelectedMsgForMenu(null);
                }}
                className="px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2 border border-black dark:border-white cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Pesan</span>
              </button>
            )}

            {/* Delete (only if outgoing or admin) */}
            {selectedMsgForMenu.isOutgoing && (
              <button
                onClick={async () => {
                  const id = selectedMsgForMenu.id;
                  setSelectedMsgForMenu(null);
                  await onDeleteMessage(id);
                }}
                className="px-3 py-2 text-left bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 hover:opacity-90 flex items-center gap-2 border border-red-500 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Pesan</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Forward Modal Picker */}
      {forwardModalMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono"
          onClick={() => setForwardModalMsg(null)}
        >
          <div
            className="w-full max-w-sm max-h-[80vh] bg-white dark:bg-black border-2 border-black dark:border-white p-4 shadow-2xl flex flex-col text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold pb-2 border-b border-black dark:border-white flex items-center justify-between mb-2">
              <span>Teruskan Ke Percakapan:</span>
              <button onClick={() => setForwardModalMsg(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
              {allChats.filter((c) => c.id !== chat.id).map((target) => (
                <button
                  key={target.id}
                  onClick={async () => {
                    const msgId = forwardModalMsg.id;
                    setForwardModalMsg(null);
                    await onForwardMessage(chat.id, target.id, msgId);
                  }}
                  className="w-full py-2.5 px-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-7 h-7 border border-black dark:border-white flex items-center justify-center font-bold text-xs">
                    {target.title.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate font-bold">{target.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-mono"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <button
            onClick={() => setPreviewMediaUrl(null)}
            className="absolute top-4 right-4 text-white p-2 border border-white hover:bg-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewMediaUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain border-2 border-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Channel Comments / Discussion Thread Modal */}
      {commentsPost && (
        <ChannelCommentsModal
          isOpen={Boolean(commentsPost)}
          onClose={() => setCommentsPost(null)}
          channelId={chat.id}
          channelTitle={chat.title}
          post={commentsPost}
          onMentionClick={onMentionClick}
        />
      )}

      {/* Voice / Video Call Modal */}
      {showCallModal && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          targetId={chat.id}
          targetName={chat.title}
          targetUsername={chat.username}
          isVideoCall={isVideoCall}
        />
      )}
    </div>
  );
};
