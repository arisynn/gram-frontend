'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  MoreVertical, 
  Plus, 
  Search, 
  Sparkles, 
  Mic, 
  Send, 
  X, 
  Check, 
  CheckCheck, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  Phone,
  Bookmark,
  Users,
  Landmark,
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
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-hidden relative text-black dark:text-white">
      
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />

      {/* Copied Notice Banner */}
      {copiedNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white px-3.5 py-1.5 text-xs rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center gap-1.5 font-bold">
          <Check className="w-3.5 h-3.5" />
          <span>Teks berhasil disalin</span>
        </div>
      )}

      {/* 1. Header (Matching Mockup 1:1, Neobrutalism Monochrome) */}
      <header className="px-4 py-3 border-b-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] active:scale-95 transition-transform"
            title="Kembali"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Circular Avatar */}
          <div 
            onClick={onViewInfo}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
          >
            {avatar ? (
              <img src={avatar} alt={chat.title} className="w-full h-full object-cover" />
            ) : chat.type === 'saved' ? (
              <Bookmark className="w-4 h-4" />
            ) : chat.type === 'group' ? (
              <Users className="w-4 h-4" />
            ) : chat.type === 'channel' ? (
              <Landmark className="w-4 h-4" />
            ) : (
              chat.title.charAt(0).toUpperCase()
            )}
          </div>

          {/* Contact Name & Status */}
          <div onClick={onViewInfo} className="flex flex-col min-w-0 cursor-pointer text-left">
            <h2 className="text-sm font-bold text-black dark:text-white truncate">
              {chat.title}
            </h2>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {isTyping ? (
                <span className="font-bold animate-pulse">
                  mengetik...
                </span>
              ) : (
                chat.type === 'channel' ? 'Channel' : chat.type === 'group' ? 'Grup' : (chat.username ? `@${chat.username}` : 'online')
              )}
            </span>
          </div>
        </div>

        {/* Header Right Actions: Call, Search & More (Neobrutalism Monochrome) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Audio Call Button */}
          {chat.type === 'user' && onStartCall && (
            <button
              onClick={() => onStartCall(chat.id, chat.title, false)}
              className="w-9 h-9 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-transform active:scale-95"
              title="Panggilan Suara"
            >
              <Phone className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-transform active:scale-95"
            title="Cari dalam obrolan"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={onViewInfo}
            className="w-9 h-9 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-transform active:scale-95"
            title="Info Obrolan"
          >
            <MoreVertical className="w-4 h-4 stroke-[2.5]" />
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

      {/* In-Chat Search Bar (Neobrutalism Monochrome) */}
      {showSearch && (
        <div className="px-4 py-2 border-b-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center gap-2">
          <Search className="w-4 h-4 opacity-70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in chat..."
            className="w-full text-xs bg-transparent focus:outline-hidden font-mono"
            autoFocus
          />
          <button onClick={() => setShowSearch(false)} className="text-xs font-bold hover:underline cursor-pointer">
            Cancel
          </button>
        </div>
      )}

      {/* 2. Chat Messages Stream */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white dark:bg-black"
      >
        {loadingMessages && (
          <div className="text-center py-4 text-xs text-neutral-500">
            [ Memuat riwayat pesan... ]
          </div>
        )}

        {/* Date Pill Divider (Matching Mockup: Centered "Today", Neobrutalist Monochrome) */}
        <div className="flex justify-center my-3">
          <span className="text-[10px] font-black tracking-widest text-black dark:text-white bg-white dark:bg-black border-2 border-black dark:border-white px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] uppercase">
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
              } ${isHighlighted ? 'scale-102 ring-2 ring-black dark:ring-white rounded-2xl p-1' : ''}`}
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
                    <div className="absolute -bottom-2 right-2 flex items-center gap-1 bg-white dark:bg-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] border border-black dark:border-white px-1.5 py-0.5 rounded-full text-xs">
                      {msg.reactions.map((r) => (
                        <span key={r.emoji}>{r.emoji} {r.count > 1 ? r.count : ''}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* STANDARD CHAT BUBBLE (Pure Neobrutalism & Monochrome, 100% Matching Layout) */
                <div
                  onClick={() => setActiveSheetMsg(msg)}
                  className={`relative p-3.5 text-xs sm:text-sm cursor-pointer transition-all border-2 ${
                    isOut
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] rounded-2xl rounded-tr-xs max-w-[85%] sm:max-w-[72%]'
                      : 'bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] rounded-2xl rounded-tl-xs max-w-[85%] sm:max-w-[72%]'
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
                      className={`mb-2 px-2.5 py-1 text-xs rounded-lg border-l-3 cursor-pointer ${
                        isOut
                          ? 'bg-white/15 dark:bg-black/15 border-white dark:border-black text-white dark:text-black'
                          : 'bg-black/5 dark:bg-white/5 border-black dark:border-white text-black dark:text-white'
                      }`}
                    >
                      <span className="font-bold block text-[10px] uppercase">
                        {msg.replyToSender || 'Balasan'}
                      </span>
                      <span className="truncate block opacity-80 font-mono">
                        {msg.replyToText || 'Pesan'}
                      </span>
                    </div>
                  )}

                  {/* Media Content */}
                  {msg.media && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-current">
                      {msg.media.type === 'photo' && (
                        <img
                          src={msg.media.url}
                          alt="Photo"
                          className="max-h-60 w-full object-cover rounded-xl cursor-pointer hover:opacity-95"
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
                          className="max-h-60 w-full rounded-xl"
                        />
                      )}
                      {(msg.media.type === 'voice' || msg.media.type === 'audio') && (
                        <div className="flex items-center gap-2 p-1.5">
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer border ${
                              isOut 
                                ? 'bg-white text-black dark:bg-black dark:text-white border-white dark:border-black' 
                                : 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            }`}
                          >
                            {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="text-xs font-mono font-bold">
                            {msg.media.duration ? formatDuration(msg.media.duration) : 'Pesan Suara'}
                          </div>
                        </div>
                      )}
                      {msg.media.type === 'document' && (
                        <a
                          href={msg.media.url}
                          download={msg.media.fileName}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg"
                        >
                          <FileText className="w-5 h-5 shrink-0" />
                          <div className="min-w-0 flex-1 truncate text-xs">
                            <span className="font-bold truncate block">{msg.media.fileName || 'Berkas'}</span>
                          </div>
                          <Download className="w-4 h-4 shrink-0 opacity-80" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Message with Formatted parsing */}
                  {msg.text && (
                    <div className="break-words leading-relaxed font-mono">
                      <FormattedText text={msg.text} onMentionClick={onMentionClick} />
                    </div>
                  )}

                  {/* Time & Read Receipts */}
                  <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 font-mono ${
                    isOut ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-500 dark:text-neutral-400'
                  }`}>
                    <span>{formatMsgTime(msg.date)}</span>
                    {msg.isEdited && <span>(diedit)</span>}
                    {isOut && (
                      <span className="inline-flex text-white dark:text-black">
                        {msg.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>

                  {/* Reactions Pill Display on Bubble */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 bg-white dark:bg-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] border border-black dark:border-white px-2 py-0.5 rounded-full text-xs font-bold z-10 text-black dark:text-white">
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

      {/* Reply / Edit Banner above Composer (Neobrutalism Monochrome) */}
      {(replyTarget || editingTarget) && (
        <div className="px-4 py-2 border-t-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between text-xs font-mono">
          <div className="min-w-0 flex-1">
            <span className="font-bold block text-[11px] text-black dark:text-white uppercase">
              {editingTarget ? 'Edit Message' : `Replying to ${replyTarget?.senderName || 'Message'}`}
            </span>
            <span className="text-neutral-600 dark:text-neutral-400 truncate block text-[11px]">
              {editingTarget?.text || replyTarget?.text || '[Media Attachment]'}
            </span>
          </div>
          <button 
            onClick={() => {
              setReplyTarget(null);
              setEditingTarget(null);
            }}
            className="w-6 h-6 rounded-full border border-black dark:border-white bg-white dark:bg-black flex items-center justify-center text-black dark:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Composer Bar (Matching Mockup 1:1, Neobrutalism Monochrome) */}
      <footer className="p-3 border-t-2 border-black dark:border-white bg-white dark:bg-black font-mono shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* (+) Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:scale-95 transition-transform shrink-0 cursor-pointer"
            title="Kirim Foto, Video, atau Berkas"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Voice Recording Active Bar */}
          {isRecordingVoice ? (
            <div className="flex-1 bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] rounded-full px-4 py-2 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-white dark:bg-black animate-ping" />
                <span>REC: {formatDuration(recordingSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="w-7 h-7 rounded-full border border-current flex items-center justify-center cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="w-7 h-7 rounded-full bg-white text-black dark:bg-black dark:text-white border border-current flex items-center justify-center cursor-pointer"
                  title="Send Voice Note"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : (
            /* Rounded Pill Input Bar (Neobrutalism Monochrome) */
            <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-full px-4 py-2 flex items-center gap-2 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <input
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (onSendTyping) onSendTyping();
                }}
                placeholder="Message..."
                className="w-full bg-transparent text-xs sm:text-sm font-mono text-black dark:text-white placeholder-neutral-500 focus:outline-hidden"
              />

              {/* Sticker / Video Emoji Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setShowStickerPicker(!showStickerPicker)}
                className="p-1 rounded-full cursor-pointer hover:scale-110 active:scale-90 transition-transform text-black dark:text-white"
                title="Stiker & Emoji Video"
              >
                <Sparkles className="w-5 h-5 stroke-[2]" />
              </button>

              {/* Voice Note Recording Button */}
              {!inputText.trim() && (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-1 text-black dark:text-white rounded-full cursor-pointer hover:scale-110 active:scale-90 transition-transform"
                  title="Rekam Pesan Suara"
                >
                  <Mic className="w-5 h-5 stroke-[2]" />
                </button>
              )}
            </div>
          )}

          {/* Send Button (When text is entered) */}
          {inputText.trim() && (
            <button
              type="submit"
              disabled={sending}
              className="w-11 h-11 rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0"
              title="Kirim"
            >
              <Send className="w-4 h-4 ml-0.5 stroke-[2.5]" />
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

      {/* Interactive Action Sheet (Matching Mockup 1:1, Neobrutalism Monochrome) */}
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
            className="absolute top-4 right-4 text-white p-2 rounded-full border-2 border-white bg-black hover:bg-neutral-800 cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
          <img 
            src={previewMediaUrl} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" 
          />
        </div>
      )}
    </div>
  );
};
