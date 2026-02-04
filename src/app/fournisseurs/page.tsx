'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    Truck, Plus, Trash2, Search, Loader2, Building2, AlertCircle,
    CheckCircle2, X, ChevronRight, LayoutDashboard, Edit2, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GET_SUPPLIERS = gql`
  query GetSuppliers {
    getSuppliers {
      id
      name
    }
  }
`;

const GET_DESIGNATIONS = gql`
    query GetDesignations {
        getDesignations {
            id
            name
        }
    }
`;

const UPSERT_SUPPLIER = gql`
  mutation UpsertSupplier($name: String!) {
    upsertSupplier(name: $name) {
      id
      name
    }
  }
`;

const UPDATE_SUPPLIER = gql`
    mutation UpdateSupplier($id: Int!, $name: String!) {
        updateSupplier(id: $id, name: $name) {
            id
            name
        }
    }
`;

const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($id: Int!) {
    deleteSupplier(id: $id)
  }
`;

const UPSERT_DESIGNATION = gql`
    mutation UpsertDesignation($name: String!) {
        upsertDesignation(name: $name) {
            id
            name
        }
    }
`;

const UPDATE_DESIGNATION = gql`
    mutation UpdateDesignation($id: Int!, $name: String!) {
        updateDesignation(id: $id, name: $name) {
            id
            name
        }
    }
`;

const DELETE_DESIGNATION = gql`
    mutation DeleteDesignation($id: Int!) {
        deleteDesignation(id: $id)
    }
