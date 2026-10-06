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
  Info,
  UserPlus,
  Trash2,
  Check,
  Edit2,
  Copy,
  Bell,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Mic,
  Users,
  ChevronRight,
  Lock,
  Database,
  Palette,
  Globe
} from 'lucide-react';
import type { UserProfile, AccountInfo } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const avatarUrl = currentUser ? apiClient.getAvatarUrl(currentUser.id) : null;

  const handleCopyUsername = () => {
    if (currentUser?.username) {
      navigator.clipboard.writeText(`@${currentUser.username}`);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FFFDF8] dark:bg-[#121212] select-none overflow-y-auto p-4 space-y-4 font-sans animate-fadeIn">
      {/* Copied Toast Banner */}
      {copiedNotice && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-3.5 py-1.5 rounded-full text-xs border border-white shadow-lg flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>Username disalin!</span>
        </div>
      )}

      {/* Top Hero Card - Pastel Soft Pink Soft-Morphism */}
      {currentUser && (
        <div className="rounded-3xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#FFD6E8] dark:bg-[#831843] p-6 shadow-xs flex flex-col items-center justify-center text-center relative">
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="absolute top-4 right-4 p-2 rounded-full border-[1.5px] border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-100 cursor-pointer shadow-xs transition-transform active:scale-95"
              title="Edit Profil"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Big Circular Avatar with thick border */}
          <div className="w-24 h-24 rounded-full border-2 border-neutral-900 dark:border-white overflow-hidden bg-white shadow-md flex items-center justify-center mb-3">
            {avatarUrl && !avatarErrors[currentUser.id] ? (
              <img
                src={avatarUrl}
                alt={currentUser.firstName}
                className="w-full h-full object-cover"
                onError={() => setAvatarErrors((p) => ({ ...p, [currentUser.id]: true }))}
              />
            ) : (
              <span className="font-extrabold text-3xl text-neutral-900">
                {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
          </div>

          <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
            {currentUser.firstName} {currentUser.lastName || ''}
          </h2>
          <span className="text-xs font-semibold text-pink-700 dark:text-pink-200 mt-0.5">
            online
          </span>
        </div>
      )}

      {/* Grouped Card 1: User Details (Username, Bio, Notifications) */}
      <div className="rounded-3xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-3.5">
        {/* Username */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Username</div>
            <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
              {currentUser?.username ? `@${currentUser.username}` : (currentUser?.phone || 'Tidak disetel')}
            </div>
          </div>
          {currentUser?.username && (
            <button
              onClick={handleCopyUsername}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              title="Salin Username"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bio */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Bio</div>
          <div className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5 leading-relaxed">
            {currentUser?.bio || 'Tidak ada bio'}
          </div>
        </div>

        {/* Notifications Toggle */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Notifikasi</span>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 p-0.5 transition-colors cursor-pointer flex items-center ${
              notificationsEnabled ? 'bg-[#FF80AB] justify-end' : 'bg-neutral-200 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white border border-neutral-900 shadow-xs" />
          </button>
        </div>
      </div>

      {/* Grouped Card 2: Media, Files, Links */}
      <div className="rounded-3xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
        <div className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Media</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
            <span>123</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Berkas & File</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
            <span>12</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <LinkIcon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Tautan / Links</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
            <span>8</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Grup Bersama</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
            <span>6</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Grouped Card 3: App Settings & Appearance */}
      <div className="rounded-3xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
        <div 
          onClick={onToggleDarkMode}
          className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Tampilan & Tema</span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-neutral-900 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Privasi & Keamanan</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </div>

        <div className="px-3 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-2xl cursor-pointer">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">Bahasa</span>
          </div>
          <span className="text-xs text-neutral-500 font-semibold">Indonesia</span>
        </div>
      </div>

      {/* Multi-Account Management Section */}
      <div className="rounded-3xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-neutral-900 dark:text-white">
            Kelola Akun ({accounts.length})
          </div>

          <button
            onClick={onAddAccount}
            className="py-1 px-3 rounded-full border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#FED7AA] dark:bg-[#C2410C] text-neutral-900 dark:text-white font-bold text-xs hover:opacity-90 cursor-pointer shadow-xs"
          >
            + Tambah Akun
          </button>
        </div>

        <div className="space-y-2 pt-1">
          {accounts.map((acc) => {
            const isCurrent = acc.isCurrent;
            const accAvatar = apiClient.getAvatarUrl(acc.user.id);

            return (
              <div
                key={acc.sessionId}
                className={`p-2.5 rounded-2xl border-[1.5px] flex items-center justify-between gap-2 text-xs transition-all ${
                  isCurrent
                    ? 'border-neutral-900 bg-[#FCE7F3] dark:bg-neutral-800 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <div 
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    if (!isCurrent && onSwitchAccount) onSwitchAccount(acc.sessionId);
                  }}
                >
                  <div className="w-8 h-8 rounded-full border border-neutral-900 dark:border-neutral-700 flex items-center justify-center font-bold text-xs bg-white dark:bg-black shrink-0 overflow-hidden">
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
                    <div className="truncate text-neutral-900 dark:text-white font-bold">
                      {acc.user.firstName} {acc.user.lastName || ''}
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {acc.user.username ? `@${acc.user.username}` : (acc.user.phone || 'ID: ' + acc.user.id)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCurrent ? (
                    <span className="text-[10px] rounded-full border border-neutral-900 dark:border-neutral-700 px-2.5 py-0.5 bg-[#FF80AB] text-white font-bold shadow-xs">
                      Aktif
                    </span>
                  ) : (
                    <button
                      onClick={() => onSwitchAccount && onSwitchAccount(acc.sessionId)}
                      className="text-[10px] rounded-full border border-neutral-900 dark:border-neutral-700 px-2.5 py-0.5 hover:bg-neutral-100 font-bold cursor-pointer"
                    >
                      Beralih
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

      {/* Logout button */}
      <div className="pt-1 pb-4">
        <button
          onClick={onLogout}
          className="w-full py-3 px-4 rounded-2xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-[#FEE2E2] dark:bg-[#7F1D1D] text-red-700 dark:text-red-200 font-bold text-xs tracking-wider hover:opacity-90 cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun</span>
        </button>
      </div>
    </div>
  );
};
