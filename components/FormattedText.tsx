'use client';

import React from 'react';

interface FormattedTextProps {
  text: string;
  onMentionClick?: (username: string) => void;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  onMentionClick,
  className = '',
}) => {
  if (!text) return null;

  // Regex matches URLs (http://, https://, www., t.me/) or @username
  const regex = /((?:https?:\/\/|www\.|t\.me\/)[^\s]+|@[a-zA-Z0-9_]{4,})/gi;
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        // URL Match
        if (/^(https?:\/\/|www\.|t\.me\/)/i.test(part)) {
          let href = part;
          if (part.startsWith('www.')) {
            href = `https://${part}`;
          } else if (part.startsWith('t.me/')) {
            href = `https://${part}`;
          }
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-bold underline text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 px-0.5 rounded-xs transition-colors inline break-all"
              title={`Buka tautan: ${href}`}
            >
              {part}
            </a>
          );
        }

        // @mention Match
        if (/^@[a-zA-Z0-9_]{4,}/i.test(part)) {
          const username = part.replace(/^@/, '');
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onMentionClick) {
                  onMentionClick(username);
                }
              }}
              className="font-bold underline text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 px-0.5 rounded-xs transition-colors inline cursor-pointer text-left"
              title={`Buka profil @${username}`}
            >
              {part}
            </button>
          );
        }

        // Plain text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
