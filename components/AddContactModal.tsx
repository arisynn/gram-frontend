'use client';

import React, { useState } from 'react';
import { X, UserPlus, Check, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { TelegramContact } from '@/shared/types';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdded: (contact: TelegramContact) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onContactAdded,
}) => {
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !firstName.trim() || saving) return;

    setSaving(true);
    try {
      const contact = await apiClient.addContact(
        phone.trim(),
        firstName.trim(),
        lastName.trim() || undefined
      );
      onContactAdded(contact);
      onClose();
      alert(`Kontak ${firstName} berhasil ditambahkan!`);
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan kontak.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono select-none">
      <div className="w-full max-w-md bg-white dark:bg-black border-2 border-black dark:border-white shadow-2xl flex flex-col overflow-hidden text-black dark:text-white">
        {/* Header */}
        <div className="p-3 border-b-2 border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs">
            <UserPlus className="w-4 h-4" />
            <span>Tambah Kontak Baru</span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-black dark:border-white bg-white dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Nomor Telepon (Dengan Kode Negara)
            </label>
            <div className="flex items-center border border-black dark:border-white bg-white dark:bg-black">
              <Phone className="w-3.5 h-3.5 ml-2.5 text-neutral-500 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+628123456789"
                className="flex-1 py-2 px-2.5 text-xs bg-transparent text-black dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

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

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold text-xs cursor-pointer"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={!phone.trim() || !firstName.trim() || saving}
              className="flex-1 py-2 px-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'MENAMBAHKAN...' : 'TAMBAH KONTAK'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
