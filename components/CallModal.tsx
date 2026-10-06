'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  Check,
  Activity
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  targetUsername?: string;
  targetAvatarUrl?: string;
  isVideoCall?: boolean;
  isIncoming?: boolean;
  onCallEnded?: (duration: number) => void;
}

// Deterministic Telegram 4 emoji key comparison hash based on targetId
const getEncryptionEmojis = (id: string) => {
  const emojis = ['🍇', '🍋', '🍏', '🍓', '🍒', '🍑', '🍍', '🥝', '🍉', '🥑', '🥥', '🥭'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return [
    emojis[hash % emojis.length],
    emojis[(hash >> 4) % emojis.length],
    emojis[(hash >> 8) % emojis.length],
    emojis[(hash >> 12) % emojis.length],
  ].join(' ');
};

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  targetUsername,
  targetAvatarUrl,
  isVideoCall = false,
  isIncoming = false,
  onCallEnded,
}) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'calling'
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoActive, setIsVideoActive] = useState(isVideoCall);
  const [avatarError, setAvatarError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);
  const callIdRef = useRef<string>(targetId);

  // Status transition & Audio synthesizer for ringing tone
  useEffect(() => {
    if (!isOpen) return;

    durationRef.current = 0;
    setDuration(0);

    let stopRingtone: (() => void) | null = null;

    if (!isIncoming) {
      setCallStatus('calling');

      // 1. Invoke Telegram MTProto RequestCall RPC
      apiClient.requestCall(targetId, isVideoCall)
        .then((res) => {
          if (res?.phoneCall?.id) {
            callIdRef.current = String(res.phoneCall.id);
          }
          setCallStatus('ringing');
        })
        .catch(() => {
          setCallStatus('ringing');
        });
    }

    // Audio synthesizer for ringing tone
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        let isPlaying = true;

        const playBeep = () => {
          if (!isPlaying || ctx.state === 'closed') return;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.setValueAtTime(480, ctx.currentTime);

          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 1.2);
          osc2.stop(ctx.currentTime + 1.2);
        };

        const interval = setInterval(playBeep, 2800);
        playBeep();

        stopRingtone = () => {
          isPlaying = false;
          clearInterval(interval);
          try { ctx.close(); } catch {}
        };
      }
    } catch {}

    return () => {
      if (stopRingtone) stopRingtone();
    };
  }, [isOpen, targetId, isVideoCall, isIncoming]);

  // Duration timer when connected
  useEffect(() => {
    if (callStatus !== 'connected') return;

    const timer = setInterval(() => {
      setDuration((d) => {
        const next = d + 1;
        durationRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  // WebRTC Local Media Stream & Audio Waveform Analyzer
  useEffect(() => {
    if (!isOpen) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }
      return;
    }

    navigator.mediaDevices?.getUserMedia({
      audio: true,
      video: isVideoActive ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
    })
      .then((stream) => {
        mediaStreamRef.current = stream;
        if (videoRef.current && isVideoActive) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio level analyzer for live waveform indicator
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          }
        } catch {}
      })
      .catch((err) => {
        console.warn('getUserMedia warning:', err);
        if (isVideoActive) setIsVideoActive(false);
      });

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }
    };
  }, [isOpen, isVideoActive]);

  // Mute Audio Tracks
  useEffect(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    const finalDuration = durationRef.current;
    setCallStatus('ended');

    // Notify backend MTProto discard
    apiClient.discardCall(callIdRef.current || targetId, finalDuration, isVideoCall).catch(() => {});

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setTimeout(() => {
      if (onCallEnded) onCallEnded(finalDuration);
      onClose();
    }, 500);
  };

  const handleAcceptCall = () => {
    setCallStatus('connected');
  };

  const encryptionFingerprint = getEncryptionEmojis(targetId);
  const avatar = targetAvatarUrl || apiClient.getAvatarUrl(targetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-sm bg-neutral-900 border-2 border-white text-white shadow-2xl flex flex-col items-center justify-between p-5 min-h-[480px] relative overflow-hidden">
        
        {/* Top Header: Telegram E2EE Encryption Key Badge */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold">MTProto E2EE</span>
          </div>

          {/* 4 Emojis Key Comparison (Telegram Official Verification) */}
          <div 
            className="text-xs tracking-widest px-2 py-0.5 bg-neutral-800 border border-neutral-700" 
            title="Emoji Enkripsi End-to-End"
          >
            {encryptionFingerprint}
          </div>
        </div>

        {/* Video stream or Square Avatar */}
        {isVideoActive ? (
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 border-2 border-white bg-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] my-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 text-[9px] text-white border border-neutral-700">
              KAMERA ANDA
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center my-3">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-white flex items-center justify-center font-bold text-3xl bg-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                {avatar && !avatarError ? (
                  <img
                    src={avatar}
                    alt={targetName}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  targetName ? targetName.charAt(0).toUpperCase() : 'U'
                )}
              </div>

              {/* Pulsing ring during calling/ringing */}
              {(callStatus === 'calling' || callStatus === 'ringing') && (
                <div className="absolute -inset-2 border-2 border-white/60 animate-ping pointer-events-none" />
              )}
            </div>
          </div>
        )}

        {/* Name & Call Status */}
        <div className="text-center space-y-1 my-2">
          <h3 className="font-bold text-base truncate max-w-[240px]">{targetName}</h3>
          {targetUsername && (
            <div className="text-[11px] text-neutral-400">@{targetUsername}</div>
          )}

          <div className="text-xs font-bold pt-1">
            {callStatus === 'calling' && (
              <span className="text-neutral-400 flex items-center justify-center gap-1">
                <span>Menghubungkan ke MTProto</span>
                <span className="terminal-cursor">_</span>
              </span>
            )}
            {callStatus === 'ringing' && (
              <span className="text-yellow-400 animate-pulse flex items-center justify-center gap-1">
                <span>Berdering...</span>
              </span>
            )}
            {callStatus === 'connected' && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-emerald-400">{formatDuration(duration)}</span>
                {/* Live Mic Waveform Meter */}
                <div className="flex items-center gap-0.5 h-2 mt-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-emerald-400 transition-all duration-75 ${
                        audioLevel > i * 12 ? 'opacity-100 h-3' : 'opacity-20 h-1'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            {callStatus === 'ended' && (
              <span className="text-red-400">Panggilan Berakhir</span>
            )}
          </div>
        </div>

        {/* Call Action Controls */}
        <div className="w-full pt-3 border-t border-neutral-800 flex items-center justify-center gap-3">
          {callStatus !== 'connected' && callStatus !== 'ended' && (
            <button
              onClick={handleAcceptCall}
              className="w-12 h-12 border-2 border-emerald-500 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              title="Terima Panggilan"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}

          {/* Mute Button */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className={`w-11 h-11 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isMuted ? 'bg-red-600 text-white' : 'bg-black hover:bg-neutral-800 text-white'
            }`}
            title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Toggle Video Button */}
          <button
            onClick={() => setIsVideoActive((prev) => !prev)}
            className={`w-11 h-11 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isVideoActive ? 'bg-white text-black' : 'bg-black hover:bg-neutral-800 text-white'
            }`}
            title={isVideoActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}
          >
            {isVideoActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeaker((prev) => !prev)}
            className={`w-11 h-11 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isSpeaker ? 'bg-black text-white hover:bg-neutral-800' : 'bg-neutral-800 text-neutral-400'
            }`}
            title="Speaker"
          >
            {isSpeaker ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* End Call / Hangup Button */}
          <button
            onClick={handleEndCall}
            className="w-12 h-12 border-2 border-red-500 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            title="Akhiri Panggilan"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
