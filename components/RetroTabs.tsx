'use client';

import React from 'react';
import { MessageSquare, Phone, Users, Settings } from 'lucide-react';

export type MainTabType = 'chats' | 'calls' | 'contacts' | 'settings';

interface RetroTopTabsProps {
  activeTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  chatsCount?: number;
  callsCount?: number;
  unreadCount?: number;
}

export const RetroTopTabs: React.FC<RetroTopTabsProps> = ({
  activeTab,
  onChangeTab,
  chatsCount = 0,
  callsCount = 0,
  unreadCount = 0,
}) => {
  const tabs = [
    {
      id: 'chats' as MainTabType,
      label: 'OBROLAN',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'calls' as MainTabType,
      label: 'PANGGILAN',
      icon: Phone,
      badge: callsCount > 0 ? callsCount : undefined,
    },
    {
      id: 'contacts' as MainTabType,
      label: 'KONTAK',
      icon: Users,
    },
    {
      id: 'settings' as MainTabType,
      label: 'PENGATURAN',
      icon: Settings,
    },
  ];

  return (
    <nav className="w-full grid grid-cols-4 bg-white dark:bg-black border-b border-black dark:border-white font-mono text-[11px] select-none shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`py-2 px-1 flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer border-r border-black dark:border-white last:border-r-0 truncate ${
              isActive
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white text-black dark:bg-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[9px] px-1 py-0.2 border leading-none font-bold shrink-0 ${
                  isActive
                    ? 'border-white text-white dark:border-black dark:text-black'
                    : 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
