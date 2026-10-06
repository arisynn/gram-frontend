'use client';

import React, { useState } from 'react';
import { ArrowLeft, Menu, User, ChevronDown, Plus, ShieldCheck, Sun, Moon } from 'lucide-react';
import type { UserProfile, AccountInfo } from '@/shared/types';
import { apiClient } from '@/lib/api-client';

interface RetroHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onMenuClick?: () => void;
  currentUser?: UserProfile | null;
  accounts?: AccountInfo[];
  onSwitchAccount?: (sessionId: string) => void;
  onAddAccount?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  rightAction?: React.ReactNode;
}

export const RetroHeader: React.FC<RetroHeaderProps> = ({
  title = 'GRAM',
  subtitle = 'open source messenger',
  showBack = false,
  showMenu = true,
  onBack,
  onMenuClick,
  currentUser,
  accounts = [],
  onSwitchAccount,
  onAddAccount,
  isDarkMode,
  onToggleDarkMode,
  rightAction,
}) => {
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const avatarUrl = currentUser ? apiClient.getAvatarUrl(currentUser.id) : null;

  return (
    <header className="w-full bg-white dark:bg-black border-b-2 border-black dark:border-white px-3 py-2 flex items-center justify-between select-none shrink-0 relative z-30">
      {/* Left: Back / Menu + Title / Active Account Indicator */}
      <div className="flex items-center gap-2 min-w-0">
        {showBack ? (
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer shrink-0"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4 text-black dark:text-white" />
          </button>
        ) : (
          <button
            onClick={onMenuClick}
            className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer shrink-0"
            title="Menu Utama"
          >
            <Menu className="w-4 h-4 text-black dark:text-white" />
          </button>
        )}

        <div className="flex items-center gap-2 truncate">
          <div className="flex flex-col truncate">
            <h1 className="font-mono text-sm font-bold tracking-wider text-black dark:text-white leading-tight flex items-center truncate">
              {title}
              <span className="terminal-cursor text-black dark:text-white">_</span>
            </h1>
            {subtitle && (
              <span className="font-mono text-[9px] text-neutral-500 tracking-tight leading-none truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Account Switcher & Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-1.5 border border-black dark:border-white px-2 py-1 bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-xs"
              title="Ganti Akun"
            >
              <div className="w-5 h-5 border border-black dark:border-white flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 overflow-hidden font-bold text-[10px]">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={currentUser.firstName}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  currentUser.firstName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <span className="font-bold text-[11px] max-w-[80px] truncate hidden sm:inline">
                {currentUser.firstName}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {/* Quick Switch Accounts Dropdown */}
            {showAccountDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAccountDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-black border-2 border-black dark:border-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-50 text-xs font-mono">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider pb-1.5 mb-1.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <span>Akun Telegram</span>
                    <span>{accounts.length} Akun</span>
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {accounts.map((acc) => {
                      const isCurrent = acc.isCurrent;
                      return (
                        <button
                          key={acc.sessionId}
                          onClick={() => {
                            setShowAccountDropdown(false);
                            if (!isCurrent && onSwitchAccount) {
                              onSwitchAccount(acc.sessionId);
                            }
                          }}
                          className={`w-full p-1.5 border flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                            isCurrent
                              ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 font-bold'
                              : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <div className="w-6 h-6 border border-black dark:border-white flex items-center justify-center font-bold text-[10px] bg-white dark:bg-black shrink-0">
                              {acc.user.firstName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="truncate min-w-0">
                              <div className="truncate text-[11px] leading-tight text-black dark:text-white">
                                {acc.user.firstName}
                              </div>
                              <div className="truncate text-[9px] text-neutral-500 leading-tight">
                                {acc.user.username ? `@${acc.user.username}` : (acc.user.phone || '')}
                              </div>
                            </div>
                          </div>

                          {isCurrent && (
                            <span className="text-[9px] border border-black dark:border-white px-1 bg-black text-white dark:bg-white dark:text-black shrink-0">
                              AKTIF
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {onAddAccount && (
                    <button
                      onClick={() => {
                        setShowAccountDropdown(false);
                        onAddAccount();
                      }}
                      className="mt-2 w-full py-1.5 border border-dashed border-black dark:border-white font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>[ + TAMBAH AKUN ]</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer text-black dark:text-white"
            title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}

        {rightAction}
      </div>
    </header>
  );
};
