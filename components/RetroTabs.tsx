'use client';

import React from 'react';
import { MessageSquare, Phone, Users, Settings as SettingsIcon } from 'lucide-react';

export type MainTabType = 'chats' | 'calls' | 'contacts' | 'settings';

interface RetroBottomNavProps {
  activeTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  chatsCount?: number;
  callsCount?: number;
}

export const RetroBottomNav: React.FC<RetroBottomNavProps> = ({
  activeTab,
  onChangeTab,
  chatsCount = 0,
  callsCount = 0,
}) => {
  return (
    <nav className="w-full bg-[#FFFDF8] dark:bg-[#121212] border-t-[1.5px] border-neutral-900 dark:border-neutral-700 py-1.5 px-3 select-none flex items-center justify-around shrink-0 z-30 transition-all">
      {/* Tab 1: Chats */}
      <button
        onClick={() => onChangeTab('chats')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3.5 rounded-2xl transition-all duration-200 cursor-pointer ${
          activeTab === 'chats'
            ? 'bg-[#FCA5A5] dark:bg-[#BE185D] text-neutral-900 dark:text-white font-extrabold shadow-xs scale-105 border-[1.5px] border-neutral-900 dark:border-white'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 fill-current" />
          {chatsCount > 0 && activeTab !== 'chats' && (
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#F43F5E] ring-1 ring-white" />
          )}
        </div>
        <span className="text-[11px] tracking-tight">Chats</span>
      </button>

      {/* Tab 2: Calls */}
      <button
        onClick={() => onChangeTab('calls')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3.5 rounded-2xl transition-all duration-200 cursor-pointer ${
          activeTab === 'calls'
            ? 'bg-[#BAE6FD] dark:bg-[#0369A1] text-neutral-900 dark:text-white font-extrabold shadow-xs scale-105 border-[1.5px] border-neutral-900 dark:border-white'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium'
        }`}
      >
        <div className="relative">
          <Phone className="w-5 h-5 fill-current" />
          {callsCount > 0 && activeTab !== 'calls' && (
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#38BDF8] ring-1 ring-white" />
          )}
        </div>
        <span className="text-[11px] tracking-tight">Calls</span>
      </button>

      {/* Tab 3: Contacts */}
      <button
        onClick={() => onChangeTab('contacts')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3.5 rounded-2xl transition-all duration-200 cursor-pointer ${
          activeTab === 'contacts'
            ? 'bg-[#FED7AA] dark:bg-[#C2410C] text-neutral-900 dark:text-white font-extrabold shadow-xs scale-105 border-[1.5px] border-neutral-900 dark:border-white'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium'
        }`}
      >
        <Users className="w-5 h-5 fill-current" />
        <span className="text-[11px] tracking-tight">Contacts</span>
      </button>

      {/* Tab 4: Settings */}
      <button
        onClick={() => onChangeTab('settings')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3.5 rounded-2xl transition-all duration-200 cursor-pointer ${
          activeTab === 'settings'
            ? 'bg-[#BBF7D0] dark:bg-[#15803D] text-neutral-900 dark:text-white font-extrabold shadow-xs scale-105 border-[1.5px] border-neutral-900 dark:border-white'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium'
        }`}
      >
        <SettingsIcon className="w-5 h-5 fill-current" />
        <span className="text-[11px] tracking-tight">Settings</span>
      </button>
    </nav>
  );
};

export const RetroTopTabs = RetroBottomNav;
