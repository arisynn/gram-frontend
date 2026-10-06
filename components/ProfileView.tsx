'use client';

import React, { useState } from 'react';
import { ArrowLeft, MoreVertical, Edit2, Phone, AtSign, Quote, Camera, Check, Video, MessageSquare } from 'lucide-react';
import type { UserProfile } from '@/shared/types';
import { apiClient } from '@/lib/api-client';
import { CallModal } from './CallModal';

interface ProfileViewProps {
  user: UserProfile;
  onBack: () => void;
  isSelf?: boolean;
  onProfileUpdated?: (updated: UserProfile) => void;
  onSendMessage?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onBack,
  isSelf = false,
  onProfileUpdated,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'media' | 'links' | 'files'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user.firstName || '');
  const [editLastName, setEditLastName] = useState(user.lastName || '');
  const [editBio, setEditBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await apiClient.updateProfile({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        bio: editBio.trim(),
      });
      setIsEditing(false);
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = apiClient.getAvatarUrl(user.id);
  const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : '?';

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black font-mono select-none overflow-y-auto relative">
      {/* Header */}
      <header className="px-3 py-2 border-b-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-black dark:text-white" />
        </button>

        <span className="font-bold text-xs uppercase tracking-wider">
          {isEditing ? 'Edit Profil' : 'Profil Pengguna'}
        </span>

        <button
          onClick={() => isSelf && setIsEditing(!isEditing)}
          className="w-8 h-8 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          title="Opsi"
        >
          <MoreVertical className="w-4 h-4 text-black dark:text-white" />
        </button>
      </header>

      {/* Profile Header Block */}
      <div className="p-6 flex flex-col items-center border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950">
        <div className="relative">
          <div className="w-24 h-24 border-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-center text-3xl font-bold text-black dark:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              initial
            )}
          </div>

          {isSelf && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute -bottom-2 -right-2 w-7 h-7 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:opacity-90 cursor-pointer"
              title="Edit Profil"
            >
              {isEditing ? <Camera className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <h1 className="mt-4 font-bold text-base text-black dark:text-white text-center">
          {user.firstName} {user.lastName || ''}
        </h1>
        <span className="text-[11px] text-neutral-500 mt-0.5">
          {user.status || 'Terhubung via Telegram MTProto'}
        </span>

        {/* Action buttons (Call / Video Call / Message) */}
        {!isSelf && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => {
                setIsVideoCall(false);
                setShowCallModal(true);
              }}
              className="px-3 py-1.5 border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Panggil Suara</span>
            </button>

            <button
              onClick={() => {
                setIsVideoCall(true);
                setShowCallModal(true);
              }}
              className="px-3 py-1.5 border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>

            {onSendMessage && (
              <button
                onClick={onSendMessage}
                className="px-3 py-1.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Pesan</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editing Form */}
      {isEditing ? (
        <div className="p-4 space-y-4 max-w-md mx-auto w-full">
          <div>
            <label className="text-xs font-bold block mb-1">Nama Depan</label>
            <input
              type="text"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              className="w-full border border-black dark:border-white p-2 text-xs bg-white dark:bg-black"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Nama Belakang</label>
            <input
              type="text"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              className="w-full border border-black dark:border-white p-2 text-xs bg-white dark:bg-black"
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Bio</label>
            <textarea
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full border border-black dark:border-white p-2 text-xs bg-white dark:bg-black"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              disabled={saving}
              onClick={handleSaveProfile}
              className="flex-1 py-2 px-4 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>[ SIMPAN PERUBAHAN ]</span>
            </button>

            <button
              onClick={() => setIsEditing(false)}
              className="py-2 px-4 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white font-bold text-xs cursor-pointer"
            >
              [ BATAL ]
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-black dark:border-white text-center text-xs">
            {(['profile', 'media', 'links', 'files'] as const).map((t) => (
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

          {/* Profile Info */}
          {activeTab === 'profile' && (
            <div className="p-4 space-y-4 max-w-md mx-auto w-full">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Info Akun
              </div>

              {/* Phone number */}
              <div className="border border-black dark:border-white p-3 bg-white dark:bg-black flex items-start gap-3">
                <Phone className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">
                    {user.phone || 'Nomor tersembunyi'}
                  </div>
                  <div className="text-[10px] text-neutral-500">Nomor Telepon</div>
                </div>
              </div>

              {/* Username */}
              <div className="border border-black dark:border-white p-3 bg-white dark:bg-black flex items-start gap-3">
                <AtSign className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">
                    {user.username ? `@${user.username}` : 'Belum diatur'}
                  </div>
                  <div className="text-[10px] text-neutral-500">Username</div>
                </div>
              </div>

              {/* Bio */}
              <div className="border border-black dark:border-white p-3 bg-white dark:bg-black flex items-start gap-3">
                <Quote className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs whitespace-pre-wrap">
                    {user.bio || 'Tidak ada bio'}
                  </div>
                  <div className="text-[10px] text-neutral-500">Bio</div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'profile' && (
            <div className="p-8 text-center text-xs text-neutral-500">
              [ Belum ada berkas {activeTab} yang dibagikan ]
            </div>
          )}
        </>
      )}

      {/* Voice / Video Call Modal */}
      {showCallModal && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          targetId={user.id}
          targetName={`${user.firstName} ${user.lastName || ''}`.trim() || user.username || 'User'}
          targetUsername={user.username}
          isVideoCall={isVideoCall}
        />
      )}
    </div>
  );
};