`;

export default function FournisseursPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ role: 'admin' | 'caissier', full_name: string } | null>(null);
    const [initializing, setInitializing] = useState(true);

    // Navigation state
    const [activeTab, setActiveTab] = useState<'suppliers' | 'designations'>('suppliers');

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState<{ id: number, name: string, type: 'supplier' | 'designation' } | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        const savedUser = localStorage.getItem('bb_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        } else {
            router.replace('/');
            return;
        }
        setInitializing(false);

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

    // Data handling
    const { data: suppliersData, loading: loadingSuppliers, refetch: refetchSuppliers } = useQuery(GET_SUPPLIERS);
    const { data: designationsData, loading: loadingDesignations, refetch: refetchDesignations } = useQuery(GET_DESIGNATIONS);

    const [upsertSupplier, { loading: addingSupplier }] = useMutation(UPSERT_SUPPLIER);
    const [updateSupplier, { loading: updatingSupplier }] = useMutation(UPDATE_SUPPLIER);
    const [deleteSupplier] = useMutation(DELETE_SUPPLIER);

    const [upsertDesignation, { loading: addingDesignation }] = useMutation(UPSERT_DESIGNATION);
    const [updateDesignation, { loading: updatingDesignation }] = useMutation(UPDATE_DESIGNATION);
    const [deleteDesignation] = useMutation(DELETE_DESIGNATION);

    const items = activeTab === 'suppliers' ? (suppliersData?.getSuppliers || []) : (designationsData?.getDesignations || []);
    const filteredItems = items.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        // Check for local duplicate
        const isDuplicate = items.some(
            (item: any) => item.name.toLowerCase() === newItemName.trim().toLowerCase()
        );

        if (isDuplicate) {
            showToast('Cet élément existe déjà', 'error');
            return;
        }

        try {
            if (activeTab === 'suppliers') {
                await upsertSupplier({ variables: { name: newItemName.trim() } });
                refetchSuppliers();
            } else {
                await upsertDesignation({ variables: { name: newItemName.trim() } });
                refetchDesignations();
            }
            showToast('Ajouté avec succès', 'success');
            setNewItemName('');
            setIsAdding(false);
        } catch (err) {
            showToast("Erreur lors de l'ajout", 'error');
        }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || !editName.trim()) return;

        try {
            if (editingItem.type === 'supplier') {
                await updateSupplier({ variables: { id: editingItem.id, name: editName.trim() } });
                refetchSuppliers();
            } else {
                await updateDesignation({ variables: { id: editingItem.id, name: editName.trim() } });
                refetchDesignations();
            }
            showToast('Modifié avec succès', 'success');
            setEditingItem(null);
            setEditName('');
        } catch (err) {
            showToast("Erreur lors de la modification", 'error');
        }
    };

    const handleDelete = async (id: number, name: string) => {
        const typeLabel = activeTab === 'suppliers' ? 'fournisseur' : 'désignation';
        if (!confirm(`Voulez-vous vraiment supprimer ce ${typeLabel} "${name}" ?`)) return;

        try {
            if (activeTab === 'suppliers') {
                await deleteSupplier({ variables: { id } });
                refetchSuppliers();
            } else {
                await deleteDesignation({ variables: { id } });
                refetchDesignations();
            }
            showToast('Supprimé avec succès', 'success');
        } catch (err) {
            showToast('Erreur lors de la suppression', 'error');
        }
    };

    if (initializing || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
            <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
        </div>
    );

    const isLoading = activeTab === 'suppliers' ? loadingSuppliers : loadingDesignations;

    return (
        <div className="min-h-screen bg-[#f8f5f2] text-[#2d241e] font-sans flex text-sm md:text-base">
            <Sidebar role={user.role} />

            <div className="flex-1 min-w-0 pb-24 lg:pb-0">
                {/* Header - Optimized for Mobile & Desktop */}
                <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-[#e6dace] py-3 md:py-6 px-4 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 transition-all transition-all duration-300">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#4a3426] p-2 rounded-xl text-white shadow-lg shadow-[#4a3426]/20">
                                {activeTab === 'suppliers' ? <Truck size={18} /> : <Bookmark size={18} />}
                            </div>
                            <div>
                                <h1 className="text-lg md:text-2xl font-black text-[#4a3426] tracking-tight uppercase leading-tight">
                                    {activeTab === 'suppliers' ? 'Fournisseurs' : 'Catégories'}
                                </h1>
                                <p className="text-[8px] md:text-xs text-[#8c8279] font-bold uppercase tracking-widest mt-1 opacity-60">
                                    {activeTab === 'suppliers' ? 'Gestion des Partenaires' : 'Gestion des divers'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11 bg-white border border-[#e6dace] rounded-2xl text-[11px] font-bold text-[#4a3426] outline-none focus:border-[#c69f6e] pl-11 pr-4 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-[#c69f6e] text-white h-11 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-[#c69f6e]/20 hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
                        </button>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-4 md:px-8 mt-6 md:mt-10">
                    {/* Tabs Navigation */}
                    <div className="flex gap-2 mb-8 bg-white/50 p-1.5 rounded-2xl border border-[#e6dace]/50 w-max">
                        <button
                            onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
                            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'suppliers' ? 'bg-white text-[#4a3426] shadow-sm ring-1 ring-[#e6dace]' : 'text-[#8c8279] hover:text-[#4a3426]'}`}
                        >
                            Fournisseurs
                        </button>
                        <button
                            onClick={() => { setActiveTab('designations'); setSearchTerm(''); }}
                            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'designations' ? 'bg-white text-[#4a3426] shadow-sm ring-1 ring-[#e6dace]' : 'text-[#8c8279] hover:text-[#4a3426]'}`}
                        >
                            divers
                        </button>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-5 rounded-3xl luxury-shadow border border-[#e6dace]/50">
                            <p className="text-[#8c8279] text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">Total {activeTab === 'suppliers' ? 'Partner' : 'Cat'}</p>
                            <h3 className="text-2xl font-black text-[#4a3426]">{items.length}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-3xl luxury-shadow border border-[#e6dace]/50 hidden md:block">
                            <p className="text-[#8c8279] text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">Filtré</p>
                            <h3 className="text-2xl font-black text-[#c69f6e]">{filteredItems.length}</h3>
                        </div>
                        <div className="bg-[#f0faf5] p-5 rounded-3xl border border-[#d1fae5] col-span-2">
                            <p className="text-[#2d6a4f] text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">Status Système</p>
                            <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                                <CheckCircle2 size={16} />
                                <span>Synchronisation Cloud Active</span>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50 overflow-hidden mb-20">
                        <div className="px-8 py-5 border-b border-[#e6dace] bg-[#fcfaf8] flex justify-between items-center">
                            <h3 className="text-sm font-bold text-[#4a3426] uppercase tracking-wider">
                                {activeTab === 'suppliers' ? 'Base de données Fournisseurs' : 'Liste des Désignations'}
                            </h3>
                            <span className="text-[10px] font-bold text-[#8c8279]">{filteredItems.length} Entrées</span>
                        </div>

                        {isLoading && items.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-[#8c8279] gap-4">
                                <Loader2 className="animate-spin text-[#c69f6e]" size={30} />
                                <p className="font-bold text-xs uppercase tracking-widest">Initialisation...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-[#8c8279] gap-4">
                                <div className="bg-[#f4ece4] p-6 rounded-3xl">
                                    <Search size={40} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold">Aucun résultat</p>
                                    <p className="text-xs opacity-60">Ajustez votre recherche ou ajoutez un nouvel élément.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 divide-y divide-[#f4ece4]">
                                {filteredItems.map((item: any) => (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        key={item.id}
                                        className="group flex items-center justify-between p-5 md:p-6 hover:bg-[#fcfaf8] transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#f4ece4] rounded-2xl flex items-center justify-center text-[#c69f6e] font-black group-hover:bg-[#4a3426] group-hover:text-white transition-all text-lg md:text-xl">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[#4a3426] text-base md:text-lg group-hover:text-[#c69f6e] transition-colors">{item.name}</h4>
                                                <span className="text-[9px] font-black text-[#8c8279] uppercase tracking-tighter bg-gray-100 px-2 py-0.5 rounded">UUID: {item.id}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                                            {activeTab === 'suppliers' && (
                                                <button
                                                    onClick={() => router.push(`/facturation?supplier=${encodeURIComponent(item.name)}`)}
                                                    className="p-2.5 text-[#8c8279] hover:text-[#4a3426] hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#e6dace]"
                                                    title="Voir facturation"
                                                >
                                                    <LayoutDashboard size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingItem({ id: item.id, name: item.name, type: activeTab === 'suppliers' ? 'supplier' : 'designation' });
                                                    setEditName(item.name);
                                                }}
                                                className="p-2.5 text-[#8c8279] hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent"
                                                title="Modifier"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id, item.name)}
                                                className="p-2.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#4a3426]/40 backdrop-blur-sm"
                            onClick={() => setIsAdding(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-[#f4ece4] flex justify-between items-center">
                                <h3 className="text-xl font-bold text-[#4a3426]">
                                    Ajouter {activeTab === 'suppliers' ? 'un Fournisseur' : 'une Désignation'}
                                </h3>
                                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-[#f4ece4] rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddItem} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[#8c8279] uppercase tracking-widest ml-1">
                                        Nom {activeTab === 'suppliers' ? 'du Fournisseur' : 'de la Désignation'}
                                    </label>
                                    <div className="relative">
                                        {activeTab === 'suppliers' ? (
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={20} />
                                        ) : (
                                            <Bookmark className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={20} />
                                        )}
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder={activeTab === 'suppliers' ? "Ex: Steg, Coca Cola..." : "Ex: Fruits, Transit..."}
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            className="w-full h-14 bg-[#f8f5f2] border-2 border-transparent focus:border-[#c69f6e]/30 focus:bg-white rounded-2xl pl-12 pr-4 outline-none font-bold text-[#4a3426] transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] text-[#8c8279] italic px-1">Le système vérifiera automatiquement les doublons.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={addingSupplier || addingDesignation || !newItemName.trim()}
                                    className="w-full h-14 bg-[#4a3426] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#4a3426]/20 hover:bg-[#2d241e] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {(addingSupplier || addingDesignation) ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                    Confirmer
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingItem && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#4a3426]/40 backdrop-blur-sm"
                            onClick={() => setEditingItem(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-[#f4ece4] flex justify-between items-center">
                                <h3 className="text-xl font-bold text-[#4a3426]">
                                    Modifier
                                </h3>
                                <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-[#f4ece4] rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateItem} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[#8c8279] uppercase tracking-widest ml-1">Nouveau nom</label>
                                    <div className="relative">
                                        <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={20} />
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full h-14 bg-[#f8f5f2] border-2 border-transparent focus:border-[#c69f6e]/30 focus:bg-white rounded-2xl pl-12 pr-4 outline-none font-bold text-[#4a3426] transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={updatingSupplier || updatingDesignation || !editName.trim()}
                                    className="w-full h-14 bg-[#c69f6e] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#c69f6e]/20 hover:bg-[#b08d5d] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {(updatingSupplier || updatingDesignation) ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                                    Enregistrer
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notifications */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-10 left-0 right-0 mx-auto w-max z-[80] px-8 py-4 rounded-3xl font-bold shadow-2xl flex items-center gap-3 border ${toast.type === 'success'
                            ? 'bg-[#1b4332] text-white border-green-400/20'
                            : 'bg-red-900/90 text-white border-red-500/20 backdrop-blur-md'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="text-green-400" /> : <AlertCircle className="text-red-400" />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
