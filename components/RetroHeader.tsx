'use client';

import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';

interface RetroHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onMenuClick?: () => void;
  rightAction?: React.ReactNode;
}

export const RetroHeader: React.FC<RetroHeaderProps> = ({
  title = 'GRAM',
  subtitle = 'open source messenger',
  showBack = false,
  showMenu = true,
  onBack,
  onMenuClick,
  rightAction,
}) => {
  return (
    <header className="w-full bg-[#FFFDF8] dark:bg-[#161616] border-b-[1.5px] border-neutral-900 dark:border-neutral-700 px-4 py-3 flex items-center justify-between select-none shrink-0 z-20">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-2xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-[#FED7AA] dark:hover:bg-neutral-700 transition-colors cursor-pointer shadow-xs"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-900 dark:text-white" />
          </button>
        ) : showMenu ? (
          <button
            onClick={onMenuClick}
            className="w-9 h-9 flex items-center justify-center rounded-2xl border-[1.5px] border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-[#FCA5A5] dark:hover:bg-neutral-700 transition-colors cursor-pointer shadow-xs"
            title="Menu"
          >
            <Menu className="w-4 h-4 text-neutral-900 dark:text-white" />
          </button>
        ) : null}

        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white leading-none">
            {title}
          </h1>
          {subtitle && (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium tracking-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
    </header>
  );
};
