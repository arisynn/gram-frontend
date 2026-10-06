'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronDown, RefreshCw, KeyRound, ArrowLeft, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { UserProfile } from '@/shared/types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  onCancel?: () => void;
  isAddMode?: boolean;
}

const COUNTRIES = [
  { name: 'Indonesia', code: '+62', flag: 'ID' },
  { name: 'United States', code: '+1', flag: 'US' },
  { name: 'United Kingdom', code: '+44', flag: 'GB' },
  { name: 'Singapore', code: '+65', flag: 'SG' },
  { name: 'Malaysia', code: '+60', flag: 'MY' },
  { name: 'India', code: '+91', flag: 'IN' },
  { name: 'Germany', code: '+49', flag: 'DE' },
  { name: 'Russia', code: '+7', flag: 'RU' },
  { name: 'Japan', code: '+81', flag: 'JP' },
  { name: 'Australia', code: '+61', flag: 'AU' },
  { name: 'Canada', code: '+1', flag: 'CA' },
  { name: 'Brazil', code: '+55', flag: 'BR' },
];

export const LoginView: React.FC<LoginViewProps> = ({ 
  onLoginSuccess,
  onCancel,
  isAddMode = false,
}) => {
  const [step, setStep] = useState<'welcome' | 'phone' | 'code' | '2fa'>(isAddMode ? 'phone' : 'welcome');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tempSessionId, setTempSessionId] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);

  const codeInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (step === 'code' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const getFullPhoneNumber = () => {
    const cleaned = phoneNumber.replace(/^[0]+/, '').replace(/\s+/g, '');
    return `${selectedCountry.code}${cleaned}`;
  };

  const handleSendCode = async () => {
    setError(null);
    if (!phoneNumber.trim()) {
      setError('Harap masukkan nomor telepon.');
      return;
    }

    const fullPhone = getFullPhoneNumber();
    setLoading(true);

    try {
      const res = await apiClient.sendCode(fullPhone);
      setTempSessionId(res.tempSessionId);
      setStep('code');
      setResendTimer(60);
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => codeInputsRef.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim kode ke Telegram.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeString?: string) => {
    setError(null);
    const code = codeString || verificationCode.join('');
    if (code.length < 5) {
      setError('Harap masukkan kode verifikasi lengkap.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.verifyCode(tempSessionId, code);
      if (res.requires2FA) {
        setStep('2fa');
      } else if (res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Kode verifikasi salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setError(null);
    if (!twoFaPassword) {
      setError('Harap masukkan kata sandi 2FA Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.verify2FA(tempSessionId, twoFaPassword);
      if (res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Kata sandi 2FA salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);

    if (value && index < 5) {
      codeInputsRef.current[index + 1]?.focus();
    }

    const joined = newCode.join('');
    if (joined.length === 6 && newCode.every((c) => c !== '')) {
      handleVerifyCode(joined);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputsRef.current[index - 1]?.focus();
    }
  };

  // Welcome View
  if (step === 'welcome') {
    return (
      <div className="w-full h-[100dvh] bg-white dark:bg-black text-black dark:text-white flex flex-col justify-between p-6 select-none font-mono overflow-y-auto">
        <div className="h-4" />

        <div className="flex flex-col items-center justify-center gap-6 my-auto">
          <div className="w-24 h-24 border-2 border-black dark:border-white flex items-center justify-center bg-white dark:bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <Send className="w-12 h-12 text-black dark:text-white transform -rotate-12 translate-x-0.5" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-widest leading-none flex items-center justify-center">
              GRAM<span className="terminal-cursor">_</span>
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 tracking-tight">
              open source messenger
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full mb-4">
          <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="font-bold text-sm">Masuk ke akun Telegram</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
              Gunakan nomor telepon Anda untuk melanjutkan ke jaringan resmi Telegram.
            </p>

            <button
              onClick={() => setStep('phone')}
              className="mt-4 w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-bold text-sm tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer border border-black dark:border-white"
            >
              [ MULAI ]
            </button>
          </div>

          <div className="text-center pt-2">
            <div className="text-[11px] font-bold">GRAM_</div>
            <div className="text-[9px] text-neutral-500">open source messenger</div>
          </div>
        </div>
      </div>
    );
  }

  // Input screens (Phone, Code, 2FA)
  return (
    <div className="w-full h-[100dvh] bg-white dark:bg-black text-black dark:text-white flex flex-col justify-between font-mono select-none overflow-y-auto">
      <div>
        <header className="border-b-2 border-black dark:border-white px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'phone') {
                if (isAddMode && onCancel) {
                  onCancel();
                } else {
                  setStep('welcome');
                }
              }
              else if (step === 'code') setStep('phone');
              else if (step === '2fa') setStep('code');
            }}
            className="w-8 h-8 flex items-center justify-center border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="font-bold text-sm tracking-wider">
              {isAddMode ? 'TAMBAH AKUN' : 'GRAM'}<span className="terminal-cursor">_</span>
            </div>
            <div className="text-[9px] text-neutral-500">
              {isAddMode ? 'Hubungkan akun Telegram baru' : 'open source messenger'}
            </div>
          </div>

          {isAddMode && onCancel ? (
            <button
              onClick={onCancel}
              className="text-[10px] font-bold border border-black dark:border-white px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            >
              [ BATAL ]
            </button>
          ) : (
            <div className="w-8 h-8" />
          )}
        </header>

        <div className="p-4 max-w-md mx-auto w-full mt-2">
          {error && (
            <div className="border border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 p-2.5 text-xs mb-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP: PHONE */}
          {step === 'phone' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
              <h2 className="font-bold text-sm">Masukkan nomor telepon</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                Telegram akan mengirim kode verifikasi ke nomor Anda.
              </p>

              {/* Country selector */}
              <div className="mt-4 relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="w-full border border-black dark:border-white px-3 py-2 flex items-center justify-between text-xs bg-white dark:bg-black cursor-pointer"
                >
                  <span className="font-bold truncate">
                    {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.code})
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showCountryPicker && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-black border-2 border-black dark:border-white max-h-48 overflow-y-auto text-xs shadow-lg">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code + c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowCountryPicker(false);
                        }}
                        className="w-full text-left px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 flex items-center justify-between cursor-pointer"
                      >
                        <span>{c.flag} {c.name}</span>
                        <span className="text-neutral-500">{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone number field with native mobile keyboard */}
              <div className="mt-3 flex gap-2">
                <div className="border border-black dark:border-white px-3 py-2.5 text-xs font-bold flex items-center bg-neutral-100 dark:bg-neutral-900 shrink-0">
                  {selectedCountry.code}
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ''))}
                  placeholder="812 3456 7890"
                  className="flex-1 border border-black dark:border-white px-3 py-2.5 text-sm font-bold bg-white dark:bg-black focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer border border-black dark:border-white disabled:opacity-50"
              >
                {loading ? '[ MEMPROSES... ]' : '[ LANJUT ]'}
              </button>
            </form>
          )}

          {/* STEP: CODE */}
          {step === 'code' && (
            <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
              <h2 className="font-bold text-sm">Masukkan kode verifikasi</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                Kode verifikasi telah dikirim ke {getFullPhoneNumber()}.
              </p>

              {/* 6 Square boxes with native input */}
              <div className="mt-4 flex justify-between gap-1.5 sm:gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { codeInputsRef.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="w-10 sm:w-12 h-12 text-center text-lg font-bold border-2 border-black dark:border-white bg-white dark:bg-black focus:bg-neutral-100 dark:focus:bg-neutral-900 focus:outline-hidden"
                  />
                ))}
              </div>

              <button
                disabled={loading}
                onClick={() => handleVerifyCode()}
                className="mt-4 w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer border border-black dark:border-white disabled:opacity-50"
              >
                {loading ? '[ MEMVERIFIKASI... ]' : '[ LANJUT ]'}
              </button>

              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-500">Tidak menerima kode?</span>
                <button
                  disabled={resendTimer > 0 || loading}
                  onClick={handleSendCode}
                  className="mt-2 w-full py-2 border border-black dark:border-white text-xs flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    Kirim ulang kode {resendTimer > 0 ? `00:${resendTimer < 10 ? `0${resendTimer}` : resendTimer}` : ''}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP: 2FA */}
          {step === '2fa' && (
            <form onSubmit={(e) => { e.preventDefault(); handleVerify2FA(); }} className="border-2 border-black dark:border-white p-4 bg-white dark:bg-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
              <div className="flex items-center gap-2 text-black dark:text-white">
                <KeyRound className="w-5 h-5" />
                <h2 className="font-bold text-sm">Masukkan kata sandi 2FA</h2>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                Akun ini dilindungi oleh verifikasi dua langkah (Cloud Password).
              </p>

              <div className="mt-4">
                <input
                  type="password"
                  value={twoFaPassword}
                  onChange={(e) => setTwoFaPassword(e.target.value)}
                  placeholder="Kata sandi cloud Telegram"
                  className="w-full border-2 border-black dark:border-white px-3 py-2.5 text-xs font-bold bg-white dark:bg-black focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-bold text-xs tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer border border-black dark:border-white disabled:opacity-50"
              >
                {loading ? '[ MEMVERIFIKASI... ]' : '[ MASUK ]'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="p-4 text-center text-[10px] text-neutral-500">
        GRAM — open source messenger
      </div>
    </div>
  );
};
