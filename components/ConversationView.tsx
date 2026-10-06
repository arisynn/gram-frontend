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
  Search,
  ChevronUp,
  ChevronDown,
  Smile,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Volume2
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

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '🎉', '🚀', '💯', '🙏', '👀', '✨', '⚡'];

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

  // In-Chat Search State
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Quick Emoji Picker Popover
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Call modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  // Media preview modal state
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    scrollToBottomInstant();
    const timer = setTimeout(scrollToBottomInstant, 50);
    return () => clearTimeout(timer);
  }, [chat.id]);

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

  // Handle In-Chat Search filtering
  useEffect(() => {
    if (!inChatSearchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const q = inChatSearchQuery.toLowerCase().trim();
    const matches: number[] = [];
    messages.forEach((m) => {
      if (m.text && m.text.toLowerCase().includes(q)) {
        matches.push(m.id);
      }
    });

    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : 0);

    if (matches.length > 0) {
      jumpToMessage(matches[0]);
    }
  }, [inChatSearchQuery, messages]);

  const handleNextSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(next);
    jumpToMessage(searchMatches[next]);
  };

  const handlePrevSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prev);
    jumpToMessage(searchMatches[prev]);
  };

  // Voice Note Recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert('Tidak dapat mengakses mikrofon.');
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const finishAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
      const audioFile = new File([audioBlob], `voice_message_${Date.now()}.ogg`, {
        type: 'audio/ogg',
      });

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecordingVoice(false);
      setRecordingSeconds(0);

      try {
        setSending(true);
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
      }, 2000);
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

  const handlePlayAudio = (msgId: number, audioUrl: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => {});
      setPlayingAudioId(msgId);
    }
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

      {/* Top Header - Always pinned */}
      <header className="sticky top-0 z-20 px-3 py-2 border-b-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shrink-0"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4 text-black dark:text-white" />
          </button>

          {/* Square avatar */}
          <div 
            onClick={onViewInfo}
            className="w-8 h-8 border border-black dark:border-white flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 cursor-pointer shrink-0 overflow-hidden"
          >
            {getChatAvatar()}
          </div>

          <div 
            onClick={onViewInfo}
            className="flex flex-col cursor-pointer overflow-hidden text-left"
          >
            <h2 className="font-bold text-xs truncate leading-tight text-black dark:text-white">
              {chat.title}
            </h2>
            <span className="text-[10px] leading-tight flex items-center gap-1">
              {isTyping ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span>sedang mengetik</span>
                  <span className="terminal-cursor">_</span>
                </span>
              ) : (
                <span className="text-neutral-500 truncate">
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

        {/* Header Right Actions (In-Chat Search, Voice/Video Call, Chat Info) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowInChatSearch(!showInChatSearch)}
            className={`w-8 h-8 flex items-center justify-center border border-black dark:border-white cursor-pointer transition-colors ${
              showInChatSearch
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            title="Cari dalam Percakapan Ini"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {chat.type === 'user' && (
            <>
              <button
                onClick={() => {
                  setIsVideoCall(false);
                  setShowCallModal(true);
                }}
                className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-black dark:text-white"
                title="Panggilan Suara"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsVideoCall(true);
                  setShowCallModal(true);
                }}
                className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-black dark:text-white"
                title="Panggilan Video"
              >
                <VideoCallIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={onViewInfo}
            className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-black dark:text-white shrink-0"
            title="Detail Chat"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* In-Chat Search Bar Overlay */}
      {showInChatSearch && (
        <div className="px-3 py-1.5 border-b-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <input
              type="text"
              value={inChatSearchQuery}
              onChange={(e) => setInChatSearchQuery(e.target.value)}
              placeholder="Cari pesan di sini..."
              className="w-full bg-transparent text-xs text-black dark:text-white placeholder-neutral-500 focus:outline-hidden font-mono"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 text-[10px]">
            {searchMatches.length > 0 && (
              <span className="font-bold mr-1">
                {currentMatchIndex + 1}/{searchMatches.length}
              </span>
            )}
            <button
              onClick={handlePrevSearchMatch}
              disabled={searchMatches.length === 0}
              className="p-1 border border-black dark:border-white hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
              title="Pesan Sebelumnya"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextSearchMatch}
              disabled={searchMatches.length === 0}
              className="p-1 border border-black dark:border-white hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
              title="Pesan Berikutnya"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowInChatSearch(false);
                setInChatSearchQuery('');
              }}
              className="p-1 hover:text-red-500 cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll View */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-neutral-50 dark:bg-neutral-950"
      >
        {hasMoreHistory && (
          <div className="text-center py-2">
            <button
              onClick={() => onLoadMoreHistory()}
              disabled={loadingMessages}
              className="text-[10px] border border-black dark:border-white px-2.5 py-1 bg-white dark:bg-black cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold"
            >
              {loadingMessages ? '[ Memuat riwayat... ]' : '[ Muat riwayat pesan sebelumnya ]'}
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
              className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group transition-all duration-300 rounded-xs`}
            >
              {/* Message Bubble */}
              <div
                onClick={() => setSelectedMsgForMenu(msg)}
                className={`max-w-[85%] sm:max-w-[70%] p-2.5 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer ${
                  isOutgoing
                    ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                    : 'bg-white dark:bg-black text-black dark:text-white'
                }`}
              >
                {/* Incoming header (in groups or channels) */}
                {!isOutgoing && msg.senderName && chat.type !== 'user' && (
                  <div className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    <span>{msg.senderName}</span>
                  </div>
                )}

                {/* Reply quote banner with interactive jump */}
                {msg.replyToMsgId && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToMessage(msg.replyToMsgId!);
                    }}
                    className="mb-2 p-1.5 border-l-2 border-black dark:border-white bg-neutral-200 dark:bg-neutral-800 text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
                    title="Klik untuk melompat ke pesan asli"
                  >
                    <div className="font-bold text-neutral-700 dark:text-neutral-300 truncate">
                      {msg.replyToSender || repliedMsg?.senderName || (repliedMsg?.isOutgoing ? 'Anda' : (chat.title || 'Balasan'))}
                    </div>
                    <div className="truncate text-neutral-500 dark:text-neutral-400 italic">
                      {msg.replyToText || repliedMsg?.text || (repliedMsg?.media ? `[${repliedMsg.media.type || 'Media'}]` : `Membalas pesan #${msg.replyToMsgId}`)}
                    </div>
                  </div>
                )}

                {/* Photo Media Preview */}
                {media && media.type === 'photo' && (
                  <div className="mb-2 border border-black dark:border-white overflow-hidden bg-black max-h-64">
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
                  <div className="mb-2 border border-black dark:border-white p-2 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Video className="w-4 h-4 shrink-0" />
                      <span className="truncate font-bold text-[11px]">{media.fileName || 'Video'}</span>
                    </div>
                    <a
                      href={apiClient.getMediaUrl(media.url)}
                      download
                      className="p-1 border border-black dark:border-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Audio / Voice Note Player */}
                {media && (media.type === 'audio' || media.type === 'voice') && (
                  <div className="mb-2 border border-black dark:border-white p-2 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(msg.id, apiClient.getMediaUrl(media.url));
                        }}
                        className="w-7 h-7 border border-black dark:border-white flex items-center justify-center bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 translate-x-0.5" />
                        )}
                      </button>
                      <div>
                        <div className="font-bold text-[11px] flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          <span>{media.type === 'voice' ? 'Pesan Suara' : (media.fileName || 'Audio')}</span>
                        </div>
                        {media.duration && (
                          <div className="text-[9px] text-neutral-500">
                            {Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    </div>

                    <a
                      href={apiClient.getMediaUrl(media.url)}
                      download
                      className="p-1 border border-black dark:border-white hover:bg-neutral-200 dark:hover:bg-neutral-800 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Document/File Preview */}
                {media && media.type === 'document' && (
                  <div className="mb-2 border border-black dark:border-white p-2 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between gap-2 text-xs">
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
                      className="p-1 border border-black dark:border-white hover:bg-neutral-200 dark:hover:bg-neutral-800 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Call Action Card */}
                {msg.callAction && (
                  <div className="mb-2 p-2 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 border border-black dark:border-white flex items-center justify-center bg-white dark:bg-black">
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
                            : 'Panggilan selesai'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVideoCall(Boolean(msg.callAction?.isVideo));
                        setShowCallModal(true);
                      }}
                      className="px-2 py-1 border border-black dark:border-white text-[10px] font-bold hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Panggil Balik
                    </button>
                  </div>
                )}

                {/* Message Text with Link & Mention support */}
                {msg.text && (
                  <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                    <FormattedText text={msg.text} onMentionClick={onMentionClick} />
                  </p>
                )}

                {/* Channel Post Discussion Trigger */}
                {(chat.type === 'channel' || msg.hasComments || (msg.repliesCount && msg.repliesCount > 0)) && (
                  <div className="mt-2 pt-1.5 border-t border-dashed border-neutral-300 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentsPost(msg);
                      }}
                      className="py-1 px-2 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer text-black dark:text-white transition-colors"
                      title="Buka sesi komentar postingan ini"
                    >
                      <MessageSquare className="w-3 h-3 text-black dark:text-white" />
                      <span>
                        {msg.repliesCount ? `[ 💬 ${msg.repliesCount} Komentar ]` : '[ 💬 Buka Komentar ]'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Footer with accurate status (Centang 1 & Centang 2) */}
                <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] text-neutral-500">
                  {msg.isEdited && <span className="italic">[diedit]</span>}
                  <span>{formatMessageTime(msg.date)}</span>
                  {isOutgoing && (
                    <span title={msg.isRead ? 'Dibaca (Centang 2)' : 'Terkirim (Centang 1)'}>
                      {msg.isRead ? (
                        <CheckCheck className="w-3.5 h-3.5 text-black dark:text-white inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-neutral-400 inline" />
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
        <div className="px-3 py-1.5 border-t-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold">Balas: </span>
              <span className="text-neutral-600 dark:text-neutral-400 truncate">{replyTarget.text || 'Media'}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="p-1 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingTarget && (
        <div className="px-3 py-1.5 border-t-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Edit2 className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />
            <span className="font-bold truncate">Mengubah Pesan</span>
          </div>
          <button
            onClick={() => {
              setEditingTarget(null);
              setInputText('');
            }}
            className="p-1 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="p-2 border-t border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-base p-1 hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Composer Bar */}
      <div className="sticky bottom-0 z-20 border-t-2 border-black dark:border-white bg-white dark:bg-black p-2 shrink-0">
        {isRecordingVoice ? (
          /* Live Voice Recording Bar */
          <div className="flex items-center justify-between gap-3 px-2 py-1 bg-neutral-100 dark:bg-neutral-900 border border-red-500 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span className="font-bold text-red-600">
                Merekam Suara: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-2 py-1 border border-black dark:border-white text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={finishAndSendVoiceRecording}
                className="px-3 py-1 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Kirim
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Form */
          <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2 items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shrink-0"
              title="Kirim Foto / Berkas"
            >
              <Paperclip className="w-4 h-4 text-black dark:text-white" />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-8 h-8 flex items-center justify-center border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shrink-0 text-black dark:text-white"
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={editingTarget ? 'Ubah pesan...' : 'Ketik pesan...'}
              className="flex-1 border border-black dark:border-white px-3 py-1.5 text-xs bg-white dark:bg-black text-black dark:text-white placeholder-neutral-500 focus:outline-hidden"
            />

            {!inputText.trim() && !editingTarget ? (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shrink-0 text-black dark:text-white"
                title="Rekam Pesan Suara"
              >
                <Mic className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="py-1.5 px-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-wider hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0"
              >
                {editingTarget ? '[ UBAH ]' : '[ KIRIM ]'}
              </button>
            )}
          </form>
        )}
      </div>

      {/* Message Context Action Modal */}
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

            {/* Quick Reactions Bar */}
            <div className="flex items-center justify-between p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700">
              {['👍', '❤️', '🔥', '😂', '👏'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleSend();
                    setSelectedMsgForMenu(null);
                  }}
                  className="text-base p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
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

            {/* Delete (only if outgoing) */}
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
