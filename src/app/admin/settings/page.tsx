'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, gql } from '@apollo/client';
import Sidebar from '@/components/Sidebar';
import {
    Monitor, Users, Shield, Plus, Trash2, Edit2,
    Save, X, Check, Loader2, AlertTriangle, Cpu, Globe,
    ChevronRight, Settings as SettingsIcon, Lock, UserPlus,
    Clock, Activity, Wifi, WifiOff, ShieldCheck, ShieldAlert,
    Camera, Scan, CheckCircle, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import Swal from 'sweetalert2';

// Load face-api models once
let modelsLoaded = false;
const loadModels = async () => {
    if (modelsLoaded) return true;
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        modelsLoaded = true;
        return true;
    } catch (err) {
        console.error('Failed to load face-api models:', err);
        return false;
    }
};

const GET_SETTINGS_DATA = gql`
  query GetSettingsData {
    getConnectedDevices {
      id
      ip
      name
      type
      status
      last_seen
    }
    getUsers {
      id
      username
      role
      full_name
      last_active
      is_online
      device_info
      ip_address
      is_blocked_user
      face_data
      has_face_id
    }
    getConnectionLogs {
      id
      username
      ip_address
      device_info
      browser
      connected_at
    }
  }
`;

const UPSERT_USER = gql`
  mutation UpsertUser($username: String!, $password: String!, $role: String!, $full_name: String, $face_data: String) {
    upsertUser(username: $username, password: $password, role: $role, full_name: $full_name, face_data: $face_data) {
      id
      username
      face_data
      has_face_id
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: Int!) {
    deleteUser(id: $id)
  }
`;

const UPSERT_DEVICE = gql`
  mutation UpsertDevice($ip: String!, $name: String, $type: String) {
    upsertDevice(ip: $ip, name: $name, type: $type) {
      id
      ip
    }
  }
`;

const DELETE_DEVICE = gql`
  mutation DeleteDevice($id: Int!) {
    deleteDevice(id: $id)
  }
`;

const DISCONNECT_USER = gql`
  mutation DisconnectUser($username: String!) {
    disconnectUser(username: $username)
  }
`;

const TOGGLE_USER_BLOCK = gql`
  mutation ToggleUserBlock($username: String!, $isBlocked: Boolean!) {
    toggleUserBlock(username: $username, isBlocked: $isBlocked)
  }
`;

const CLEAR_LOGS = gql`
  mutation ClearConnectionLogs {
    clearConnectionLogs
  }
`;

const GET_SYSTEM_STATUS = gql`
  query GetSystemStatus {
    getSystemStatus {
      is_blocked
    }
  }
`;

const TOGGLE_SYSTEM_BLOCK = gql`
  mutation ToggleSystemBlock($isBlocked: Boolean!) {
    toggleSystemBlock(isBlocked: $isBlocked)
  }
`;

