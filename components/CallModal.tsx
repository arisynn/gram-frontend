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
  Minimize2,
  Maximize2,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { TelegramCallConnection } from '@/shared/types';

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

export type CallStage = 'initiating' | 'requesting' | 'ringing' | 'exchanging_keys' | 'connected' | 'ended' | 'failed';

// Telegram Official 4 Emojis dictionary
const EMOJI_SET = [
  '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏',
  '🍐', '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔',
  '🥕', '🌽', '🌶', '🥒', '🥬', '🥦', '🍄', '🥜', '🌰', '🍞',
  '🥐', '🥖', '🥨', '🥯', '🥞', '🧀', '🍗', '🥩', '🥓', '🍔',
];

const getDeterministicEmojis = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return [
    EMOJI_SET[hash % EMOJI_SET.length],
    EMOJI_SET[(hash >> 4) % EMOJI_SET.length],
    EMOJI_SET[(hash >> 8) % EMOJI_SET.length],
    EMOJI_SET[(hash >> 12) % EMOJI_SET.length],
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
  const [stage, setStage] = useState<CallStage>(isIncoming ? 'ringing' : 'requesting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true); // Default loudspeaker on
  const [isVideoActive, setIsVideoActive] = useState(isVideoCall);
  const [isMinimized, setIsMinimized] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [emojis, setEmojis] = useState<string>(getDeterministicEmojis(targetId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const durationRef = useRef<number>(0);
  const callIdRef = useRef<string>(targetId);
  const accessHashRef = useRef<string>('0');
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  // Stop Ringtone immediately when connected, ended, or failed
  const stopRingtoneSound = () => {
    if (stopRingtoneRef.current) {
      console.log('[CALL UI] Stopping ringtone sound immediately');
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
  };

  useEffect(() => {
    if (stage === 'connected' || stage === 'ended' || stage === 'failed') {
      stopRingtoneSound();
    }
  }, [stage]);

  // Start call lifecycle on mount / when opened
  useEffect(() => {
    if (!isOpen) return;

    durationRef.current = 0;
    setDuration(0);
    setErrorMessage(null);
    setIsMinimized(false);

    if (!isIncoming) {
      console.log('[CALL UI] Initiating real outgoing call to:', targetId);
      setStage('requesting');

      // Request call through backend MTProto
      apiClient.requestCall(targetId, isVideoCall)
        .then((res) => {
          console.log('[CALL UI] requestCall success:', res);
          if (res?.callId) {
            callIdRef.current = String(res.callId);
          }
          if (res?.accessHash) {
            accessHashRef.current = String(res.accessHash);
          }
          if (res?.emojis) {
            setEmojis(res.emojis);
          }
          // Server accepted request -> Now waiting/ringing
          setStage('ringing');
        })
        .catch((err: any) => {
          console.error('[CALL UI] requestCall failed:', err);
          stopRingtoneSound();
          setErrorMessage(err.message || 'Gagal memulai panggilan.');
          setStage('failed');
          setTimeout(() => {
            handleEndCall();
          }, 3000);
        });
    }

    // Audio synthesizer for ringing tone (active during requesting/ringing only)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        let isPlaying = true;

        const playBeep = () => {
          if (!isPlaying || ctx.state === 'closed') return;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          try {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(440, ctx.currentTime);
            osc2.frequency.setValueAtTime(480, ctx.currentTime);

            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 1.2);
            osc2.stop(ctx.currentTime + 1.2);
          } catch {}
        };

        const interval = setInterval(playBeep, 2800);
        playBeep();

        stopRingtoneRef.current = () => {
          isPlaying = false;
          clearInterval(interval);
          try { ctx.close(); } catch {}
        };
      }
    } catch {}

    // Listen for WebSocket phone_call_update events from Telegram
    const handleWsEvent = (e: CustomEvent) => {
      const { eventType, data } = e.detail || {};
      if (eventType === 'phone_call_update' && data) {
        console.log('[CALL UI] WebSocket call update received:', data);
        const status = data.status;

        if (status === 'PhoneCallAccepted') {
          // Callee answered! Now key exchange
          stopRingtoneSound();
          setStage('exchanging_keys');
        } else if (status === 'PhoneCallConnected' || status === 'phoneCall') {
          // Handshake complete, both sides connected
          stopRingtoneSound();
          if (data.emojis) setEmojis(data.emojis);
          setStage('connected');
          if (data.connections && data.connections.length > 0) {
            setupWebRtc(data.connections);
          }
        } else if (status === 'PhoneCallDiscarded' || status === 'phoneCallDiscarded') {
          // Call ended/rejected
          stopRingtoneSound();
          const reason = data.reason || '';
          if (reason.includes('Missed') || reason.includes('Busy')) {
            setErrorMessage('Panggilan tidak terjawab / sibuk.');
          } else if (reason.includes('Hangup')) {
            setErrorMessage('Panggilan diakhiri oleh lawan bicara.');
          }
          setStage('ended');
          setTimeout(() => {
            handleEndCall();
          }, 1200);
        }
      }
    };

    window.addEventListener('telegram_ws_event' as any, handleWsEvent as any);

    return () => {
      stopRingtoneSound();
      window.removeEventListener('telegram_ws_event' as any, handleWsEvent as any);
    };
  }, [isOpen, targetId, isVideoCall, isIncoming]);

  // Setup WebRTC with Telegram ICE servers & bind remote audio track
  const setupWebRtc = (connections: TelegramCallConnection[]) => {
    try {
      console.log('[CALL UI] Initializing WebRTC with connections:', connections);
      const iceServers: RTCIceServer[] = [];
      for (const conn of connections) {
        if (conn.ip && conn.port) {
          if (conn.isTurn && conn.username && conn.password) {
            iceServers.push({
              urls: `turn:${conn.ip}:${conn.port}`,
              username: conn.username,
              credential: conn.password,
            });
          } else {
            iceServers.push({
              urls: `stun:${conn.ip}:${conn.port}`,
            });
          }
        }
      }

      if (iceServers.length === 0) {
        iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
      }

      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      // Add local audio/video tracks to peer connection
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStreamRef.current!);
        });
      }

      // CRITICAL: Bind incoming remote audio/video tracks so user hears remote voice
      pc.ontrack = (event) => {
        console.log('[CALL UI] >>> Remote media track received:', event.track.kind);
        const remoteStream = event.streams[0];
        if (event.track.kind === 'audio' && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch((err) => {
            console.warn('[CALL UI] remote audio play error:', err);
          });
          setupSpeakerGain(remoteStream);
        }
        if (event.track.kind === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
      };
    } catch (e) {
      console.warn('[CALL UI] WebRTC setup warning:', e);
    }
  };

  // Loudspeaker Web Audio Amplification setup
  const setupSpeakerGain = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = isSpeaker ? 2.5 : 1.0;
      speakerGainNodeRef.current = gainNode;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (err) {
      console.warn('[CALL UI] Audio gain node error:', err);
    }
  };

  // Toggle Loudspeaker mode
  const toggleLoudspeaker = () => {
    setIsSpeaker((prev) => {
      const next = !prev;
      if (speakerGainNodeRef.current) {
        speakerGainNodeRef.current.gain.value = next ? 2.5 : 1.0;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = next ? 1.0 : 0.6;
        if (typeof (remoteAudioRef.current as any).setSinkId === 'function') {
          (remoteAudioRef.current as any).setSinkId(next ? 'default' : '').catch(() => {});
        }
      }
      return next;
    });
  };

  // Connected Call Duration timer
  useEffect(() => {
    if (stage !== 'connected') return;

    const timer = setInterval(() => {
      setDuration((d) => {
        const next = d + 1;
        durationRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  // Local Media Stream (Camera & Mic)
  useEffect(() => {
    if (!isOpen) {
      cleanupMedia();
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

        // Setup live audio waveform analyzer
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = audioContextRef.current || new AudioCtx();
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
      cleanupMedia();
    };
  }, [isOpen, isVideoActive]);

  const cleanupMedia = () => {
    stopRingtoneSound();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch {}
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch {}
      peerConnectionRef.current = null;
    }
  };

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
    stopRingtoneSound();
    const finalDuration = durationRef.current;
    setStage('ended');

    // Notify backend MTProto discard
    apiClient.discardCall(callIdRef.current || targetId, finalDuration, isVideoCall).catch(() => {});

    cleanupMedia();

    setTimeout(() => {
      if (onCallEnded) onCallEnded(finalDuration);
      onClose();
    }, 300);
  };

  const handleAcceptCall = () => {
    stopRingtoneSound();
    setStage('exchanging_keys');
    apiClient.acceptCall(callIdRef.current, accessHashRef.current, isVideoCall)
      .then(() => {
        setStage('connected');
      })
      .catch((err: any) => {
        setErrorMessage(err.message || 'Gagal menerima panggilan.');
        setStage('failed');
      });
  };

  const avatar = targetAvatarUrl || apiClient.getAvatarUrl(targetId);

  // =========================================================================
  // 1. MINIMIZED FLOATING CALL CAPSULE DOCK (Placed above chat composer)
  // =========================================================================
  if (isMinimized) {
    return (
      <aside 
        aria-label="Panggilan Aktif"
        className="fixed bottom-20 right-4 sm:right-6 z-50 bg-neutral-900 border-2 border-white text-white p-2.5 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex items-center gap-3 font-mono text-xs select-none backdrop-blur-md max-w-sm rounded-none animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        {/* Hidden Remote Audio Element for playing recipient's voice */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Avatar with live pulsing indicator */}
        <div 
          onClick={() => setIsMinimized(false)}
          className="relative w-10 h-10 border border-white flex items-center justify-center font-bold bg-black overflow-hidden shrink-0 cursor-pointer"
          title="Klik untuk membuka layar panggilan"
        >
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
          {stage === 'connected' && (
            <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-black animate-ping" />
          )}
        </div>

        {/* Info & Status */}
        <div 
          onClick={() => setIsMinimized(false)}
          className="flex flex-col min-w-0 flex-1 cursor-pointer pr-1"
          title="Klik untuk membuka layar panggilan"
        >
          <div className="flex items-center gap-1.5 font-bold truncate">
            <span className="truncate">{targetName}</span>
            {isVideoCall && (
              <span className="text-[9px] bg-white text-black px-1 font-bold">VIDEO</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[11px] mt-0.5">
            {stage === 'connected' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                <span>{formatDuration(duration)}</span>
              </span>
            ) : stage === 'ringing' ? (
              <span className="text-yellow-400 animate-pulse font-bold">Berdering...</span>
            ) : stage === 'exchanging_keys' ? (
              <span className="text-blue-400 font-bold">Pertukaran Kunci...</span>
            ) : stage === 'failed' ? (
              <span className="text-red-400 font-bold">Gagal</span>
            ) : (
              <span className="text-neutral-400">Menghubungkan...</span>
            )}

            {/* Dynamic live equalizer bars */}
            {stage === 'connected' && (
              <div className="flex items-center gap-0.5 h-2.5 pl-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-0.5 bg-emerald-400 transition-all duration-75 ${
                      audioLevel > i * 18 ? 'h-3 opacity-100' : 'h-1 opacity-30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls in Minimized Dock */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-neutral-700">
          {/* Mute Mic Button */}
          <button
            onClick={() => setIsMuted((p) => !p)}
            className={`w-8 h-8 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isMuted ? 'bg-red-600 text-white' : 'bg-black hover:bg-neutral-800 text-white'
            }`}
            title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Loudspeaker Button */}
          <button
            onClick={toggleLoudspeaker}
            className={`w-8 h-8 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isSpeaker ? 'bg-white text-black' : 'bg-black text-white hover:bg-neutral-800'
            }`}
            title={isSpeaker ? 'Loudspeaker: Aktif (Keras)' : 'Loudspeaker: Nonaktif (Normal)'}
          >
            {isSpeaker ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Maximize Back to Full Modal */}
          <button
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 border border-white bg-black hover:bg-neutral-800 text-white flex items-center justify-center cursor-pointer"
            title="Perbesar Layar Panggilan Penuh"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* End Call / Hangup */}
          <button
            onClick={handleEndCall}
            className="w-8 h-8 border-2 border-red-500 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
            title="Akhiri Panggilan"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // 2. FULL CALL SCREEN MODAL
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-mono select-none">
      {/* Remote Audio output player */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="w-full max-w-sm bg-neutral-900 border-2 border-white text-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center justify-between p-5 min-h-[510px] relative overflow-hidden">
        
        {/* Top Header: Telegram E2EE Encryption Key Badge + Minimize Button */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold">MTProto E2EE</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 4 Emojis Key Comparison (Telegram Official Verification) */}
            <div 
              className="text-xs tracking-widest px-2 py-0.5 bg-neutral-800 border border-neutral-700 font-sans" 
              title="Emoji Enkripsi End-to-End Telegram"
            >
              {emojis}
            </div>

            {/* MINIMIZE BUTTON */}
            <button
              onClick={() => setIsMinimized(true)}
              className="px-2 py-0.5 border border-white bg-black hover:bg-neutral-800 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Minimalkan ke widget melayang agar bisa sambil membaca dan mengetik pesan"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Minimalkan</span>
            </button>
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
            {/* Remote video if available */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-10"
            />
            <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 text-[9px] text-white border border-neutral-700 z-20">
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
              {(stage === 'requesting' || stage === 'ringing' || stage === 'exchanging_keys') && (
                <div className="absolute -inset-2 border-2 border-white/60 animate-ping pointer-events-none" />
              )}
            </div>
          </div>
        )}

        {/* Name & Call Status */}
        <div className="text-center space-y-1.5 my-2 w-full px-2">
          <h3 className="font-bold text-base truncate max-w-[260px] mx-auto">{targetName}</h3>
          {targetUsername && (
            <div className="text-[11px] text-neutral-400">@{targetUsername}</div>
          )}

          {/* Stepper & Detailed Stage Indicator */}
          <div className="text-xs font-bold pt-1">
            {stage === 'requesting' && (
              <span className="text-neutral-400 flex items-center justify-center gap-1">
                <span>[1/4] Mengirim Permintaan Panggilan MTProto...</span>
                <span className="terminal-cursor">_</span>
              </span>
            )}
            {stage === 'ringing' && (
              <span className="text-yellow-400 animate-pulse flex items-center justify-center gap-1">
                <span>[2/4] Berdering... (Menunggu Jawaban Telegram)</span>
              </span>
            )}
            {stage === 'exchanging_keys' && (
              <span className="text-blue-400 flex items-center justify-center gap-1 animate-pulse">
                <span>[3/4] Pertukaran Kunci Enkripsi Diffie-Hellman Selesai</span>
              </span>
            )}
            {stage === 'connected' && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-emerald-400 text-sm font-bold tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block animate-pulse" />
                  <span>[4/4] Tersambung • {formatDuration(duration)}</span>
                </span>
                {/* Live Mic Waveform Meter */}
                <div className="flex items-center gap-0.5 h-2.5 mt-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-emerald-400 transition-all duration-75 ${
                        audioLevel > i * 10 ? 'opacity-100 h-3.5' : 'opacity-20 h-1'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            {stage === 'failed' && (
              <span className="text-red-400">[ Panggilan Gagal ]</span>
            )}
            {stage === 'ended' && (
              <span className="text-neutral-400">[ Panggilan Berakhir ]</span>
            )}
          </div>

          {errorMessage && (
            <div className="text-[10px] text-yellow-300 bg-yellow-950/60 border border-yellow-700 px-2.5 py-1.5 flex items-center justify-center gap-1.5 my-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Call Action Controls */}
        <div className="w-full pt-3 border-t border-neutral-800 flex items-center justify-center gap-3">
          {/* Answer Call button (when incoming) */}
          {stage !== 'connected' && stage !== 'ended' && stage !== 'failed' && isIncoming && (
            <button
              onClick={handleAcceptCall}
              className="w-12 h-12 border-2 border-emerald-500 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              title="Terima Panggilan"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}

          {/* Mute Mic Button */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className={`w-11 h-11 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isMuted ? 'bg-red-600 text-white' : 'bg-black hover:bg-neutral-800 text-white'
            }`}
            title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Loudspeaker Toggle Button */}
          <button
            onClick={toggleLoudspeaker}
            className={`w-11 h-11 border border-white flex items-center justify-center cursor-pointer transition-colors ${
              isSpeaker ? 'bg-white text-black' : 'bg-black text-white hover:bg-neutral-800'
            }`}
            title={isSpeaker ? 'Loudspeaker: Aktif (Suara Keras)' : 'Loudspeaker: Nonaktif (Normal)'}
          >
            {isSpeaker ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
