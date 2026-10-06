'use client';

import React, { useState, useRef } from 'react';
import { X, User, Check, Edit2, Camera, Upload, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { UserProfile } from '@/shared/types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentAvatarUrl = apiClient.getAvatarUrl(currentUser.id);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Pilih file gambar yang valid (JPG / PNG).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      const base64 = result.split(',')[1] || '';
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || saving) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const updated = await apiClient.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        username: username.trim() ? username.trim().replace(/^@/, '') : undefined,
        bio: bio.trim() || undefined,
        photoBase64: photoBase64 || undefined,
      });

      setStatusMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      onProfileUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono select-none animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-black border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden text-black dark:text-white transition-all">
        {/* Header */}
        <div className="p-3 border-b-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Edit2 className="w-4 h-4" />
            <span>Pengaturan Profil</span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Avatar Photo Picker Section */}
          <div className="flex flex-col items-center justify-center gap-2.5 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="relative group">
              <div className="w-20 h-20 border-2 border-black dark:border-white flex items-center justify-center font-bold text-2xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={currentUser.firstName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black shadow-sm cursor-pointer hover:opacity-90"
                title="Ganti Foto Profil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 border border-black dark:border-white text-[11px] font-bold flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>{photoPreview ? 'Ganti Foto' : 'Unggah Foto'}</span>
              </button>

              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2 py-1 border border-red-500 text-red-500 text-[11px] font-bold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Batal</span>
                </button>
              )}
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-2.5 border text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
              }`}
            >
              {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Nama Depan (Wajib)
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="Nama depan"
              className="w-full border border-black dark:border-white px-3 py-2 text-xs bg-white dark:bg-black text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Nama Belakang (Opsional)
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nama belakang"
              className="w-full border border-black dark:border-white px-3 py-2 text-xs bg-white dark:bg-black text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Username (@)
            </label>
            <div className="flex items-center border border-black dark:border-white bg-white dark:bg-black">
              <span className="px-2.5 text-neutral-500 font-bold">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                className="flex-1 py-2 pr-3 text-xs bg-transparent text-black dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Bio / Info Profil
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={120}
              placeholder="Tulis info singkat tentang Anda..."
              className="w-full border border-black dark:border-white p-2 text-xs bg-white dark:bg-black text-black dark:text-white focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold text-xs cursor-pointer"
            >
              [ BATAL ]
            </button>
            <button
              type="submit"
              disabled={!firstName.trim() || saving}
              className="flex-1 py-2.5 px-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? '[ MENYIMPAN... ]' : '[ SIMPAN PROFIL ]'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
