'use client';

import React, { useState } from 'react';
import { ArrowLeft, MoreVertical, Users, UserPlus } from 'lucide-react';
import type { GroupDetail } from '@/shared/types';

interface GroupViewProps {
  group: GroupDetail;
  onBack: () => void;
  onMemberClick?: (memberId: string) => void;
}

export const GroupView: React.FC<GroupViewProps> = ({
  group,
  onBack,
  onMemberClick,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'files' | 'links'>('members');

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-y-auto">
      {/* Header matching mockup */}
      <header className="px-3 py-2 border-b-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-black dark:text-white" />
        </button>

        <span className="font-bold text-xs uppercase tracking-wider truncate px-2">
          Info Grup
        </span>

        <button
          className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
        >
          <MoreVertical className="w-4 h-4 text-black dark:text-white" />
        </button>
      </header>

      {/* Group Card Header */}
      <div className="p-6 flex flex-col items-center border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950">
        <div className="w-20 h-20 border-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <Users className="w-10 h-10 text-black dark:text-white" />
        </div>

        <h1 className="mt-4 font-bold text-base text-black dark:text-white text-center">
          {group.title}
        </h1>
        <span className="text-xs text-neutral-500 mt-0.5">
          {group.membersCount} anggota
        </span>
      </div>

      {/* Tabs matching mockup */}
      <div className="grid grid-cols-4 border-b border-black dark:border-white text-center text-xs">
        {(['members', 'media', 'files', 'links'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`py-2 font-bold uppercase transition-colors cursor-pointer ${
              activeTab === t
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-white text-black dark:bg-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 border-r border-black dark:border-white last:border-r-0'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <button
            onClick={() => alert('Undang kontak baru melalui Telegram MTProto.')}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-left font-bold text-xs cursor-pointer"
          >
            <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center bg-black dark:bg-white text-white dark:text-black">
              <UserPlus className="w-4 h-4" />
            </div>
            <span>+ Tambah Anggota</span>
          </button>

          {group.members.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500">
              [ Memuat daftar anggota dari Telegram... ]
            </div>
          )}

          {group.members.map((m) => (
            <div
              key={m.id}
              onClick={() => onMemberClick && onMemberClick(m.id)}
              className="px-4 py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center font-bold text-xs bg-white dark:bg-black">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-xs leading-tight">{m.name}</div>
                  <div className="text-[10px] text-neutral-500 leading-tight">
                    {m.status || (m.role ? `(${m.role})` : 'online')}
                  </div>
                </div>
              </div>

              <MoreVertical className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          ))}
        </div>
      )}

      {activeTab !== 'members' && (
        <div className="p-8 text-center text-xs text-neutral-500">
          [ Tidak ada {activeTab} dalam grup ini ]
        </div>
      )}
    </div>
  );
};
