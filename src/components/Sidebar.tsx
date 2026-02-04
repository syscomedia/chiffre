'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
    LayoutDashboard, PieChart as PieChartIcon, Truck, LogOut, CreditCard,
    ShoppingBag, Monitor, Shield, Key, ChevronRight, Settings,
    Lock, CheckCircle2, AlertCircle, User as UserIcon, X, Loader2,
    Eye, EyeOff, ArrowLeftRight, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GET_DEVICES = gql`
  query GetConnectedDevices {
    getUsers {
      id
      username
      full_name
      is_online
      device_info
      ip_address
    }
  }
`;

const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($username: String!, $newPassword: String!) {
    updatePassword(username: $username, newPassword: $newPassword)
  }
`;

const HEARTBEAT = gql`
  mutation Heartbeat($username: String!, $deviceInfo: String, $ipAddress: String) {
    heartbeat(username: $username, deviceInfo: $deviceInfo, ipAddress: $ipAddress)
  }
`;

const DISCONNECT_USER = gql`
  mutation DisconnectUser($username: String!) {
    disconnectUser(username: $username)
  }
`;

interface SidebarProps {
    role: 'admin' | 'caissier';
}

export default function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const { data: deviceData } = useQuery(GET_DEVICES, {
        pollInterval: 60000
    });

    const [updatePassword] = useMutation(UPDATE_PASSWORD);
    const [sendHeartbeat] = useMutation(HEARTBEAT);
    const [disconnectUser] = useMutation(DISCONNECT_USER);

    const handleLogout = useCallback(async () => {
        if (user?.username) {
            try {
                await disconnectUser({ variables: { username: user.username } });
            } catch (e) { console.error('Logout sync error:', e); }
        }
        localStorage.clear();
        sessionStorage.clear();
        // Replace current history entry and clear forward history to prevent back navigation
        window.history.pushState(null, '', '/');
        window.location.replace('/');
    }, [user, disconnectUser]);

    // Note: Removed auto-disconnect on tab close/reload
    // User session persists until explicit logout or inactivity timeout

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                localStorage.setItem('bb_last_hidden_time', Date.now().toString());
            } else if (document.visibilityState === 'visible') {
                const lastHidden = localStorage.getItem('bb_last_hidden_time');
                if (lastHidden) {
                    const elapsed = Date.now() - parseInt(lastHidden);
                    // 10 minutes = 10 * 60 * 1000 = 600000 ms
                    if (elapsed > 10 * 60 * 1000) {
                        const stored = localStorage.getItem('bb_user');
                        if (stored) {
                            console.log('App in background for >10 mins. Logging out.');
                            handleLogout();
                        }
                    }
                    localStorage.removeItem('bb_last_hidden_time');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handleLogout]);

    useEffect(() => {
        const stored = localStorage.getItem('bb_user');
        const userData = stored ? JSON.parse(stored) : null;
        if (userData) setUser(userData);
    }, []);

    useEffect(() => {
        if (!user) return;

        const getDeviceInfo = () => {
            const ua = navigator.userAgent;

            if (/android/i.test(ua)) {
                const match = ua.match(/Android\s+[^;]+;\s+([^);]+)/i);
                if (match && match[1]) {
                    const model = match[1].trim();
                    if (!/mobile|tablet/i.test(model)) return `Android (${model})`;
                }
                return 'Android Device';
            }

            if (/iphone/i.test(ua)) return 'Apple iPhone';
            if (/ipad/i.test(ua)) return 'Apple iPad';

            if (/macintosh/i.test(ua)) {
                const match = ua.match(/OS X\s+([^);]+)/i);
                if (match && match[1]) return `Mac OS (${match[1].replace(/_/g, '.')})`;
                return 'Apple Mac';
            }

            if (/windows/i.test(ua)) {
                if (/nt 10.0/i.test(ua)) return 'Windows 10/11';
                if (/nt 6.3/i.test(ua)) return 'Windows 8.1';
                if (/nt 6.2/i.test(ua)) return 'Windows 8';
                if (/nt 6.1/i.test(ua)) return 'Windows 7';
                return 'Windows PC';
            }

            if (/linux/i.test(ua)) return 'Linux System';
            return 'Ordinateur';
        };

        const pulse = async () => {
            const hbUsername = user?.username || user?.role;
            if (!hbUsername) return;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal }).catch(() => null);
                clearTimeout(timeoutId);

                const ipData = ipRes ? await ipRes.json() : { ip: 'Unknown' };

                const hbRes = await sendHeartbeat({
                    variables: {
                        username: hbUsername,
                        deviceInfo: getDeviceInfo(),
                        ipAddress: ipData.ip
                    }
                });

                if (hbRes.data?.heartbeat === false) {
                    console.log('Session invalidated by server. Logging out...');
                    handleLogout();
                }
            } catch (e) { console.error('HB Error:', e); }
        };

        pulse();
        const interval = setInterval(pulse, 15000);
        return () => clearInterval(interval);
    }, [user, sendHeartbeat, handleLogout]);

    const navItems = [
        { name: 'Journalier', icon: LayoutDashboard, href: '/' },
        { name: 'Facturation', icon: CreditCard, href: '/facturation' },
        { name: 'Fournisseurs', icon: Truck, href: '/fournisseurs' },
    ];

    if (role === 'admin') {
        navItems.unshift({ name: 'Dépenses Caisse Mensuelle', icon: LayoutDashboard, href: '/dashboard' });
        navItems.push({ name: "Coût d'achat", icon: ShoppingBag, href: '/cout-achat' });
        navItems.push({ name: 'Statistiques', icon: PieChartIcon, href: '/statistiques' });
        navItems.push({ name: 'Intelligence Artificielle', icon: Bot, href: '/ai' });
        navItems.push({ name: 'Comparatif', icon: ArrowLeftRight, href: '/comparatif' });
        navItems.push({ name: 'Paiements', icon: CreditCard, href: '/paiements' });
        navItems.push({ name: 'Paramètres', icon: Settings, href: '/admin/settings' });
    }

    const handlePasswordUpdate = async () => {
        if (!newPass) return;
        setUpdateStatus('loading');
        try {
            await updatePassword({ variables: { username: user.username, newPassword: newPass } });
            setUpdateStatus('success');
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setUpdateStatus('idle');
                setNewPass('');
            }, 2000);
        } catch (e) {
            setUpdateStatus('error');
        }
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex sticky top-0 h-screen w-64 bg-white border-r border-[#e6dace] flex-col justify-between py-8 px-4 z-40 transition-all duration-300">
                <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
                    <div className="flex flex-row items-center gap-3 mb-10 px-2 shrink-0">
                        <div className="relative w-12 h-12 shrink-0">
                            <Image src="/logo.jpeg" alt="Logo" fill className="rounded-full shadow-md border-2 border-white object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="font-black text-[#4a3426] text-[18px] leading-tight tracking-tighter uppercase truncate">Business Bey</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] shrink-0"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#8c8279] truncate">
                                    {role === 'admin' ? 'Admin' : 'Gestion Caisse'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Connected Devices Section */}
                    {role === 'admin' && (
                        <div className="mb-8 shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba282] px-4 mb-4 opacity-60">Appareils</p>
                            <div className="space-y-2 px-2">
                                {deviceData?.getUsers?.filter((u: any) => u.is_online).length > 0 ?
                                    deviceData.getUsers.filter((u: any) => u.is_online).map((onlineUser: any) => (
                                        <div key={onlineUser.id} className="flex items-center gap-3 p-3 bg-[#fcfaf8] border border-[#e6dace]/50 rounded-xl">
                                            <div className="p-2 rounded-lg bg-[#4a3426] text-white">
                                                <Monitor size={14} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black text-[#4a3426] truncate uppercase tracking-tight">{onlineUser.username}</span>
                                                <span className="text-[7px] font-bold text-[#bba282] uppercase truncate">{onlineUser.device_info || 'Appareil Connecté'}</span>
                                            </div>
                                            <div className="ml-auto w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                                        </div>
                                    )) : (
                                        <div className="px-4 py-2 border border-dashed border-[#e6dace] rounded-xl text-center">
                                            <p className="text-[9px] font-bold text-[#bba282] italic">Aucun appareil actif</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    )}

                    <nav className="space-y-1.5 mb-8 shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba282] px-4 mb-3 opacity-60">Menu</p>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive ? 'bg-[#4a3426] text-white shadow-xl shadow-[#4a3426]/20' : 'text-[#8c8279] hover:bg-[#fcfaf8] hover:text-[#4a3426]'}`}
                                >
                                    <div className={`shrink-0 ${isActive ? 'scale-110' : ''}`}>
                                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className={`text-xs tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>{item.name}</span>
                                    {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="mt-auto space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba282] px-4 mb-3 opacity-60">Session</p>
                        <div className="bg-[#fcfaf8] border border-[#e6dace]/50 rounded-[1.5rem] p-3 mx-2">
                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#e6dace]/30">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-[1rem] bg-[#4a3426] flex items-center justify-center text-white text-sm font-black ring-4 ring-[#fcfaf8]">
                                        {user?.full_name?.charAt(0) || user?.username?.charAt(0) || <UserIcon size={18} />}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-black text-[#4a3426] truncate uppercase tracking-tight">{user?.full_name || user?.username}</span>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">En Ligne</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black text-[#8c8279] hover:bg-white hover:text-[#c69f6e] hover:shadow-sm border border-transparent hover:border-[#e6dace]/50 transition-all uppercase tracking-widest"
                            >
                                <Key size={14} />
                                <span>Sécurité</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black text-red-400 hover:bg-red-50 hover:text-red-500 transition-all uppercase tracking-widest mt-1"
                            >
                                <LogOut size={14} />
                                <span>Déconnexion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Navigation - Sleek & Premium */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 pointer-events-none">
                <div className="max-w-md mx-auto h-16 bg-[#4a3426]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(74,52,38,0.3)] border border-white/10 flex items-center justify-around px-2 pointer-events-auto ring-1 ring-white/5">
                    {navItems.slice(0, 4).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[8px] mt-1 font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                    {item.name.split(' ')[0]}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-indicator"
                                        className="absolute -bottom-1 w-1 h-1 bg-[#c69f6e] rounded-full shadow-[0_0_10px_#c69f6e]"
                                    />
                                )}
                            </Link>
                        );
                    })}

                    {/* More Menu / Actions */}
                    <button
                        onClick={handleLogout}
                        className="flex flex-col items-center justify-center flex-1 h-full text-red-400/80 hover:text-red-400 transition-all"
                    >
                        <LogOut size={20} />
                        <span className="text-[8px] mt-1 font-black uppercase tracking-tighter opacity-60">Sortir</span>
                    </button>

                    {/* User Mini Profile */}
                    <div
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex flex-col items-center justify-center flex-1 h-full cursor-pointer group"
                    >
                        <div className="w-8 h-8 rounded-xl bg-[#c69f6e]/20 border border-[#c69f6e]/30 flex items-center justify-center text-[#c69f6e] group-hover:bg-[#c69f6e]/30 transition-all shadow-inner">
                            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </div>
                        <span className="text-[8px] mt-1 font-black uppercase tracking-tighter text-white/40 group-hover:text-white/60">Moi</span>
                    </div>
                </div>
            </nav>

            {/* In case there are more than 4 items, we need a way to show them or scroll */}
            {navItems.length > 4 && (
                <div className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex gap-2">
                    {navItems.slice(4).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`p-2 rounded-xl backdrop-blur-md border ${isActive ? 'bg-[#c69f6e] text-white border-[#c69f6e]' : 'bg-white/80 text-[#4a3426] border-[#e6dace]'} shadow-lg transition-all active:scale-95`}
                            >
                                <item.icon size={16} />
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Password Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-[#1a110a]/80 backdrop-blur-md flex items-center justify-center p-6"
                        onClick={() => setIsPasswordModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-[#e6dace]"
                        >
                            <div className="p-8 border-b border-[#f9f6f2] flex justify-between items-center bg-[#fcfaf8]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white rounded-xl text-[#c69f6e] shadow-sm ring-1 ring-[#e6dace]/50">
                                        <Lock size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[#4a3426] tracking-tighter uppercase">Changer Mot de Passe</h3>
                                        <p className="text-[10px] font-black text-[#8c8279] uppercase tracking-widest opacity-60">Sécurisez votre compte</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-[#bba282] border border-transparent hover:border-[#e6dace]/50"><X size={20} /></button>
                            </div>

                            <div className="p-8 space-y-6">
                                {updateStatus === 'success' ? (
                                    <div className="py-10 flex flex-col items-center justify-center gap-4 text-center">
                                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-2">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <h4 className="text-lg font-black text-[#4a3426] uppercase tracking-tighter">Mis à jour !</h4>
                                        <p className="text-xs font-bold text-[#8c8279]">Votre mot de passe a été modifié avec succès.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba282] mb-3 block opacity-60 pl-1">Utilisateur</label>
                                            <div className="h-14 w-full px-5 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl flex items-center text-sm font-bold text-[#4a3426] opacity-60">
                                                {user?.username}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba282] mb-3 block opacity-60 pl-1">Nouveau Mot de Passe</label>
                                            <div className="relative">
                                                <input
                                                    type={showPass ? "text" : "password"}
                                                    autoFocus
                                                    value={newPass}
                                                    onChange={e => setNewPass(e.target.value)}
                                                    className="h-14 w-full px-5 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl text-sm font-bold text-[#4a3426] outline-none focus:border-[#c69f6e] focus:bg-white focus:shadow-inner transition-all placeholder:text-[#bba282]/40 pr-12"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPass(!showPass)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-all text-[#bba282] border border-transparent hover:border-[#e6dace]/50"
                                                >
                                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {updateStatus === 'error' && (
                                            <div className="p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-500">
                                                <AlertCircle size={18} />
                                                <span className="text-xs font-bold uppercase tracking-tight">Erreur lors de la mise à jour</span>
                                            </div>
                                        )}

                                        <button
                                            disabled={!newPass || updateStatus === 'loading'}
                                            onClick={handlePasswordUpdate}
                                            className="w-full h-14 bg-[#4a3426] text-white rounded-[1.2rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-xl shadow-[#4a3426]/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                                        >
                                            {updateStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                                            Modifier le mot de passe
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
