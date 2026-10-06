'use client';

import React, { useState } from 'react';
import { 
  X, 
  Bookmark, 
  Archive, 
  Moon, 
  Sun, 
  LogOut,
  UserPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Users,
  Settings
} from 'lucide-react';
import type { UserProfile, AccountInfo } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface RetroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  accounts?: AccountInfo[];
  onSwitchAccount?: (sessionId: string) => void;
  onAddAccount?: () => void;
  onLogoutAccount?: (sessionId: string) => void;
  onOpenSavedMessages?: () => void;
  onOpenArchivedChats?: () => void;
  onEditProfile?: () => void;
  onAddContact?: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const RetroDrawer: React.FC<RetroDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  onLogoutAccount,
  onOpenSavedMessages,
  onOpenArchivedChats,
  onEditProfile,
  onAddContact,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [showAccountsList, setShowAccountsList] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentAvatarUrl = currentUser ? apiClient.getAvatarUrl(currentUser.id) : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer content */}
      <aside className="relative w-80 max-w-[85vw] h-[100dvh] bg-white dark:bg-black border-r-2 border-black dark:border-white shadow-2xl flex flex-col justify-between z-10 font-mono text-sm overflow-hidden">
        {/* Top Section */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-base tracking-wider text-black dark:text-white flex items-center">
                  GRAM<span className="terminal-cursor">_</span>
                </div>
                <div className="text-[10px] text-neutral-600 dark:text-neutral-400">
                  open source messenger
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4 text-black dark:text-white" />
              </button>
            </div>

            {/* Current Active User Profile Card */}
            {currentUser && (
              <div className="border border-black dark:border-white p-2.5 bg-white dark:bg-black flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center font-bold text-base bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white shrink-0 overflow-hidden">
                      {currentAvatarUrl && !avatarErrors[currentUser.id] ? (
                        <img
                          src={currentAvatarUrl}
                          alt={currentUser.firstName}
                          className="w-full h-full object-cover"
                          onError={() => setAvatarErrors((p) => ({ ...p, [currentUser.id]: true }))}
                        />
                      ) : (
                        currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'
                      )}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <div className="font-bold truncate text-black dark:text-white text-xs">
                        {currentUser.firstName} {currentUser.lastName || ''}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                        {currentUser.username ? `@${currentUser.username}` : (currentUser.phone || 'Telegram User')}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown toggle for multi accounts & Edit Profile */}
                  <div className="flex items-center gap-1">
                    {onEditProfile && (
                      <button
                        onClick={() => {
                          onEditProfile();
                          onClose();
                        }}
                        className="p-1 border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                        title="Edit Profil Saya"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowAccountsList(!showAccountsList)}
                      className="p-1 border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-[10px] font-bold flex items-center gap-1 shrink-0"
                      title="Kelola Akun"
                    >
                      <span>{accounts.length || 1}</span>
                      {showAccountsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Account list accordion */}
                {showAccountsList && (
                  <div className="mt-2 pt-2 border-t border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col gap-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Akun Terhubung ({accounts.length})
                    </div>

                    {accounts.map((acc) => {
                      const isCurrent = acc.isCurrent;
                      const accAvatarUrl = apiClient.getAvatarUrl(acc.user.id);
                      return (
                        <div
                          key={acc.sessionId}
                          className={`p-1.5 border flex items-center justify-between gap-1 text-[11px] ${
                            isCurrent
                              ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 font-bold'
                              : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'
                          }`}
                        >
                          <div 
                            className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => {
                              if (!isCurrent && onSwitchAccount) {
                                onSwitchAccount(acc.sessionId);
                                onClose();
                              }
                            }}
                          >
                            <div className="w-6 h-6 border border-black dark:border-white flex items-center justify-center text-[10px] bg-white dark:bg-black shrink-0 overflow-hidden">
                              {accAvatarUrl && !avatarErrors[acc.user.id] ? (
                                <img
                                  src={accAvatarUrl}
                                  alt={acc.user.firstName}
                                  className="w-full h-full object-cover"
                                  onError={() => setAvatarErrors((p) => ({ ...p, [acc.user.id]: true }))}
                                />
                              ) : (
                                acc.user.firstName ? acc.user.firstName.charAt(0).toUpperCase() : 'U'
                              )}
                            </div>
                            <div className="truncate min-w-0 flex-1">
                              <div className="truncate text-black dark:text-white leading-tight">
                                {acc.user.firstName}
                              </div>
                              <div className="text-[9px] text-neutral-500 truncate leading-tight">
                                {acc.user.username ? `@${acc.user.username}` : (acc.user.phone || '')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isCurrent ? (
                              <span className="text-[9px] border border-black dark:border-white px-1 bg-black text-white dark:bg-white dark:text-black">
                                AKTIF
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (onSwitchAccount) {
                                    onSwitchAccount(acc.sessionId);
                                    onClose();
                                  }
                                }}
                                className="text-[9px] border border-black dark:border-white px-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer"
                              >
                                GANTI
                              </button>
                            )}

                            {accounts.length > 1 && onLogoutAccount && (
                              <button
                                onClick={() => onLogoutAccount(acc.sessionId)}
                                className="p-0.5 text-neutral-400 hover:text-red-500 cursor-pointer"
                                title="Hapus akun ini"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Account Button */}
                    <button
                      onClick={() => {
                        if (onAddAccount) onAddAccount();
                        onClose();
                      }}
                      className="mt-1 w-full py-1.5 px-2 border border-dashed border-black dark:border-white flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>[ + TAMBAH AKUN BARU ]</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Simple Unique Action Items */}
          <div className="py-2">
            {onEditProfile && (
              <button
                onClick={() => {
                  onEditProfile();
                  onClose();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-left cursor-pointer text-xs"
              >
                <Edit2 className="w-4 h-4 text-black dark:text-white" />
                <span className="font-bold">Pengaturan & Edit Profil</span>
              </button>
            )}

            {onAddContact && (
              <button
                onClick={() => {
                  onAddContact();
                  onClose();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-left cursor-pointer text-xs"
              >
                <Users className="w-4 h-4 text-black dark:text-white" />
                <span className="font-bold">Tambah Kontak Baru</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenSavedMessages) onOpenSavedMessages();
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-left cursor-pointer text-xs"
            >
              <Bookmark className="w-4 h-4 text-black dark:text-white" />
              <span className="font-bold">Saved Messages</span>
            </button>

            <button
              onClick={() => {
                if (onOpenArchivedChats) onOpenArchivedChats();
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-left cursor-pointer text-xs"
            >
              <Archive className="w-4 h-4 text-black dark:text-white" />
              <span className="font-bold">Arsip Obrolan</span>
            </button>

            {/* Add account directly in menu */}
            <button
              onClick={() => {
                if (onAddAccount) onAddAccount();
                onClose();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-left cursor-pointer text-xs"
            >
              <UserPlus className="w-4 h-4 text-black dark:text-white" />
              <span className="font-bold">Tambah Akun Lain</span>
            </button>

            <button
              onClick={onToggleDarkMode}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left cursor-pointer text-xs"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="font-bold">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
              </div>
              <span className="border border-black dark:border-white px-1.5 py-0.5 text-[10px] font-bold">
                {isDarkMode ? 'DARK' : 'LIGHT'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer: Logout */}
        {currentUser && (
          <div className="p-3 border-t-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 shrink-0">
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="w-full py-2.5 px-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>[ KELUAR AKUN INI ]</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
