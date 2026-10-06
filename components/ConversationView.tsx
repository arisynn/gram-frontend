'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  MoreVertical, 
  Plus, 
  Search, 
  Sparkles, 
  Mic, 
  MicOff, 
  Square, 
  Send, 
  X, 
  Check, 
  CheckCheck, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  Volume2,
  Users,
  Landmark,
  Bookmark,
  Pin
} from 'lucide-react';
import type { ChatSummary, ChatMessage, StickerItem } from '@/shared/types';
import { apiClient } from '@/lib/api-client';
import { FormattedText } from './FormattedText';
import { MessageActionSheet } from './MessageActionSheet';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { StickerPicker } from './StickerPicker';
import { ChannelCommentsModal } from './ChannelCommentsModal';

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
  onStartCall?: (userId: string, userName: string, isVideo?: boolean) => void;
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
  onStartCall,
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Modals & Action Sheet
  const [activeSheetMsg, setActiveSheetMsg] = useState<ChatMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingTarget, setEditingTarget] = useState<ChatMessage | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [forwardModalMsg, setForwardModalMsg] = useState<ChatMessage | null>(null);
  const [commentsPost, setCommentsPost] = useState<ChatMessage | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // In-chat search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Voice recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Find pinned message
  const pinnedMessage = messages.slice().reverse().find((m) => m.isPinned);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!highlightedMsgId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Jump to specific message (e.g. from pinned banner or reply quote)
  const handleJumpToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

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
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleSelectSticker = async (sticker: StickerItem) => {
    setSending(true);
    try {
      await apiClient.sendSticker(chat.id, sticker.id, sticker.accessHash, replyTarget?.id);
      setReplyTarget(null);
    } catch (err) {
      console.error('Failed to send sticker:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendReaction = async (emoji: string) => {
    if (!activeSheetMsg) return;
    try {
      await apiClient.sendReaction(chat.id, activeSheetMsg.id, emoji);
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  };

  const handleTogglePin = async (msg: ChatMessage) => {
    try {
      if (msg.isPinned) {
        await apiClient.unpinMessage(chat.id, msg.id);
      } else {
        await apiClient.pinMessage(chat.id, msg.id);
      }
    } catch (err) {
      console.error('Failed to pin/unpin message:', err);
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

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert('Izin mikrofon diperlukan untuk merekam pesan suara.');
    }
  };

  // Stop and send voice recording
  const stopVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
      const audioFile = new File([audioBlob], `voice_${Date.now()}.ogg`, { type: 'audio/ogg' });

      setSending(true);
      try {
        await onSendMedia(audioFile, undefined, replyTarget?.id);
        setReplyTarget(null);
      } catch (err: any) {
        alert(err.message || 'Gagal mengirim pesan suara.');
      } finally {
        setSending(false);
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setIsRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecordingVoice(false);
    audioChunksRef.current = [];
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMsgTime = (timestamp: number) => {
    const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const avatar = chat.avatarUrl || apiClient.getAvatarUrl(chat.id);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-neutral-950 font-sans select-none overflow-hidden relative text-neutral-900 dark:text-neutral-100">
      
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />

      {/* Copied Notice Banner */}
      {copiedNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-black/85 text-white px-3 py-1 text-xs rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Teks berhasil disalin</span>
        </div>
      )}

      {/* 1. Header (Matching Reference Image 1 & 2 Right) */}
      <header className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-900 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button with badge */}
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            title="Kembali"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Circular Avatar */}
          <div 
            onClick={onViewInfo}
            className="w-10 h-10 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer"
          >
            {avatar ? (
              <img src={avatar} alt={chat.title} className="w-full h-full object-cover" />
            ) : chat.type === 'saved' ? (
              <Bookmark className="w-4 h-4 text-blue-500" />
            ) : chat.type === 'group' ? (
              <Users className="w-4 h-4 text-emerald-500" />
            ) : chat.type === 'channel' ? (
              <Landmark className="w-4 h-4 text-purple-500" />
            ) : (
              chat.title.charAt(0).toUpperCase()
            )}
          </div>

          {/* Contact Name & Status */}
          <div onClick={onViewInfo} className="flex flex-col min-w-0 cursor-pointer text-left">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
              {chat.title}
            </h2>
            <span className="text-[11px] text-neutral-400 truncate">
              {isTyping ? (
                <span className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                  sedang mengetik...
                </span>
              ) : (
                chat.type === 'channel' ? 'Channel' : chat.type === 'group' ? 'Grup' : (chat.username ? `@${chat.username}` : 'online')
              )}
            </span>
          </div>
        </div>

        {/* Header Right Actions: Search & More */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-neutral-500 hover:text-black dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            title="Cari dalam obrolan"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onViewInfo}
            className="p-2 text-neutral-500 hover:text-black dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            title="Info Obrolan"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pinned Message Banner (If any message is pinned) */}
      {pinnedMessage && (
        <PinnedMessageBanner
          pinnedMessage={pinnedMessage}
          onJumpToMessage={handleJumpToMessage}
          onUnpin={() => handleTogglePin(pinnedMessage)}
        />
      )}

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pesan di sini..."
            className="w-full text-xs bg-transparent focus:outline-hidden"
          />
          <button onClick={() => setShowSearch(false)} className="text-xs text-neutral-400 hover:text-black">
            Batal
          </button>
        </div>
      )}

      {/* 2. Chat Messages Stream */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {loadingMessages && (
          <div className="text-center py-4 text-xs text-neutral-400">
            [ Memuat riwayat pesan... ]
          </div>
        )}

        {/* Date Pill Divider (Matching Mockup: Centered "Today") */}
        <div className="flex justify-center my-3">
          <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-1 rounded-full">
            Today
          </span>
        </div>

        {messages.map((msg) => {
          const isOut = msg.isOutgoing;
          const isSticker = msg.media?.isSticker;
          const isHighlighted = highlightedMsgId === msg.id;

          return (
            <div
              id={`msg-${msg.id}`}
              key={msg.id}
              className={`flex flex-col group transition-all duration-300 ${
                isOut ? 'items-end' : 'items-start'
              } ${isHighlighted ? 'scale-102 ring-2 ring-blue-500 rounded-2xl p-1' : ''}`}
            >
              {/* STICKER RENDERING (Seamless Transparent background, No solid bubble) */}
              {isSticker && msg.media?.url ? (
                <div 
                  onClick={() => setActiveSheetMsg(msg)}
                  className="cursor-pointer max-w-[200px] max-h-[200px] my-1 relative"
                  title={msg.media.altEmoji || 'Stiker'}
                >
                  {msg.media.stickerType === 'video' ? (
                    <video
                      src={msg.media.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-40 h-40 object-contain pointer-events-none"
                    />
                  ) : (
                    <img
                      src={msg.media.url}
                      alt={msg.media.altEmoji || 'Sticker'}
                      className="w-40 h-40 object-contain pointer-events-none hover:scale-105 transition-transform"
                    />
                  )}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="absolute -bottom-2 right-2 flex items-center gap-1 bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded-full text-xs">
                      {msg.reactions.map((r) => (
                        <span key={r.emoji}>{r.emoji} {r.count > 1 ? r.count : ''}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* STANDARD CHAT BUBBLE (Matching Mockup: Soft curved bubbles) */
                <div
                  onClick={() => setActiveSheetMsg(msg)}
                  className={`relative p-3.5 text-sm cursor-pointer shadow-2xs transition-all ${
                    isOut
                      ? 'bg-blue-600 text-white rounded-3xl rounded-tr-xs max-w-[82%] sm:max-w-[70%]'
                      : 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 rounded-3xl rounded-tl-xs max-w-[82%] sm:max-w-[70%]'
                  }`}
                >
                  {/* Pinned Icon indicator */}
                  {msg.isPinned && (
                    <div className="flex items-center gap-1 text-[10px] font-bold opacity-80 mb-1">
                      <Pin className="w-3 h-3 rotate-45" />
                      <span>Tersemat</span>
                    </div>
                  )}

                  {/* Reply Quote Banner if replying */}
                  {msg.replyToMsgId && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToMessage(msg.replyToMsgId!);
                      }}
                      className={`mb-1.5 px-2.5 py-1 text-xs rounded-xl border-l-2 cursor-pointer ${
                        isOut
                          ? 'bg-blue-700/60 border-white text-blue-100'
                          : 'bg-neutral-200/60 dark:bg-neutral-700/60 border-blue-500 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <span className="font-semibold block text-[10px]">
                        {msg.replyToSender || 'Balasan'}
                      </span>
                      <span className="truncate block opacity-85">
                        {msg.replyToText || 'Pesan'}
                      </span>
                    </div>
                  )}

                  {/* Media Content */}
                  {msg.media && (
                    <div className="mb-2 rounded-2xl overflow-hidden">
                      {msg.media.type === 'photo' && (
                        <img
                          src={msg.media.url}
                          alt="Photo"
                          className="max-h-60 w-full object-cover rounded-2xl cursor-pointer hover:opacity-95"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewMediaUrl(msg.media!.url);
                          }}
                        />
                      )}
                      {msg.media.type === 'video' && (
                        <video
                          src={msg.media.url}
                          controls
                          className="max-h-60 w-full rounded-2xl"
                        />
                      )}
                      {(msg.media.type === 'voice' || msg.media.type === 'audio') && (
                        <div className="flex items-center gap-2 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playingAudioId === msg.id) {
                                audioPlayerRef.current?.pause();
                                setPlayingAudioId(null);
                              } else {
                                const audio = new Audio(msg.media!.url);
                                audioPlayerRef.current = audio;
                                audio.play();
                                audio.onended = () => setPlayingAudioId(null);
                                setPlayingAudioId(msg.id);
                              }
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                              isOut ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="text-xs font-medium">
                            {msg.media.duration ? formatDuration(msg.media.duration) : 'Pesan Suara'}
                          </div>
                        </div>
                      )}
                      {msg.media.type === 'document' && (
                        <a
                          href={msg.media.url}
                          download={msg.media.fileName}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-xl"
                        >
                          <FileText className="w-5 h-5 shrink-0" />
                          <div className="min-w-0 flex-1 truncate text-xs">
                            <span className="font-semibold truncate block">{msg.media.fileName || 'Berkas'}</span>
                          </div>
                          <Download className="w-4 h-4 shrink-0 opacity-80" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Message with Formatted parsing */}
                  {msg.text && (
                    <div className="break-words leading-relaxed">
                      <FormattedText text={msg.text} onMentionClick={onMentionClick} />
                    </div>
                  )}

                  {/* Time & Read Receipts */}
                  <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                    isOut ? 'text-blue-200' : 'text-neutral-400'
                  }`}>
                    <span>{formatMsgTime(msg.date)}</span>
                    {msg.isEdited && <span>(diedit)</span>}
                    {isOut && (
                      <span className="inline-flex">
                        {msg.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>

                  {/* Reactions Pill Display on Bubble */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 bg-white dark:bg-neutral-900 shadow-md border border-neutral-200/80 dark:border-neutral-700 px-2 py-0.5 rounded-full text-xs font-semibold z-10">
                      {msg.reactions.map((r) => (
                        <span key={r.emoji}>{r.emoji} {r.count > 1 ? r.count : ''}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply / Edit Banner above Composer */}
      {(replyTarget || editingTarget) && (
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between text-xs">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-blue-600 dark:text-blue-400 block text-[11px]">
              {editingTarget ? 'Edit Pesan' : `Membalas ${replyTarget?.senderName || 'Pesan'}`}
            </span>
            <span className="text-neutral-500 truncate block text-[11px]">
              {editingTarget?.text || replyTarget?.text || '[Lampiran Media]'}
            </span>
          </div>
          <button 
            onClick={() => {
              setReplyTarget(null);
              setEditingTarget(null);
            }}
            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Modern Curved Composer Bar (Matching Reference Image 2 Right) */}
      <footer className="p-3 sm:p-4 border-t border-neutral-100 dark:border-neutral-900 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* (+) Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors shrink-0 cursor-pointer"
            title="Kirim Foto, Video, atau Berkas"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Voice Recording Active Bar */}
          {isRecordingVoice ? (
            <div className="flex-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-full px-4 py-2 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span>Merekam: {formatDuration(recordingSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer"
                  title="Batal"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer shadow-sm"
                  title="Kirim Pesan Suara"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Rounded Pill Input Bar */
            <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-full px-4 py-2 flex items-center gap-2 border border-neutral-200/70 dark:border-neutral-800">
              <input
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (onSendTyping) onSendTyping();
                }}
                placeholder="Tulis pesan..."
                className="w-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden font-normal"
              />

              {/* Sticker / Video Emoji Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setShowStickerPicker(!showStickerPicker)}
                className={`p-1 rounded-full cursor-pointer transition-colors ${
                  showStickerPicker 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                }`}
                title="Stiker & Emoji Video"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Voice Note Recording Button */}
              {!inputText.trim() && (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full cursor-pointer transition-colors"
                  title="Rekam Pesan Suara"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Send Button (When text is entered) */}
          {inputText.trim() && (
            <button
              type="submit"
              disabled={sending}
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-transform active:scale-90 cursor-pointer shadow-md shrink-0"
              title="Kirim"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          )}
        </form>
      </footer>

      {/* Sticker & Video Emoji Picker Drawer */}
      {showStickerPicker && (
        <StickerPicker
          isOpen={showStickerPicker}
          onClose={() => setShowStickerPicker(false)}
          onSelectEmoji={(em) => setInputText((prev) => prev + em)}
          onSelectSticker={handleSelectSticker}
        />
      )}

      {/* Interactive Action Sheet (Matching Reference Mockup 1:1) */}
      <MessageActionSheet
        isOpen={Boolean(activeSheetMsg)}
        onClose={() => setActiveSheetMsg(null)}
        message={activeSheetMsg}
        onReact={handleSendReaction}
        onCopy={() => {
          if (activeSheetMsg?.text) {
            navigator.clipboard.writeText(activeSheetMsg.text);
            setCopiedNotice(true);
            setTimeout(() => setCopiedNotice(false), 2000);
          }
        }}
        onReply={() => setReplyTarget(activeSheetMsg)}
        onForward={() => setForwardModalMsg(activeSheetMsg)}
        onPin={() => {
          if (activeSheetMsg) handleTogglePin(activeSheetMsg);
        }}
        onEdit={() => {
          if (activeSheetMsg?.isOutgoing) {
            setEditingTarget(activeSheetMsg);
            setInputText(activeSheetMsg.text || '');
          }
        }}
        onDelete={() => {
          if (activeSheetMsg) {
            onDeleteMessage(activeSheetMsg.id);
          }
        }}
      />

      {/* Fullscreen Media Viewer */}
      {previewMediaUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <button 
            onClick={() => setPreviewMediaUrl(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={previewMediaUrl} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl" 
          />
        </div>
      )}
    </div>
  );
};
