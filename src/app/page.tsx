'use client';

import { useQuery, useLazyQuery, useMutation, gql } from '@apollo/client';
import client from '@/lib/apollo-client';
import ChiffrePage from '@/components/ChiffrePage';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Lock, User, CheckCircle2, Loader2, ShieldAlert, ShieldCheck, Power, AlertCircle, Camera, Scan, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';

// Load face-api models once
let modelsLoaded = false;
const loadModels = async () => {
  if (modelsLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]);
    modelsLoaded = true;
  } catch (err) {
    console.error('Failed to load face-api models:', err);
  }
};

function FaceIDLoginModal({ user, onClose, onSuccess }: any) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'scanning' | 'success' | 'error' | 'locked'>('idle');
  const [scanStep, setScanStep] = React.useState<'align' | 'depth' | 'auth'>('align');
  const [failCount, setFailCount] = React.useState(0);
  const [statusText, setStatusText] = React.useState('');

  React.useEffect(() => {
    async function init() {
      setStatus('loading');
      setStatusText('Chargement du modèle IA...');

      // Load face-api models
      await loadModels();

      // Start camera
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await new Promise(resolve => {
            if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
          });
        }

        setStatus('idle');
        setStatusText('');

        // Start scan sequence
        setScanStep('align');
        setTimeout(() => {
          setScanStep('depth');
          setTimeout(() => {
            setScanStep('auth');
            performScan();
          }, 800);
        }, 800);
      } catch (e) {
        alert('Caméra non disponible');
        onClose();
      }
    }
    init();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const performScan = async () => {
    setStatus('scanning');
    setStatusText('Détection du visage...');

    try {
      if (!videoRef.current || !user.face_data) {
        throw new Error('Video or face data not available');
      }

      // Detect face in current video frame
      const currentDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!currentDetection) {
        setStatusText('Aucun visage détecté');
        handleScanFailure();
        return;
      }

      setStatusText('Comparaison biométrique...');

      // Get saved face descriptor
      const savedDescriptor = await getSavedFaceDescriptor(user.face_data);

      if (!savedDescriptor) {
        setStatusText('Erreur: données sauvegardées invalides');
        handleScanFailure();
        return;
      }

      // Compare face descriptors using Euclidean distance
      const distance = faceapi.euclideanDistance(currentDetection.descriptor, savedDescriptor);

      // Distance < 0.6 means same person (lower = more similar)
      // iPhone uses ~0.6, we use 0.5 for better security
      const threshold = 0.5;

      if (distance < threshold) {
        setStatus('success');
        setStatusText('Identité confirmée');
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setStatusText(`Visage non reconnu`);
        handleScanFailure();
      }
    } catch (err) {
      console.error('Face scan error:', err);
      setStatusText('Erreur de scan');
      handleScanFailure();
    }
  };

  const handleScanFailure = () => {
    const newCount = failCount + 1;
    setFailCount(newCount);

    if (newCount >= 3) {
      setStatus('locked');
      localStorage.setItem(`lock_${user.username}`, Date.now().toString());
    } else {
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setScanStep('align');
        setTimeout(() => {
          setScanStep('depth');
          setTimeout(() => {
            setScanStep('auth');
            performScan();
          }, 800);
        }, 800);
      }, 1500);
    }
  };

  // Extract face descriptor from saved base64 image
  const getSavedFaceDescriptor = async (base64Data: string): Promise<Float32Array | null> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            resolve(detection.descriptor);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Error extracting saved face:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = base64Data;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-2xl bg-[#1a110a]/90">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-[rgba(196,154,108,0.2)]"
      >
        <div className="p-12 flex flex-col items-center">
          <div className="relative w-56 h-56 mb-10">
            {/* Pulsing Outer Ring */}
            <div className="absolute -inset-4 border border-[#c69f6e]/20 rounded-full animate-ping opacity-20" />

            {/* Scanner UI */}
            <div className="absolute inset-0 rounded-full border-[6px] border-[#fcfaf8] overflow-hidden bg-black shadow-2xl relative">
              <video ref={videoRef} autoPlay playsInline muted
                className={`w-full h-full object-cover transition-all duration-1000 
                ${status === 'success' ? 'sepia-0 grayscale-0' : 'grayscale brightness-110 contrast-125'} 
                ${scanStep === 'depth' ? 'scale-110' : 'scale-100'}`}
              />
              {(status === 'scanning' || status === 'loading') && (
                <motion.div
                  initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 w-full h-[2px] bg-[#c69f6e] shadow-[0_0_15px_#c69f6e] z-10"
                />
              )}
              {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                  <Loader2 className="w-12 h-12 text-[#c69f6e] animate-spin" />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <AnimatePresence>
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  className="absolute -right-2 -bottom-2 bg-green-500 text-white p-4 rounded-full shadow-2xl z-30"
                >
                  <CheckCircle2 size={32} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center space-y-4 w-full">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Scan size={18} className="text-[#c69f6e]" />
                <h3 className="text-xl font-black text-[#4a3426] uppercase italic tracking-tighter">
                  {status === 'loading' ? 'Initialisation...' :
                    status === 'success' ? 'Accès Autorisé' :
                      status === 'error' ? 'Échec' :
                        status === 'locked' ? 'Bloqué' : 'Scan IA'}
                </h3>
              </div>
              <p className="text-[#8c8279] font-black text-[10px] uppercase tracking-[0.2em] opacity-50">Expertise Bey Biometrics</p>
            </div>

            <div className="py-4 bg-[#fcfaf8] rounded-2xl border border-[#e6dace] border-dashed">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-4">
                  <span className={`w-2 h-2 rounded-full transition-all duration-300 ${scanStep === 'align' ? 'bg-[#c69f6e] scale-125' : 'bg-green-500 opacity-30 shadow-none'}`} />
                  <span className={`w-2 h-2 rounded-full transition-all duration-300 ${scanStep === 'depth' ? 'bg-[#c69f6e] scale-125' : scanStep === 'auth' ? 'bg-green-500 opacity-30' : 'bg-[#e6dace] opacity-30'}`} />
                  <span className={`w-2 h-2 rounded-full transition-all duration-300 ${scanStep === 'auth' ? 'bg-[#c69f6e] scale-125' : 'bg-[#e6dace] opacity-30'}`} />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${status === 'error' || status === 'locked' ? 'text-red-500' : 'text-[#4a3426] animate-pulse'}`}>
                  {status === 'loading' ? statusText || 'Chargement...' :
                    status === 'success' ? 'Identité confirmée' :
                      status === 'locked' ? 'ACCÈS REFUSÉ - COMPTE BLOQUÉ' :
                        status === 'error' ? `Échec - Tentative ${failCount}/3` :
                          status === 'scanning' ? statusText || 'Analyse en cours...' :
                            scanStep === 'align' ? 'Alignement du visage...' :
                              scanStep === 'depth' ? 'Analyse IA...' :
                                'Reconnaissance faciale....'}
                </p>
              </div>
            </div>

            <p className="text-[9px] font-bold text-[#bba282] uppercase opacity-60">Session de {user.full_name}</p>
          </div>

          <button
            onClick={onClose}
            className="mt-10 px-6 py-3 bg-red-50 border border-red-100 rounded-xl text-[9px] font-black text-red-600 uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            Annuler la connexion
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const GET_SYSTEM_STATUS = gql`
  query GetSystemStatus {
    getSystemStatus {
      is_blocked
    }
  }
`;

const TOGGLE_BLOCK = gql`
  mutation ToggleSystemBlock($isBlocked: Boolean!) {
    toggleSystemBlock(isBlocked: $isBlocked)
  }
`;

const RECORD_CONNECTION = gql`
  mutation RecordConnection($username: String!, $ipAddress: String, $deviceInfo: String, $browser: String) {
    recordConnection(username: $username, ipAddress: $ipAddress, deviceInfo: $deviceInfo, browser: $browser)
  }
`;

const DISCONNECT_USER = gql`
  mutation DisconnectUser($username: String!) {
    disconnectUser(username: $username)
  }
`;

const CHECK_SESSION = gql`
  query CheckSession($startDate: String!, $endDate: String!) {
    getChiffresByRange(startDate: $startDate, endDate: $endDate) {
      date
      recette_de_caisse
      diponce
      diponce_divers
      diponce_admin
    }
  }
`;

export default function Home() {
  const [user, setUser] = useState<{ role: 'admin' | 'caissier', username?: string, full_name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lastUser, setLastUser] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: statusData, loading: statusLoading, refetch: refetchStatus } = useQuery(GET_SYSTEM_STATUS, {
    pollInterval: 10000,
  });

  useEffect(() => {
    // If system is blocked and current user is not admin, logout immediately
    const isSystemBlocked = statusData?.getSystemStatus?.is_blocked;
    const stored = localStorage.getItem('bb_user');
    if (isSystemBlocked && stored) {
      const userData = JSON.parse(stored);
      if (userData.role !== 'admin') {
        handleLogout();
      }
    }
  }, [statusData]);
  const [recordConnection] = useMutation(RECORD_CONNECTION);
  const [disconnectUser] = useMutation(DISCONNECT_USER);

  const [pendingUser, setPendingUser] = useState<any>(null);
  const [isFaceLoginOpen, setIsFaceLoginOpen] = useState(false);

  // Check if system OR current user is blocked
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);
  const isSystemBlocked = statusData?.getSystemStatus?.is_blocked;
  const isBlocked = (isSystemBlocked && user?.role !== 'admin') || isAccountBlocked;

  const targetDateStr = useMemo(() => {
    const now = new Date();
    const targetDate = new Date(now);
    // If before 07:00 AM, check for yesterday
    if (now.getHours() < 7) {
      targetDate.setDate(now.getDate() - 1);
    }
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const { data: sessionData } = useQuery(CHECK_SESSION, {
    variables: { startDate: targetDateStr, endDate: targetDateStr },
    fetchPolicy: 'network-only'
  });

  const isSessionSaved = useMemo(() => {
    if (!sessionData?.getChiffresByRange || sessionData.getChiffresByRange.length === 0) {
      return false;
    }

    const session = sessionData.getChiffresByRange[0];

    // Check if any meaningful data has been saved
    const hasRecette = session.recette_de_caisse && parseFloat(session.recette_de_caisse) > 0;
    const hasDiponce = session.diponce && parseFloat(session.diponce) > 0;
    const hasDiponceDivers = session.diponce_divers && parseFloat(session.diponce_divers) > 0;
    const hasDiponceAdmin = session.diponce_admin && parseFloat(session.diponce_admin) > 0;

    return hasRecette || hasDiponce || hasDiponceDivers || hasDiponceAdmin;
  }, [sessionData]);

  const [checkStatus] = useLazyQuery(gql`
    query CheckUserStatus {
      getUsers {
        username
        is_blocked_user
        last_active
      }
    }
  `, { fetchPolicy: 'network-only' });

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

    // iOS Detection - Use screen size to estimate iPhone model
    if (/iphone/i.test(ua)) {
      const screenHeight = window.screen.height;
      const screenWidth = window.screen.width;
      const pixelRatio = window.devicePixelRatio || 1;
      const physicalHeight = Math.max(screenHeight, screenWidth) * pixelRatio;
      const physicalWidth = Math.min(screenHeight, screenWidth) * pixelRatio;

      // iPhone model detection based on screen resolution
      // iPhone 16 Pro Max: 2868 x 1320
      if (physicalHeight >= 2800 && physicalWidth >= 1290) return 'iPhone 16 Pro Max';
      // iPhone 16 Pro: 2622 x 1206
      if (physicalHeight >= 2600 && physicalWidth >= 1200) return 'iPhone 16 Pro';
      // iPhone 16 Plus / 15 Plus / 14 Plus: 2796 x 1290
      if (physicalHeight >= 2750 && physicalWidth >= 1280) return 'iPhone 16 Plus';
      // iPhone 16 / 15 / 14: 2556 x 1179
      if (physicalHeight >= 2500 && physicalWidth >= 1170) return 'iPhone 16';
      // iPhone 15 Pro Max / 14 Pro Max: 2796 x 1290
      if (physicalHeight >= 2780 && physicalWidth >= 1280) return 'iPhone 15 Pro Max';
      // iPhone 15 Pro / 14 Pro: 2556 x 1179
      if (physicalHeight >= 2550 && physicalWidth >= 1170) return 'iPhone 15 Pro';
      // iPhone 13 Pro Max / 12 Pro Max: 2778 x 1284
      if (physicalHeight >= 2770 && physicalWidth >= 1280) return 'iPhone 13 Pro Max';
      // iPhone 13 / 13 Pro / 12 / 12 Pro: 2532 x 1170
      if (physicalHeight >= 2500 && physicalWidth >= 1160) return 'iPhone 13';
      // iPhone 13 mini / 12 mini: 2340 x 1080
      if (physicalHeight >= 2300 && physicalWidth >= 1070) return 'iPhone 13 Mini';
      // iPhone 11 Pro Max / XS Max: 2688 x 1242
      if (physicalHeight >= 2680 && physicalWidth >= 1240) return 'iPhone 11 Pro Max';
      // iPhone 11 / XR: 1792 x 828
      if (physicalHeight >= 1790 && physicalWidth >= 820 && physicalHeight < 2000) return 'iPhone 11';
      // iPhone 11 Pro / X / XS: 2436 x 1125
      if (physicalHeight >= 2400 && physicalWidth >= 1120) return 'iPhone 11 Pro';
      // iPhone 8 Plus / 7 Plus / 6s Plus: 1920 x 1080
      if (physicalHeight >= 1900 && physicalWidth >= 1070 && physicalHeight < 2000) return 'iPhone 8 Plus';
      // iPhone 8 / 7 / 6s / SE (2nd/3rd): 1334 x 750
      if (physicalHeight >= 1330 && physicalWidth >= 740 && physicalHeight < 1400) return 'iPhone SE';
      // iPhone SE (1st): 1136 x 640
      if (physicalHeight >= 1130 && physicalWidth >= 630 && physicalHeight < 1200) return 'iPhone SE (1st)';

      return 'iPhone';
    }

    // iPad Detection
    if (/ipad/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      const screenHeight = Math.max(window.screen.height, window.screen.width);
      const pixelRatio = window.devicePixelRatio || 1;
      const physicalSize = screenHeight * pixelRatio;

      if (physicalSize >= 2732) return 'iPad Pro 12.9"';
      if (physicalSize >= 2388) return 'iPad Pro 11"';
      if (physicalSize >= 2360) return 'iPad Air';
      if (physicalSize >= 2160) return 'iPad Mini';
      return 'iPad';
    }

    // Android Detection with model extraction
    if (/android/i.test(ua)) {
      // Try to extract model from User-Agent
      // Format: Android X.X; MODEL Build/XXX or Android X.X; MODEL)
      let model = '';

      // Samsung devices
      if (/SM-S9/i.test(ua)) {
        if (/SM-S928/i.test(ua)) return 'Samsung Galaxy S24 Ultra';
        if (/SM-S926/i.test(ua)) return 'Samsung Galaxy S24+';
        if (/SM-S921/i.test(ua)) return 'Samsung Galaxy S24';
        if (/SM-S918/i.test(ua)) return 'Samsung Galaxy S23 Ultra';
        if (/SM-S916/i.test(ua)) return 'Samsung Galaxy S23+';
        if (/SM-S911/i.test(ua)) return 'Samsung Galaxy S23';
        if (/SM-S908/i.test(ua)) return 'Samsung Galaxy S22 Ultra';
        if (/SM-S906/i.test(ua)) return 'Samsung Galaxy S22+';
        if (/SM-S901/i.test(ua)) return 'Samsung Galaxy S22';
      }
      if (/SM-G99/i.test(ua)) {
        if (/SM-G998/i.test(ua)) return 'Samsung Galaxy S21 Ultra';
        if (/SM-G996/i.test(ua)) return 'Samsung Galaxy S21+';
        if (/SM-G991/i.test(ua)) return 'Samsung Galaxy S21';
      }
      if (/SM-F9/i.test(ua)) {
        if (/SM-F956/i.test(ua)) return 'Samsung Galaxy Z Fold 6';
        if (/SM-F946/i.test(ua)) return 'Samsung Galaxy Z Fold 5';
        if (/SM-F936/i.test(ua)) return 'Samsung Galaxy Z Fold 4';
        if (/SM-F731/i.test(ua)) return 'Samsung Galaxy Z Flip 5';
        if (/SM-F721/i.test(ua)) return 'Samsung Galaxy Z Flip 4';
      }
      if (/SM-A/i.test(ua)) {
        if (/SM-A556/i.test(ua)) return 'Samsung Galaxy A55';
        if (/SM-A546/i.test(ua)) return 'Samsung Galaxy A54';
        if (/SM-A536/i.test(ua)) return 'Samsung Galaxy A53';
        if (/SM-A346/i.test(ua)) return 'Samsung Galaxy A34';
        if (/SM-A256/i.test(ua)) return 'Samsung Galaxy A25';
        if (/SM-A156/i.test(ua)) return 'Samsung Galaxy A15';
      }

      // Xiaomi/Redmi/POCO
      if (/xiaomi|redmi|poco/i.test(ua)) {
        const match = ua.match(/(Xiaomi|Redmi|POCO)[^;)]+/i);
        if (match) return match[0].trim();
      }

      // Google Pixel
      if (/pixel/i.test(ua)) {
        if (/Pixel 9 Pro XL/i.test(ua)) return 'Google Pixel 9 Pro XL';
        if (/Pixel 9 Pro/i.test(ua)) return 'Google Pixel 9 Pro';
        if (/Pixel 9/i.test(ua)) return 'Google Pixel 9';
        if (/Pixel 8 Pro/i.test(ua)) return 'Google Pixel 8 Pro';
        if (/Pixel 8a/i.test(ua)) return 'Google Pixel 8a';
        if (/Pixel 8/i.test(ua)) return 'Google Pixel 8';
        if (/Pixel 7 Pro/i.test(ua)) return 'Google Pixel 7 Pro';
        if (/Pixel 7a/i.test(ua)) return 'Google Pixel 7a';
        if (/Pixel 7/i.test(ua)) return 'Google Pixel 7';
        if (/Pixel 6 Pro/i.test(ua)) return 'Google Pixel 6 Pro';
        if (/Pixel 6a/i.test(ua)) return 'Google Pixel 6a';
        if (/Pixel 6/i.test(ua)) return 'Google Pixel 6';
        return 'Google Pixel';
      }

      // OnePlus
      if (/oneplus/i.test(ua)) {
        const match = ua.match(/OnePlus[^;)]*/i);
        if (match) return match[0].trim().replace(/OnePlus\s*/i, 'OnePlus ');
      }

      // Huawei
      if (/huawei|honor/i.test(ua)) {
        const match = ua.match(/(HUAWEI|HONOR)[^;)]*/i);
        if (match) return match[0].trim();
      }

      // OPPO
      if (/oppo/i.test(ua)) {
        const match = ua.match(/OPPO[^;)]*/i);
        if (match) return match[0].trim();
      }

      // Vivo
      if (/vivo/i.test(ua)) {
        const match = ua.match(/vivo[^;)]*/i);
        if (match) return match[0].trim();
      }

      // Generic Android model extraction
      const genericMatch = ua.match(/;\s*([^;)]+)\s*Build\//i) || ua.match(/;\s*([^;)]+)\s*\)/i);
      if (genericMatch && genericMatch[1]) {
        model = genericMatch[1].trim();
        if (model && !/^(Linux|U|Mobile|wv)$/i.test(model)) {
          return `Android (${model})`;
        }
      }

      return 'Android';
    }

    // Desktop Detection
    // Macintosh
    if (/macintosh/i.test(ua)) {
      // Check if it's actually an iPad with desktop mode
      if (navigator.maxTouchPoints > 1) return 'iPad (Desktop Mode)';

      const match = ua.match(/Mac OS X\s+([0-9_]+)/i);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        const majorVersion = parseInt(version.split('.')[0]);
        if (majorVersion >= 14) return 'Mac (Sonoma)';
        if (majorVersion >= 13) return 'Mac (Ventura)';
        if (majorVersion >= 12) return 'Mac (Monterey)';
        if (majorVersion >= 11) return 'Mac (Big Sur)';
        return `Mac (OS ${version})`;
      }
      return 'Mac';
    }

    // Windows Detection with version
    if (/windows/i.test(ua)) {
      if (/Windows NT 10.0/i.test(ua)) {
        // Windows 11 detection (Chrome 93+ adds build number)
        if (/Windows NT 10.0.*Win64/i.test(ua) && parseInt((navigator as any).userAgentData?.platformVersion?.split('.')[0] || '0') >= 13) {
          return 'Windows 11';
        }
        return 'Windows 10';
      }
      if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1';
      if (/Windows NT 6.2/i.test(ua)) return 'Windows 8';
      if (/Windows NT 6.1/i.test(ua)) return 'Windows 7';
      if (/Windows NT 6.0/i.test(ua)) return 'Windows Vista';
      if (/Windows NT 5.1/i.test(ua)) return 'Windows XP';
      return 'Windows';
    }

    // Linux Detection
    if (/linux/i.test(ua)) {
      if (/ubuntu/i.test(ua)) return 'Ubuntu Linux';
      if (/fedora/i.test(ua)) return 'Fedora Linux';
      if (/debian/i.test(ua)) return 'Debian Linux';
      if (/arch/i.test(ua)) return 'Arch Linux';
      if (/chromeos|cros/i.test(ua)) return 'ChromeOS';
      return 'Linux';
    }

    return 'Appareil inconnu';
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;

    // Browser version extraction helper
    const getVersion = (regex: RegExp) => {
      const match = ua.match(regex);
      return match ? match[1].split('.')[0] : '';
    };

    // Check browsers in order of specificity
    if (/SamsungBrowser/i.test(ua)) {
      const v = getVersion(/SamsungBrowser\/(\d+)/i);
      return v ? `Samsung Browser ${v}` : 'Samsung Browser';
    }
    if (/OPR|Opera/i.test(ua)) {
      const v = getVersion(/(?:OPR|Opera)\/(\d+)/i);
      return v ? `Opera ${v}` : 'Opera';
    }
    if (/Edg/i.test(ua)) {
      const v = getVersion(/Edg\/(\d+)/i);
      return v ? `Edge ${v}` : 'Edge';
    }
    if (/Firefox/i.test(ua)) {
      const v = getVersion(/Firefox\/(\d+)/i);
      return v ? `Firefox ${v}` : 'Firefox';
    }
    if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
      const v = getVersion(/Chrome\/(\d+)/i);
      return v ? `Chrome ${v}` : 'Chrome';
    }
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      const v = getVersion(/Version\/(\d+)/i);
      return v ? `Safari ${v}` : 'Safari';
    }
    if (/Chromium/i.test(ua)) {
      const v = getVersion(/Chromium\/(\d+)/i);
      return v ? `Chromium ${v}` : 'Chromium';
    }

    return 'Navigateur';
  };

  // Security check effect
  useEffect(() => {
    const checkSecurity = async () => {
      const stored = localStorage.getItem('bb_user');
      if (!stored) return;
      const userData = JSON.parse(stored);

      // Fetch current user status from DB
      const { data } = await checkStatus();
      if (!data?.getUsers) return;

      const dbUser = data.getUsers.find((u: any) => u.username.toLowerCase() === userData.username.toLowerCase());

      // Forced logout only if user is blocked
      if (dbUser?.is_blocked_user) {
        console.log("User blocked. Forced logout.");
        setIsAccountBlocked(true);
        handleLogout();
      } else {
        setIsAccountBlocked(false);
      }
    };

    checkSecurity();
    const interval = setInterval(checkSecurity, 45000);
    return () => clearInterval(interval);
  }, [user]); // Re-run if user state changes

  // Handle system-wide block logout
  useEffect(() => {
    if (isSystemBlocked && user && user.role !== 'admin') {
      console.log("System-wide block active. Disconnecting non-admin user.");
      handleLogout();
    }
  }, [isSystemBlocked, user]);

  // Auto-disconnect on inactivity (10 minutes)
  useEffect(() => {
    if (!user?.username) return;

    const DISCONNECT_TIME = 10 * 60 * 1000; // 10 minutes
    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivity > DISCONNECT_TIME) {
        console.log("User inactive for 10 mins. Auto-disconnecting.");
        handleLogout();
      }
    };

    // Check activity every 30 seconds instead of resetting timer on every event
    const intervalId = setInterval(checkInactivity, 30000);

    // Listeners update the timestamp
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [user]);


  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('bb_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('bb_user');
      }
    }

    // Check for last user for quick reconnect
    const last = localStorage.getItem('bb_last_user');
    if (last) {
      try {
        setLastUser(JSON.parse(last));
      } catch (e) {
        localStorage.removeItem('bb_last_user');
      }
    }
    setInitializing(false);

    // Handle back button - check if user is still logged in
    const handlePopState = () => {
      const currentUser = localStorage.getItem('bb_user');
      if (!currentUser) {
        // User is logged out, prevent showing cached content
        window.history.pushState(null, '', '/');
        setUser(null);
      }
    };

    // Handle page visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentUser = localStorage.getItem('bb_user');
        if (!currentUser) {
          setUser(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const [getUsersForAuth, { loading: queryLoading }] = useLazyQuery(gql`
    query GetUsersAuth {
      getUsers {
        id
        username
        password
        role
        full_name
        is_blocked_user
        has_face_id
        face_data
      }
    }
  `, { fetchPolicy: 'network-only' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await getUsersForAuth();

      if (!data?.getUsers) {
        throw new Error('No data');
      }

      const foundUser = data.getUsers.find(
        (u: any) => u.username?.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (foundUser) {
        // Enforce Face ID lockout check
        const isLocallyLocked = localStorage.getItem(`lock_${foundUser.username}`);
        if (isLocallyLocked) {
          setError('ACCÈS REFUSÉ : Trop de tentatives Face ID échouées.');
          return;
        }

        if (foundUser.is_blocked_user) {
          setError('Votre compte est suspendu. Contactez l\'administrateur.');
          setIsAccountBlocked(true);
        } else if (foundUser.has_face_id || foundUser.face_data) {
          setPendingUser(foundUser);
          setIsFaceLoginOpen(true);
        } else {
          finalizeLogin(foundUser);
        }
      } else {
        setError('Identifiants invalides');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleFacialReconnect = async () => {
    if (!lastUser) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await getUsersForAuth();
      if (!data?.getUsers) throw new Error('No data');

      const foundUser = data.getUsers.find(
        (u: any) => u.username?.toLowerCase() === lastUser.username.toLowerCase()
      );

      if (foundUser) {
        // Enforce Face ID lockout check
        const isLocallyLocked = localStorage.getItem(`lock_${foundUser.username}`);
        if (isLocallyLocked) {
          setError('ACCÈS REFUSÉ : Trop de tentatives Face ID échouées.');
          return;
        }

        if (foundUser.is_blocked_user) {
          setError('Votre compte est suspendu. Contactez l\'administrateur.');
          setIsAccountBlocked(true);
        } else if (foundUser.has_face_id || foundUser.face_data) {
          setPendingUser(foundUser);
          setIsFaceLoginOpen(true);
        } else {
          setError('Veuillez vous connecter avec votre mot de passe.');
        }
      }
    } catch (err) {
      setError('Erreur de reconnexion');
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = async (foundUser: any) => {
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const ipData = ipRes ? await ipRes.json() : { ip: 'Unknown' };

      await recordConnection({
        variables: {
          username: foundUser.username,
          ipAddress: ipData.ip,
          deviceInfo: getDeviceInfo(),
          browser: getBrowserInfo()
        }
      });
    } catch (e) {
      console.error('Record connection error:', e);
    }

    const userData = {
      role: foundUser.role,
      username: foundUser.username,
      full_name: foundUser.full_name,
    };
    localStorage.setItem('bb_user', JSON.stringify(userData));
    localStorage.setItem('bb_last_user', JSON.stringify({
      username: foundUser.username,
      full_name: foundUser.full_name,
      has_face_id: foundUser.has_face_id || !!foundUser.face_data
    }));
    setUser(userData);
    setIsAccountBlocked(false);
    setIsFaceLoginOpen(false);
    setPendingUser(null);
  };

  const handleLogout = async () => {
    if (user?.username) {
      try {
        await disconnectUser({ variables: { username: user.username } });
      } catch (e) { console.error('Logout error:', e); }
    }
    localStorage.clear();
    setUser(null);
    setUsername('');
    setPassword('');
  };

  if (initializing || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="relative w-20 h-20">
            <Image src="/logo.jpeg" alt="Loading" fill className="rounded-full object-cover opacity-50" />
          </div>
        </div>
      </div>
    );
  }

  // Show blocked screen when system is blocked (no login possible)
  if (isSystemBlocked) {
    return (
      <div className="fixed inset-0 bg-black w-full h-full" />
    );
  }

  // Show completely black screen when blocked
  if (isBlocked) {
    return (
      <div className="fixed inset-0 bg-black w-full h-full" />
    );
  }

  // Show login form when not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#fdfbf7]">
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.05] animate-pulse"></div>
          <div className="absolute top-40 -left-20 w-[500px] h-[500px] bg-[var(--primary)] rounded-full mix-blend-multiply filter blur-[100px] opacity-[0.05]"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_40px_100px_-20px_rgba(92,58,33,0.12)] border-[rgba(196,154,108,0.15)] rounded-[2.5rem] overflow-hidden min-h-[600px] relative"
        >
          {/* Main Visual Content */}
          <div className="hidden md:flex flex-col items-center justify-center relative p-12 bg-[#4a3426] text-white overflow-hidden h-full min-h-[600px]">
            <div className="absolute inset-0 opacity-[0.08] bg-[url('/logo.jpeg')] bg-cover bg-center grayscale mix-blend-luminosity"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

            <div className="relative z-10 text-center space-y-12 w-full flex flex-col items-center">
              <motion.div
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-32 h-32 relative rounded-[2.5rem] p-1 bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-2xl"
              >
                <div className="absolute inset-0 rounded-[2.3rem] overflow-hidden">
                  <Image src="/logo.jpeg" alt="Logo" fill className="object-cover border-4 border-transparent" />
                </div>

                {/* Status Indicator */}
                <motion.div
                  animate={{
                    scale: isSessionSaved ? [1, 1.2, 1] : [1, 1.1, 1],
                    opacity: isSessionSaved ? 1 : [0.8, 1, 0.8]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-4 border-[#4a3426] z-20 transition-colors duration-500 ${isSessionSaved
                    ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                    : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    }`}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1 md:space-y-2"
              >
                <h2 className="text-2xl md:text-4xl font-black tracking-tighter mb-1 md:mb-2 uppercase italic text-white leading-none">Expertise Bey</h2>
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <div className="h-[1px] w-6 md:w-8 bg-white/20"></div>
                  <p className="text-[#c69f6e] uppercase tracking-[0.3em] md:tracking-[0.5em] text-[8px] md:text-[10px] font-black italic">Hardware & Stock Intelligence</p>
                  <div className="h-[1px] w-6 md:w-8 bg-white/20"></div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="p-8 md:p-14 flex flex-col justify-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-center md:text-left mb-6 md:mb-10">
                  <h2 className="text-2xl md:text-3xl font-black text-[#4a3426] tracking-tighter uppercase italic leading-tight">Bienvenue</h2>
                  <p className="text-[#bba282] font-bold text-[8px] md:text-[10px] uppercase tracking-widest mt-1 md:mt-2 opacity-60">Identification requise</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-5">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 md:left-5 flex items-center text-[#bba282] group-focus-within:text-[#4a3426] transition-colors">
                        <User className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl bg-[#fcfaf8] border border-[#e6dace] px-4 md:px-5 pl-12 md:pl-14 text-xs md:text-sm font-black text-[#4a3426] outline-none focus:border-[#4a3426] focus:bg-white transition-all placeholder:text-[#bba282]/40"
                        placeholder="IDENTIFIANT"
                        required
                      />
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 md:left-5 flex items-center text-[#bba282] group-focus-within:text-[#4a3426] transition-colors">
                        <Lock className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl bg-[#fcfaf8] border border-[#e6dace] px-4 md:px-5 pl-12 md:pl-14 pr-10 md:pr-12 text-xs md:text-sm font-black text-[#4a3426] outline-none focus:border-[#4a3426] focus:bg-white transition-all placeholder:text-[#bba282]/40"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-4 md:right-5 flex items-center text-[#bba282] hover:text-[#4a3426] transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                        ) : (
                          <Eye className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-xl flex items-center gap-3 border border-red-100 uppercase tracking-widest"
                    >
                      <AlertCircle size={16} />
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || queryLoading}
                    className="w-full h-16 bg-[#4a3426] text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-[#4a3426]/30 hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:scale-100 transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {loading || queryLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Se connecter</span>}
                  </button>

                  {lastUser && lastUser.has_face_id && (
                    <div className="relative pt-8 mt-2">
                      <div className="absolute top-8 left-0 right-0 flex items-center justify-center">
                        <span className="bg-white px-4 text-[9px] font-black text-[#bba282] uppercase tracking-[0.2em] opacity-40">OU</span>
                      </div>
                      <div className="border-t border-[#e6dace] opacity-30 pt-8">
                        <button
                          type="button"
                          onClick={handleFacialReconnect}
                          disabled={loading || queryLoading}
                          className="w-full h-16 border-2 border-[#4a3426] text-[#4a3426] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#4a3426] hover:text-white transition-all flex items-center justify-center gap-3 group"
                        >
                          <Scan size={18} className="group-hover:scale-110 transition-transform" />
                          <span>Reconnexion Faciale ({lastUser.username})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Face ID Login Modal */}
        <AnimatePresence>
          {isFaceLoginOpen && pendingUser && (
            <FaceIDLoginModal
              user={pendingUser}
              onClose={() => {
                setIsFaceLoginOpen(false);
                setPendingUser(null);
              }}
              onSuccess={() => finalizeLogin(pendingUser)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <ChiffrePage role={user.role} onLogout={handleLogout} />
    </div>
  );
}


