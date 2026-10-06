'use client';

import React, { useState } from 'react';
import { 
  User, 
  Moon, 
  Sun, 
  LogOut, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Key,
  UserPlus,
  Trash2,
  Check,
  Edit2
} from 'lucide-react';
import type { UserProfile, AccountInfo } from '@/shared/types';
import { apiClient } from '@/lib/api-client';
import { ApiConfigModal } from './ApiConfigModal';

interface SettingsViewProps {
  currentUser?: UserProfile | null;
  accounts?: AccountInfo[];
  onSwitchAccount?: (sessionId: string) => void;
  onAddAccount?: () => void;
  onLogoutAccount?: (sessionId: string) => void;
  onEditProfile?: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  wsConnected: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  onLogoutAccount,
  onEditProfile,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  wsConnected,
}) => {
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [showApiModal, setShowApiModal] = useState(false);
  const avatarUrl = currentUser ? apiClient.getAvatarUrl(currentUser.id) : null;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-y-auto p-4 space-y-4">
      {/* Active Telegram Account Card */}
      {currentUser && (
        <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Akun Telegram Aktif
            </div>
            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="py-1 px-2.5 border border-black dark:border-white text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>[ EDIT PROFIL ]</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border border-black dark:border-white flex items-center justify-center font-bold text-lg bg-neutral-100 dark:bg-neutral-900 overflow-hidden shrink-0">
              {avatarUrl && !avatarErrors[currentUser.id] ? (
                <img
                  src={avatarUrl}
                  alt={currentUser.firstName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarErrors((p) => ({ ...p, [currentUser.id]: true }))}
                />
              ) : (
                currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">
                {currentUser.firstName} {currentUser.lastName || ''}
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {currentUser.username ? `@${currentUser.username}` : (currentUser.phone || 'Nomor tersembunyi')}
              </div>
              {currentUser.bio && (
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 italic truncate mt-0.5">
                  &ldquo;{currentUser.bio}&rdquo;
                </div>
              )}
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Terkoneksi ke MTProto Resmi</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Account Management Section */}
      <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Kelola Multi-Akun
            </div>
            <div className="text-xs font-bold mt-0.5">
              {accounts.length} Akun Terhubung
            </div>
          </div>

          {onAddAccount && (
            <button
              onClick={onAddAccount}
              className="py-1 px-2.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>[ + TAMBAH ]</span>
            </button>
          )}
        </div>

        <div className="space-y-2 pt-1">
          {accounts.map((acc) => {
            const isCurrent = acc.isCurrent;
            const accAvatar = apiClient.getAvatarUrl(acc.user.id);

            return (
              <div
                key={acc.sessionId}
                className={`p-2 border flex items-center justify-between gap-2 text-xs ${
                  isCurrent
                    ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 font-bold'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-950'
                }`}
              >
                <div 
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    if (!isCurrent && onSwitchAccount) onSwitchAccount(acc.sessionId);
                  }}
                >
                  <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-white dark:bg-black shrink-0 overflow-hidden">
                    {accAvatar && !avatarErrors[acc.user.id] ? (
                      <img
                        src={accAvatar}
                        alt={acc.user.firstName}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarErrors((p) => ({ ...p, [acc.user.id]: true }))}
                      />
                    ) : (
                      acc.user.firstName ? acc.user.firstName.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="truncate text-black dark:text-white">
                      {acc.user.firstName} {acc.user.lastName || ''}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {acc.user.username ? `@${acc.user.username}` : (acc.user.phone || 'ID: ' + acc.user.id)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCurrent ? (
                    <span className="text-[10px] border border-black dark:border-white px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black font-bold">
                      AKTIF
                    </span>
                  ) : (
                    <button
                      onClick={() => onSwitchAccount && onSwitchAccount(acc.sessionId)}
                      className="text-[10px] border border-black dark:border-white px-2 py-0.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold cursor-pointer"
                    >
                      [ BERALIH ]
                    </button>
                  )}

                  {accounts.length > 1 && onLogoutAccount && (
                    <button
                      onClick={() => {
                        if (confirm(`Hapus akun ${acc.user.firstName}?`)) {
                          onLogoutAccount(acc.sessionId);
                        }
                      }}
                      className="p-1 text-neutral-400 hover:text-red-500 cursor-pointer"
                      title="Hapus akun ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appearance & API Credentials */}
      <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-3">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
          Pengaturan Aplikasi
        </div>

        <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="text-xs font-bold">Tema Tampilan</span>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="py-1 px-3 border border-black dark:border-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            {isDarkMode ? '[ MODE TERANG ]' : '[ MODE GELAP ]'}
          </button>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4" />
            <span className="text-xs font-bold">Kredensial API Telegram</span>
          </div>
          <button
            onClick={() => setShowApiModal(true)}
            className="py-1 px-3 border border-black dark:border-white text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            [ KONFIGURASI ]
          </button>
        </div>
      </div>

      {/* Connection & Network Status */}
      <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-2.5">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
          Status Jaringan & Sinkronisasi
        </div>

        <div className="flex items-center justify-between text-xs py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span>WebSocket Realtime</span>
          <div className="flex items-center gap-1.5 font-bold">
            {wsConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">TERHUBUNG</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400">SIAP</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs py-1">
          <span>Protokol Enkripsi</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">MTProto 2.0</span>
        </div>
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-widest hover:opacity-90 cursor-pointer flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>[ KELUAR DARI AKUN INI ]</span>
        </button>
      </div>

      {/* Telegram API Config Modal */}
      {showApiModal && (
        <ApiConfigModal
          isOpen={showApiModal}
          onClose={() => setShowApiModal(false)}
        />
      )}
    </div>
  );
};