export default function SettingsPage() {
    const { data, loading, refetch } = useQuery(GET_SETTINGS_DATA, {
        pollInterval: 20000 // Refresh every 20s to see online status changes
    });

    const [currentUser, setCurrentUser] = React.useState<any>(null);
    const router = useRouter();

    React.useEffect(() => {
        const stored = localStorage.getItem('bb_user');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.role !== 'admin') {
                router.replace('/');
                return;
            }
            setCurrentUser(parsed);
        } else {
            router.replace('/');
            return;
        }

        // Handle back button - check if user is still logged in
        const handlePopState = () => {
            const currentUser = localStorage.getItem('bb_user');
            if (!currentUser) {
                router.replace('/');
            }
        };

        // Handle page visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const currentUser = localStorage.getItem('bb_user');
                if (!currentUser) {
                    router.replace('/');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [router]);
    const [upsertUser] = useMutation(UPSERT_USER);
    const [deleteUser] = useMutation(DELETE_USER);
    const [upsertDevice] = useMutation(UPSERT_DEVICE);
    const [deleteDevice] = useMutation(DELETE_DEVICE);
    const [disconnectUser] = useMutation(DISCONNECT_USER);
    const [toggleUserBlock] = useMutation(TOGGLE_USER_BLOCK);
    const [clearLogs] = useMutation(CLEAR_LOGS);
    const [toggleSystemBlock] = useMutation(TOGGLE_SYSTEM_BLOCK);
    const { data: statusData, refetch: refetchStatus } = useQuery(GET_SYSTEM_STATUS, { pollInterval: 30000 });

    const isSystemBlocked = statusData?.getSystemStatus?.is_blocked;

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editingDevice, setEditingDevice] = useState<any>(null);

    // Form States
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'caissier', full_name: '', face_data: '' });
    const [deviceForm, setDeviceForm] = useState({ ip: '', name: '', type: 'pc' });

    const [isFaceCaptureOpen, setIsFaceCaptureOpen] = useState(false);
    const [facePreview, setFacePreview] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSaveUser = async () => {
        if (!editingUser && !userForm.password.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Mot de passe requis',
                text: 'Veuillez saisir un mot de passe pour le nouvel utilisateur',
                confirmButtonColor: '#4a3426'
            });
            return;
        }
        try {
            const res = await upsertUser({
                variables: {
                    ...userForm,
                    face_data: userForm.face_data
                }
            });
            if (res.data) {
                setIsUserModalOpen(false);
                setUserForm({ username: '', password: '', role: 'caissier', full_name: '', face_data: '' });
                refetch();
            }
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors de l\'enregistrement de l\'utilisateur',
                confirmButtonColor: '#4a3426'
            });
        }
    };

    const handleSaveDevice = async () => {
        try {
            await upsertDevice({ variables: deviceForm });
            setIsDeviceModalOpen(false);
            setDeviceForm({ ip: '', name: '', type: 'ZKTeco' });
            refetch();
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors de l\'enregistrement de l\'appareil',
                confirmButtonColor: '#4a3426'
            });
        }
    };

    const handleDelete = async (type: 'user' | 'device', id: number) => {
        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: type === 'user' ? "Cet utilisateur sera définitivement supprimé." : "Cet appareil sera définitivement supprimé.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#8c8279',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
            background: '#fcfaf8',
            customClass: {
                popup: 'rounded-[2rem] border border-[#e6dace]',
                confirmButton: 'rounded-xl font-black uppercase text-[12px] px-6 py-3',
                cancelButton: 'rounded-xl font-black uppercase text-[12px] px-6 py-3'
            }
        });

        if (!result.isConfirmed) return;

        try {
            if (type === 'user') await deleteUser({ variables: { id } });
            else await deleteDevice({ variables: { id } });
            refetch();
            Swal.fire({
                icon: 'success',
                title: 'Supprimé !',
                text: 'La suppression a été effectuée avec succès.',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors de la suppression',
                confirmButtonColor: '#4a3426'
            });
        }
    };

    const handleDisconnect = async (username: string) => {
        const result = await Swal.fire({
            title: 'Déconnecter l\'utilisateur ?',
            text: `Voulez-vous vraiment déconnecter ${username} ?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f97316',
            cancelButtonColor: '#8c8279',
            confirmButtonText: 'Oui, déconnecter',
            cancelButtonText: 'Annuler',
            background: '#fcfaf8'
        });

        if (!result.isConfirmed) return;

        try {
            await disconnectUser({
                variables: { username },
                optimisticResponse: {
                    disconnectUser: true
                },
                update(cache) {
                    const existingData: any = cache.readQuery({ query: GET_SETTINGS_DATA });
                    if (existingData) {
                        const newUsers = existingData.getUsers.map((u: any) =>
                            u.username === username ? { ...u, is_online: false } : u
                        );
                        cache.writeQuery({
                            query: GET_SETTINGS_DATA,
                            data: { ...existingData, getUsers: newUsers }
                        });
                    }
                }
            });

            if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
                localStorage.clear();
                window.location.href = '/';
                return;
            }

            Swal.fire({
                icon: 'success',
                title: 'Déconnecté',
                text: 'L\'utilisateur a été déconnecté.',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors de la déconnexion',
                confirmButtonColor: '#4a3426'
            });
            refetch();
        }
    };

    const handleToggleBlock = async (username: string, currentStatus: boolean) => {
        const action = currentStatus ? "Débloquer" : "Bloquer";
        const result = await Swal.fire({
            title: `${action} l'utilisateur ?`,
            text: `Voulez-vous vraiment ${action.toLowerCase()} ${username} ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#22c55e' : '#ef4444',
            cancelButtonColor: '#8c8279',
            confirmButtonText: `Oui, ${action.toLowerCase()}`,
            cancelButtonText: 'Annuler',
            background: '#fcfaf8'
        });

        if (!result.isConfirmed) return;

        try {
            const newStatus = !currentStatus;
            await toggleUserBlock({
                variables: { username, isBlocked: newStatus },
                optimisticResponse: {
                    toggleUserBlock: true
                },
                update(cache) {
                    const existingData: any = cache.readQuery({ query: GET_SETTINGS_DATA });
                    if (existingData) {
                        const newUsers = existingData.getUsers.map((u: any) =>
                            u.username === username ? { ...u, is_blocked_user: newStatus } : u
                        );
                        cache.writeQuery({
                            query: GET_SETTINGS_DATA,
                            data: { ...existingData, getUsers: newUsers }
                        });
                    }
                }
            });

            Swal.fire({
                icon: 'success',
                title: currentStatus ? 'Débloqué !' : 'Bloqué !',
                text: `L'utilisateur a été ${currentStatus ? 'débloqué' : 'bloqué'} avec succès.`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors du changement de statut',
                confirmButtonColor: '#4a3426'
            });
            refetch();
        }
    };

    const handleClearLogs = async () => {
        const result = await Swal.fire({
            title: 'Effacer l\'historique ?',
            text: "Cette action effacera tout l'historique des connexions.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#8c8279',
            confirmButtonText: 'Oui, effacer',
            cancelButtonText: 'Annuler'
        });

        if (!result.isConfirmed) return;

        try {
            await clearLogs();
            refetch();
            Swal.fire({
                icon: 'success',
                title: 'Effacé',
                text: 'L\'historique a été vidé.',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors de l\'effacement',
                confirmButtonColor: '#4a3426'
            });
        }
    };

    const handleBlockPlatform = async () => {
        if (isSystemBlocked) return; // Already blocked, do nothing

        const result = await Swal.fire({
            title: 'BLOQUER la plateforme ?',
            text: "Cela va déconnecter tous les utilisateurs et bloquer l'accès à la plateforme.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#8c8279',
            confirmButtonText: 'Oui, bloquer tout',
            cancelButtonText: 'Annuler',
            background: '#fcfaf8'
        });

        if (!result.isConfirmed) return;

        try {
            await toggleSystemBlock({ variables: { isBlocked: true } });
            // Clear local storage and redirect to home (logout current user)
            localStorage.clear();
            window.location.href = '/';
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Erreur lors du blocage de la plateforme',
                confirmButtonColor: '#4a3426'
            });
        }
    };

    return (
        <div className="flex bg-[#fcfaf8] min-h-screen">
            <Sidebar role="admin" />

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-[#4a3426] rounded-[1.2rem] text-white shadow-xl shadow-[#4a3426]/20">
                                    <SettingsIcon size={24} strokeWidth={2.5} />
                                </div>
                                <h1 className="text-4xl font-black text-[#4a3426] tracking-tighter uppercase italic">Configuration</h1>
                            </div>
                            <p className="text-[#8c8279] font-bold text-sm uppercase tracking-widest pl-1">Hardware & Control Center</p>
                        </div>
                    </header>

                    {/* Platform Status Panel */}
                    <section className="bg-white rounded-[2.5rem] p-8 border border-[#e6dace] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className={`p-5 rounded-[1.8rem] ${isSystemBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} transition-all duration-500`}>
                                {isSystemBlocked ? <ShieldAlert size={40} /> : <ShieldCheck size={40} />}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-[#4a3426] uppercase tracking-tighter">Statut de la Plateforme</h2>
                                <p className="text-[10px] font-bold text-[#bba282] uppercase tracking-[0.2em]">
                                    {isSystemBlocked ? "Le système est actuellement verrouillé" : "Le système est opérationnel"}
                                </p>
                            </div>
                        </div>

                        {!isSystemBlocked && (
                            <button
                                onClick={handleBlockPlatform}
                                className="w-full md:w-auto h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                            >
                                <ShieldAlert size={20} />
                                Bloquer la plateforme
                            </button>
                        )}
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                        {/* Users Management */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <Users className="text-[#c69f6e]" size={20} />
                                    <h2 className="text-xl font-black text-[#4a3426] uppercase tracking-tighter">Gestion Utilisateurs</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingUser(null);
                                        setUserForm({ username: '', password: '', role: 'caissier', full_name: '', face_data: '' });
                                        setShowPassword(false);
                                        setIsUserModalOpen(true);
                                    }}
                                    className="p-2.5 bg-white border border-[#e6dace] rounded-xl text-[#c69f6e] hover:bg-[#4a3426] hover:text-white hover:border-[#4a3426] shadow-sm transition-all"
                                >
                                    <UserPlus size={18} />
                                </button>
                            </div>

                            <div className="bg-white rounded-[2rem] border border-[#e6dace] overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[#fcfaf8] border-b border-[#e6dace]">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#8c8279] tracking-widest">Utilisateur</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#8c8279] tracking-widest">Statut / Appareil</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-[#8c8279] tracking-widest text-right min-w-[160px]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f9f6f2]">
                                            {data?.getUsers?.map((u: any) => (
                                                <tr key={u.id} className={`hover:bg-[#fcfaf8] transition-all ${u.is_blocked_user ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-[10px] font-black uppercase shadow-lg ${u.is_online ? 'bg-green-500 shadow-green-500/20' : u.is_blocked_user ? 'bg-red-500 shadow-red-500/20' : 'bg-[#4a3426] shadow-[#4a3426]/20'}`}>
                                                                {u.username.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-[#4a3426] uppercase">{u.username}</p>
                                                                <p className="text-[10px] font-bold text-[#bba282] uppercase">{u.full_name || 'Aucun nom'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${u.is_online ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`}></div>
                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${u.is_online ? 'text-green-500' : 'text-[#8c8279] opacity-40'}`}>
                                                                    {u.is_online ? 'En Ligne' : 'Hors Ligne'}
                                                                </span>
                                                            </div>
                                                            {u.last_active && (
                                                                <span className="text-[8px] font-bold text-[#bba282] italic">
                                                                    Actif {(() => {
                                                                        const d = new Date(typeof u.last_active === 'string' ? u.last_active.replace(' ', 'T') : u.last_active);
                                                                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                                                    })()}
                                                                </span>
                                                            )}
                                                            {u.is_online && (
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[8px] font-bold text-[#4a3426] uppercase opacity-70 flex items-center gap-1">
                                                                        <Monitor size={8} /> {u.device_info || 'Unknown Device'}
                                                                    </p>
                                                                    <p className="text-[8px] font-bold text-[#c69f6e] uppercase opacity-70 flex items-center gap-1">
                                                                        <Globe size={8} /> {u.ip_address || 'No IP'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase w-fit tracking-tighter ${u.is_blocked_user ? 'bg-red-100 text-red-600' : 'bg-[#e6dace]/20 text-[#8c8279]'}`}>
                                                                {u.is_blocked_user ? 'BLOQUÉ' : u.role}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 relative z-10">
                                                            {u.is_online && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDisconnect(u.username); }}
                                                                    className="p-2 hover:bg-orange-50 rounded-lg text-orange-400 hover:text-orange-600 border border-transparent hover:border-orange-100 relative z-20 pointer-events-auto"
                                                                    title="Déconnecter"
                                                                >
                                                                    <WifiOff size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleToggleBlock(u.username, u.is_blocked_user); }}
                                                                className={`p-2 rounded-lg border border-transparent relative z-20 pointer-events-auto ${u.is_blocked_user ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'hover:bg-red-50 text-red-400 hover:text-red-600 hover:border-red-100'}`}
                                                                title={u.is_blocked_user ? "Débloquer" : "Bloquer"}
                                                            >
                                                                {u.is_blocked_user ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingUser(u);
                                                                    setUserForm({ ...u, password: '', face_data: u.face_data || '' });
                                                                    setShowPassword(false);
                                                                    setIsUserModalOpen(true);
                                                                }}
                                                                className="p-2 hover:bg-white rounded-lg text-[#bba282] hover:text-[#c69f6e] border border-transparent hover:border-[#e6dace] relative z-20 pointer-events-auto"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete('user', u.id); }}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500 border border-transparent hover:border-red-100 relative z-20 pointer-events-auto"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        {/* Connection Logs Management */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <Activity className="text-[#c69f6e]" size={20} />
                                    <h2 className="text-xl font-black text-[#4a3426] uppercase tracking-tighter">Appareils Connectés</h2>
                                </div>
                                <button
                                    onClick={handleClearLogs}
                                    className="px-4 py-2 bg-white border border-red-100 rounded-xl text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    Effacer
                                </button>
                            </div>

                            <div className="bg-white rounded-[2rem] border border-[#e6dace] shadow-sm overflow-hidden h-[600px] flex flex-col">
                                <div className="p-6 bg-[#fcfaf8] border-b border-[#e6dace] flex justify-between items-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#8c8279] opacity-60">Appareils et Sessions détectées</p>
                                    <span className="px-3 py-1 bg-[#4a3426] text-white text-[8px] font-black rounded-full uppercase tracking-tighter shadow-lg shadow-[#4a3426]/20">Temps Réel</span>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                                    <AnimatePresence>
                                        {data?.getConnectionLogs?.map((log: any, idx: number) => (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="flex items-center gap-4 p-4 bg-[#fcfaf8] rounded-2xl border border-[#e6dace]/50 hover:border-[#c69f6e]/30 transition-all group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#c69f6e] opacity-0 group-hover:opacity-100 transition-all"></div>
                                                <div className="w-10 h-10 rounded-xl bg-white border border-[#e6dace] flex items-center justify-center text-[#4a3426] shadow-sm shrink-0">
                                                    {log.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <h3 className="text-xs font-black text-[#4a3426] uppercase truncate pr-4">{log.username}</h3>
                                                        <span className="text-[8px] font-bold text-[#bba282] uppercase whitespace-nowrap bg-white px-2 py-0.5 rounded border border-[#e6dace]">
                                                            {log.connected_at ? new Date(log.connected_at).toLocaleString() : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
                                                        <span className="text-[9px] font-black text-[#8c8279] uppercase flex items-center gap-1.5">
                                                            <Globe size={10} className="text-[#c69f6e]" /> {log.ip_address}
                                                        </span>
                                                        <span className="text-[9px] font-black text-[#8c8279] uppercase flex items-center gap-1.5">
                                                            <Monitor size={10} className="text-[#c69f6e]" /> {log.device_info}
                                                        </span>
                                                        <span className="text-[9px] font-black text-[#8c8279] uppercase flex items-center gap-1.5">
                                                            <Shield size={10} className="text-[#c69f6e]" /> {log.browser}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {(!data?.getConnectionLogs || data.getConnectionLogs.length === 0) && (
                                        <div className="h-full flex flex-col items-center justify-center opacity-40 py-20 grayscale">
                                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                                <div className="animate-ping absolute w-16 h-16 bg-gray-200 rounded-full opacity-50"></div>
                                                <Clock size={32} />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#4a3426]">En attente de sessions...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </main>

            {/* User Modal */}
            <AnimatePresence>
                {isUserModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-[#1a110a]/80">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#e6dace]"
                        >
                            <div className="p-8 bg-[#fcfaf8] border-b border-[#e6dace]">
                                <h3 className="text-2xl font-black text-[#4a3426] uppercase tracking-tighter italic">
                                    {editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
                                </h3>
                            </div>
                            <div className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Identifiant</label>
                                    <input
                                        value={userForm.username}
                                        onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                        className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-bold outline-none focus:border-[#c69f6e]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Nom Complet</label>
                                    <input
                                        value={userForm.full_name}
                                        onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                                        className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-bold outline-none focus:border-[#c69f6e]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Mot de Passe</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={userForm.password}
                                            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                            className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-bold outline-none focus:border-[#c69f6e] pr-12"
                                            placeholder={editingUser ? 'Laisser vide pour garder l\'ancien' : ''}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-all text-[#bba282] border border-transparent hover:border-[#e6dace]/50"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Rôle</label>
                                    <select
                                        value={userForm.role}
                                        onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                        className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-black outline-none focus:border-[#c69f6e]"
                                    >
                                        <option value="caissier">Caissier</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>

                                <div className="space-y-3 p-4 bg-[#fcfaf8] rounded-2xl border border-[#e6dace] border-dashed">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Scan size={16} className="text-[#c69f6e]" />
                                            <span className="text-[10px] font-black uppercase text-[#4a3426]">Reconnaissance Faciale</span>
                                        </div>
                                        {userForm.face_data ? (
                                            <div className="flex items-center gap-1 text-green-500">
                                                <CheckCircle size={14} />
                                                <span className="text-[8px] font-black uppercase">Activé</span>
                                            </div>
                                        ) : (
                                            <span className="text-[8px] font-black uppercase text-[#8c8279] opacity-50">Non Configuré</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsFaceCaptureOpen(true)}
                                        className="w-full py-3 bg-white border border-[#e6dace] rounded-xl text-[10px] font-black uppercase text-[#4a3426] hover:bg-[#4a3426] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Camera size={14} />
                                        {userForm.face_data ? 'Mettre à jour le Visage' : 'Scanner le Visage'}
                                    </button>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setIsUserModalOpen(false)} className="flex-1 h-14 bg-[#fcfaf8] text-[#8c8279] rounded-2xl font-black uppercase tracking-widest text-[10px]">Annuler</button>
                                    <button onClick={handleSaveUser} className="flex-1 h-14 bg-[#4a3426] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#4a3426]/20">Enregistrer</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Device Modal */}
            <AnimatePresence>
                {isDeviceModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-[#1a110a]/80">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#e6dace]"
                        >
                            <div className="p-8 bg-[#fcfaf8] border-b border-[#e6dace]">
                                <h3 className="text-2xl font-black text-[#4a3426] uppercase tracking-tighter italic">
                                    {editingDevice ? 'Modifier Appareil' : 'Nouvel Appareil'}
                                </h3>
                            </div>
                            <div className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Adresse IP</label>
                                    <input
                                        value={deviceForm.ip}
                                        onChange={e => setDeviceForm({ ...deviceForm, ip: e.target.value })}
                                        className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-bold outline-none focus:border-[#c69f6e]"
                                        placeholder="ex: 192.168.1.201"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Nom</label>
                                    <input
                                        value={deviceForm.name}
                                        onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })}
                                        className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-bold outline-none focus:border-[#c69f6e]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#bba282] ml-1">Modèle / Type</label>
                                    <select
                                        value={deviceForm.type}
                                        onChange={e => setDeviceForm({ ...deviceForm, type: e.target.value })}
                                        className="w-full h-14 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-5 text-sm font-black outline-none focus:border-[#c69f6e]"
                                    >
                                        <option value="ZKTeco">ZKTeco</option>
                                        <option value="pc">Ordinateur</option>
                                        <option value="Printer">Imprimante</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setIsDeviceModalOpen(false)} className="flex-1 h-14 bg-[#fcfaf8] text-[#8c8279] rounded-2xl font-black uppercase tracking-widest text-[10px]">Annuler</button>
                                    <button onClick={handleSaveDevice} className="flex-1 h-14 bg-[#4a3426] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#4a3426]/20">Enregistrer</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Face Capture Modal */}
            <AnimatePresence>
                {isFaceCaptureOpen && (
                    <FaceCaptureModal
                        onClose={() => setIsFaceCaptureOpen(false)}
                        onCapture={(img) => {
                            setUserForm({ ...userForm, face_data: img });
                            setIsFaceCaptureOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function FaceCaptureModal({ onClose, onCapture }: { onClose: () => void, onCapture: (img: string) => void }) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = React.useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
    const [step, setStep] = React.useState<number>(0); // 0: Loading, 1: Ready, 2: Detecting, 3: Captured, 4: Done
    const [progress, setProgress] = React.useState(0);
    const [status, setStatus] = React.useState("Chargement de l'IA...");
    const [faceDetected, setFaceDetected] = React.useState(false);

    const steps = [
        { id: 0, label: 'IA', desc: 'Chargement modèle' },
        { id: 1, label: 'Caméra', desc: 'Prêt' },
        { id: 2, label: 'Détection', desc: 'Recherche visage' },
        { id: 3, label: 'Capture', desc: 'Enregistrement' },
        { id: 4, label: 'Terminé', desc: 'Succès' }
    ];

    React.useEffect(() => {
        let animationId: number;
        let isActive = true;

        async function init() {
            // Load AI models
            setStatus("Chargement du modèle IA...");
            const loaded = await loadModels();
            if (!loaded || !isActive) {
                alert("Erreur: Impossible de charger le modèle IA");
                onClose();
                return;
            }

            setStep(1);
            setStatus("Démarrage caméra...");

            // Start camera
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
                });
                if (!isActive) {
                    s.getTracks().forEach(t => t.stop());
                    return;
                }
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    await new Promise(resolve => {
                        if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
                    });
                }

                setStatus("Placez votre visage dans le cercle");

                // Start continuous face detection
                const detectFace = async () => {
                    if (!isActive || !videoRef.current) return;

                    try {
                        const detection = await faceapi
                            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                            .withFaceLandmarks();

                        if (detection) {
                            setFaceDetected(true);
                            setStatus("Visage détecté! Restez immobile...");
                        } else {
                            setFaceDetected(false);
                            setStatus("Placez votre visage dans le cercle");
                        }
                    } catch (err) {
                        console.error('Detection error:', err);
                    }

                    if (isActive) {
                        animationId = requestAnimationFrame(detectFace);
                    }
                };

                detectFace();
            } catch (e) {
                alert('Impossible d\'accéder à la caméra');
                onClose();
            }
        }

        init();

        return () => {
            isActive = false;
            if (animationId) cancelAnimationFrame(animationId);
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    const captureface = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setStep(2);
        setStatus("Analyse du visage...");
        setProgress(0);

        // Progress animation
        for (let p = 0; p <= 50; p += 10) {
            setProgress(p);
            await new Promise(r => setTimeout(r, 100));
        }

        // Detect face with full descriptor
        const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            setStatus("Aucun visage détecté. Réessayez.");
            setStep(1);
            return;
        }

        for (let p = 50; p <= 80; p += 10) {
            setProgress(p);
            await new Promise(r => setTimeout(r, 100));
        }

        // Capture high-quality image
        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const data = canvasRef.current.toDataURL('image/jpeg', 0.95);
            setCapturedImage(data);
        }

        for (let p = 80; p <= 100; p += 10) {
            setProgress(p);
            await new Promise(r => setTimeout(r, 100));
        }

        setStep(4);
        setStatus("Visage enregistré avec succès!");
        setProgress(100);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-[#1a110a]/90">
            <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-[#e6dace]"
            >
                <div className="p-8 border-b border-[#e6dace] flex justify-between items-center bg-[#fcfaf8]">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-black text-[#4a3426] uppercase italic tracking-tighter">Enrôlement Biométrique</h3>
                        <p className="text-[9px] font-black text-[#c69f6e] uppercase tracking-[0.2em]">{status}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="p-8 flex flex-col items-center">
                    {/* Multi-step progress bits */}
                    <div className="flex gap-2 mb-8 w-full">
                        {steps.map((s, idx) => (
                            <div key={idx} className="flex-1 flex flex-col gap-2">
                                <div className={`h-1 rounded-full transition-all duration-500 ${step > idx ? 'bg-green-500' : step === idx ? 'bg-[#c69f6e]' : 'bg-[#e6dace] opacity-30'}`}>
                                    {step === idx && (
                                        <motion.div
                                            initial={{ width: '0%' }} animate={{ width: `${progress}%` }}
                                            className="h-full bg-green-500 rounded-full"
                                        />
                                    )}
                                </div>
                                <span className={`text-[7px] font-black uppercase tracking-tighter text-center ${step === idx ? 'text-[#4a3426]' : 'text-[#8c8279] opacity-40'}`}>
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="relative w-full aspect-square max-w-[320px] rounded-[3.5rem] overflow-hidden bg-black border-[6px] border-[#fcfaf8] shadow-2xl mb-8 group">
                        <div className="absolute inset-0 z-10 pointer-events-none border-[1px] border-white/20 rounded-[3rem] m-2"></div>

                        {!capturedImage || step < 4 ? (
                            <>
                                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover grayscale brightness-110 contrast-125 transition-all duration-700 ${step > 0 ? 'scale-110' : 'scale-100'}`} />

                                {/* Overlay scan lines */}
                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[1px] bg-[#c69f6e] opacity-30 shadow-[0_0_15px_#c69f6e] z-10 animate-pulse"></div>
                                <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-[1px] bg-[#c69f6e] opacity-30 shadow-[0_0_15px_#c69f6e] z-10 animate-pulse"></div>

                                {/* Circular Guide - changes color based on face detection */}
                                <div className={`absolute inset-12 border-[3px] rounded-full transition-all duration-300 ${faceDetected
                                    ? 'border-green-500 opacity-80 shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                                    : 'border-dashed border-[#c69f6e] opacity-30'
                                    }`}></div>

                                {step > 0 && faceDetected && (
                                    <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
                                        <div className="w-full h-full border-4 border-green-500 rounded-full opacity-60 animate-pulse"></div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <motion.img
                                initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                                src={capturedImage}
                                className="w-full h-full object-cover"
                            />
                        )}

                        {/* Status badge in corner */}
                        <div className="absolute bottom-6 right-6 z-20">
                            {step === 4 ? (
                                <div className="bg-green-500 text-white p-2 rounded-xl shadow-lg">
                                    <CheckCircle size={20} />
                                </div>
                            ) : faceDetected && step >= 1 ? (
                                <div className="bg-green-500 text-white p-2 rounded-xl shadow-lg">
                                    <Check size={20} />
                                </div>
                            ) : step >= 1 ? (
                                <div className="bg-[#4a3426] text-white p-2 rounded-xl shadow-lg">
                                    <Scan size={20} className="animate-pulse" />
                                </div>
                            ) : (
                                <div className="bg-[#4a3426] text-white p-2 rounded-xl shadow-lg animate-spin">
                                    <Loader2 size={20} />
                                </div>
                            )}
                        </div>
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    {step === 0 ? (
                        <div className="w-full h-16 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl flex items-center justify-center gap-4">
                            <Loader2 className="w-5 h-5 animate-spin text-[#c69f6e]" />
                            <span className="text-[10px] font-black text-[#4a3426] uppercase">Chargement IA...</span>
                        </div>
                    ) : step === 1 ? (
                        <button
                            onClick={captureface}
                            disabled={!faceDetected}
                            className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${faceDetected
                                ? 'bg-[#4a3426] text-white hover:scale-105 active:scale-95'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <Camera size={20} />
                            {faceDetected ? 'Capturer le visage' : 'En attente de visage...'}
                        </button>
                    ) : step === 4 ? (
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => { setCapturedImage(null); setStep(0); setProgress(0); }}
                                className="flex-1 h-16 bg-[#fcfaf8] text-[#8c8279] border border-[#e6dace] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all"
                            >
                                Recommencer
                            </button>
                            <button
                                onClick={() => onCapture(capturedImage!)}
                                className="flex-1 h-16 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all"
                            >
                                Valider le Profil
                            </button>
                        </div>
                    ) : (
                        <div className="w-full h-16 bg-[#fcfaf8] border border-[#e6dace] rounded-2xl flex items-center justify-center gap-4">
                            <span className="text-[10px] font-black text-[#4a3426] uppercase animate-pulse">{status}</span>
                        </div>
                    )}

                    <p className="mt-8 text-[8px] font-black text-[#bba282] uppercase tracking-[0.2em] text-center opacity-40 max-w-[280px]">
                        L'intelligence artificielle analyse 128 points de repère faciaux pour une sécurité maximale.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

