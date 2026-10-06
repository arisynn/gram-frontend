'use client';

import React, { useState, useEffect } from 'react';
import { Smile, Sparkles, Film, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { StickerSet, StickerItem } from '@/shared/types';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: StickerItem) => void;
}

const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
  '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
  '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
  '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
  '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
  '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀',
  '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
  '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
  '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥',
  '✨', '🎉', '🎊', '🚀', '💯', '⭐', '🌟', '⚡', '💥', '🎈'
];

// Curated default high-quality animated & video stickers for instant delight
const DEFAULT_CURATED_STICKERS: StickerItem[] = [
  {
    id: 'duck_1',
    accessHash: '0',
    alt: '🦆',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHIyb296eGFicHh6YTRhYmVnd3Mza2VpaDNnbWpmMDFjNmNva2djaSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/u0vH3slTEb55cvIcaq/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'cat_love',
    accessHash: '0',
    alt: '😻',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnE2eXkyaDNwbDR2OTU5OHZ1eHl0dndrNGR2eWJpajlsYmhqaTN5NiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/MDJ9IbxxvDUQM/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'pepe_fire',
    accessHash: '0',
    alt: '🔥',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHhpZWUzbmtiaXg5YmFpaWRzYmoxbWZ0ZWc3bWlyNnJrcmVxNDI3bSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/13CoXDiaCcCoyk/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'cool_dog',
    accessHash: '0',
    alt: '😎',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9iYnk1cXh4NHc0aGhhc203b2QzYnphdHk1MG42Y2x1MXV4MGVjayZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/9CffOPMLx0Hf2/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'celebrate',
    accessHash: '0',
    alt: '🎉',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndic29vaGExdXR3bm9iOHFqamRqcThkMXdxdnJ3amJkczdxcTRnciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'heart_spark',
    accessHash: '0',
    alt: '❤️',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXQ4ZjlyMXhxeDB1c3M0OXk2dmd2a3ZjaHNpOHg0Zmd2NWJmMXdrciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26FLdmIp6wJr91JAI/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'thumbs_up',
    accessHash: '0',
    alt: '👍',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGJ4c3EwMnJjcGhkZG1ocjVxdnNpdmFma3MydHV4Z2JsdDdrbjc2MCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/111ebonMs90YLu/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
  {
    id: 'crying_laugh',
    accessHash: '0',
    alt: '🤣',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG13a3Z1b2NjcDBka210Z2lpejhxbWNqdDRyNXF2eHZ4Z2JscjdiMiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26xBFT14ap4kyvV04/giphy.gif',
    type: 'animated',
    mimeType: 'image/gif',
    width: 256,
    height: 256,
  },
];

export const StickerPicker: React.FC<StickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectSticker,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'video' | 'emojis'>('stickers');
  const [stickerSets, setStickerSets] = useState<StickerSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<StickerSet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    apiClient.getStickerSets()
      .then((sets) => {
        if (!active) return;
        if (sets && sets.length > 0) {
          setStickerSets(sets);
          // Load details for first set
          apiClient.getStickerSet(sets[0].shortName || sets[0].id)
            .then((detail) => {
              if (active && detail) setSelectedSet(detail);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isOpen]);

  const handleSelectSet = async (s: StickerSet) => {
    setSelectedSet(s);
    if (!s.stickers || s.stickers.length === 0) {
      setLoading(true);
      try {
        const detail = await apiClient.getStickerSet(s.shortName || s.id);
        if (detail) {
          setSelectedSet(detail);
        }
      } catch {}
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentStickers = (selectedSet?.stickers && selectedSet.stickers.length > 0) 
    ? selectedSet.stickers 
    : DEFAULT_CURATED_STICKERS;

  return (
    <div className="absolute bottom-18 right-2 sm:right-6 z-40 w-80 sm:w-96 bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rounded-2xl overflow-hidden flex flex-col font-mono animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Top Header & Tabs (Neobrutalism Monochrome) */}
      <div className="p-2.5 border-b-2 border-black dark:border-white flex items-center justify-between bg-neutral-100 dark:bg-neutral-900">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('stickers')}
            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              activeTab === 'stickers'
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]'
                : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stiker</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]'
                : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5" />
              <span>GIF</span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('emojis')}
            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              activeTab === 'emojis'
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]'
                : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <Smile className="w-3.5 h-3.5" />
              <span>Emoji</span>
            </span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full border border-black dark:border-white bg-white dark:bg-black flex items-center justify-center text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          title="Tutup"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="h-72 overflow-y-auto p-2 select-none bg-white dark:bg-black">
        {/* TAB 1: STICKERS */}
        {activeTab === 'stickers' && (
          <div>
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-neutral-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat koleksi stiker...</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 p-1">
                {currentStickers.map((stk) => (
                  <button
                    key={stk.id}
                    onClick={() => {
                      onSelectSticker(stk);
                      onClose();
                    }}
                    className="group relative aspect-square flex items-center justify-center p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-black/30 dark:hover:border-white/30 transition-transform active:scale-90 cursor-pointer"
                    title={stk.alt}
                  >
                    {stk.type === 'video' ? (
                      <video
                        src={stk.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <img
                        src={stk.url}
                        alt={stk.alt}
                        className="w-full h-full object-contain pointer-events-none transition-transform group-hover:scale-110"
                        loading="lazy"
                      />
                    )}
                    <span className="absolute bottom-1 right-1 text-[10px] opacity-0 group-hover:opacity-100 bg-black text-white px-1 rounded-xs">
                      {stk.alt}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VIDEO GIF STICKERS */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-4 gap-2.5 p-1">
            {DEFAULT_CURATED_STICKERS.map((stk) => (
              <button
                key={`vid_${stk.id}`}
                onClick={() => {
                  onSelectSticker(stk);
                  onClose();
                }}
                className="group relative aspect-square flex items-center justify-center p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-black/30 dark:hover:border-white/30 transition-transform active:scale-90 cursor-pointer"
                title={stk.alt}
              >
                <img
                  src={stk.url}
                  alt={stk.alt}
                  className="w-full h-full object-contain pointer-events-none transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* TAB 3: EMOJIS */}
        {activeTab === 'emojis' && (
          <div className="grid grid-cols-8 gap-1 p-1">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSelectEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg active:scale-75 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticker Sets Bar (when on stickers tab) */}
      {activeTab === 'stickers' && stickerSets.length > 0 && (
        <div className="border-t-2 border-black dark:border-white p-2 flex items-center gap-1.5 overflow-x-auto bg-neutral-100 dark:bg-neutral-900">
          {stickerSets.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSet(s)}
              className={`px-2.5 py-1 text-[11px] rounded-lg truncate shrink-0 max-w-[120px] font-bold border transition-colors cursor-pointer ${
                selectedSet?.id === s.id
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
