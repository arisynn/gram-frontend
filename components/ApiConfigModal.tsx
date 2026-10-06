'use client';

import React, { useState } from 'react';
import { X, Key, ExternalLink, ShieldCheck, Check } from 'lucide-react';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiId, setApiId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('gram_custom_api_id') || '' : ''
  );
  const [apiHash, setApiHash] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('gram_custom_api_hash') || '' : ''
  );
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      if (apiId.trim()) localStorage.setItem('gram_custom_api_id', apiId.trim());
      else localStorage.removeItem('gram_custom_api_id');

      if (apiHash.trim()) localStorage.setItem('gram_custom_api_hash', apiHash.trim());
      else localStorage.removeItem('gram_custom_api_hash');
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (onSaved) onSaved();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-mono select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-black border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-5">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-black dark:text-white" />
            <h2 className="font-bold text-sm tracking-wider">KONFIGURASI TELEGRAM API</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 border border-black dark:border-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            GRAM terhubung langsung ke Telegram MTProto resmi. Anda memerlukan <strong>api_id</strong> dan <strong>api_hash</strong> dari Telegram Developer Portal.
          </p>

          <a
            href="https://my.telegram.org"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between hover:underline font-bold"
          >
            <span>Dapatkan Kredensial di my.telegram.org</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <div>
            <label className="font-bold block mb-1">TELEGRAM_API_ID</label>
            <input
              type="text"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              placeholder="Contoh: 12345678"
              className="w-full border border-black dark:border-white p-2 bg-white dark:bg-black focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">TELEGRAM_API_HASH</label>
            <input
              type="password"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              placeholder="Contoh: 0123456789abcdef0123456789abcdef"
              className="w-full border border-black dark:border-white p-2 bg-white dark:bg-black focus:outline-hidden"
            />
          </div>

          <div className="p-2 border border-neutral-300 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Kredensial hanya digunakan untuk otentikasi MTProto dan disimpan secara aman.</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 px-4 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold tracking-wider hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>[ TERSIMPAN ]</span>
                </>
              ) : (
                <span>[ SIMPAN KREDENSIAL ]</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white font-bold cursor-pointer"
            >
              [ TUTUP ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
