'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    LayoutDashboard, Loader2, Calendar,
    Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Coins, Receipt, Calculator,
    Plus, Zap, Sparkles, Search, ChevronLeft, ChevronRight, ChevronDown, X, Eye, EyeOff, Truck, Download, Clock, Filter, RotateCcw, FileText, ZoomIn, ZoomOut, Maximize2, RotateCw, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useRef } from 'react';
import HistoryModal from '@/components/HistoryModal';

// --- Premium Date Picker Component ---
const PremiumDatePicker = ({ value, onChange, label, align = 'left' }: { value: string, onChange: (val: string) => void, label: string, align?: 'left' | 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const days = [];
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < offset; i++) days.push(null);
        const lastDay = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) days.push(new Date(year, month, i));
        return days;
    }, [viewDate]);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const openUp = window.innerHeight - rect.bottom < 350;
            setCoords({
                top: openUp ? rect.top - 340 : rect.bottom + 12,
                left: align === 'right' ? rect.right - 320 : rect.left
            });
        }
    }, [isOpen, align]);

    const CalendarPopup = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999]">
                    <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ top: coords.top, left: coords.left }}
                        className="fixed bg-white rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-[#e6dace] p-6 w-[320px]"
                    >
                        <div className="flex justify-between items-center mb-6 px-1">
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2.5 hover:bg-[#fcfaf8] rounded-2xl text-[#c69f6e] transition-colors"><ChevronLeft size={20} /></button>
                            <span className="text-sm font-black text-[#4a3426] uppercase tracking-[0.1em] text-center flex-1">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2.5 hover:bg-[#fcfaf8] rounded-2xl text-[#c69f6e] transition-colors"><ChevronRight size={20} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-3 text-center">
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[10px] font-black text-[#bba282] uppercase tracking-widest opacity-40">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {daysInMonth.map((day, i) => {
                                if (!day) return <div key={`empty-${i}`} />;
                                const y = day.getFullYear();
                                const m = String(day.getMonth() + 1).padStart(2, '0');
                                const d = String(day.getDate()).padStart(2, '0');
                                const dStr = `${y}-${m}-${d}`;
                                const isSelected = value === dStr;
                                return (
                                    <button key={i} type="button"
                                        onClick={() => { onChange(dStr); setIsOpen(false); }}
                                        className={`h-10 w-10 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center relative
                                            ${isSelected ? `bg-[#c69f6e] text-white shadow-lg shadow-[#c69f6e]/30` : `text-[#4a3426] hover:bg-[#fcfaf8] border border-transparent hover:border-[#e6dace]`}`}
                                    >
                                        {day.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    const formatDateToDisplay = (dateStr: string) => {
        if (!dateStr) return 'JJ/MM/AAAA';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 sm:gap-3 bg-white hover:bg-[#fcfaf8] border border-[#e6dace] rounded-2xl px-3 sm:px-4 py-1.5 h-10 sm:h-12 transition-all w-full sm:w-auto md:w-44 group shadow-sm hover:border-[#c69f6e]`}
            >
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#c69f6e]/10 flex items-center justify-center text-[#c69f6e] flex-shrink-0`}>
                    <Calendar size={12} className="sm:hidden" strokeWidth={2.5} />
                    <Calendar size={14} className="hidden sm:block" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start overflow-hidden min-w-0">
                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-[#bba282] opacity-60 leading-none mb-0.5 sm:mb-1">{label}</span>
                    <span className="text-[10px] sm:text-[11px] font-black text-[#4a3426] tracking-tight truncate leading-none">
                        {formatDateToDisplay(value)}
                    </span>
                </div>
            </button>
            {typeof document !== 'undefined' && createPortal(CalendarPopup, document.body)}
        </div>
    );
};

const GET_CHIFFRES_MONTHLY = gql`
  query GetChiffresRange($startDate: String!, $endDate: String!) {
    getChiffresByRange(startDate: $startDate, endDate: $endDate) {
      date
      recette_de_caisse
      total_diponce
      diponce
      recette_net
      tpe
      tpe2
      cheque_bancaire
      espaces
      tickets_restaurant
      extra
      primes
      avances_details { id username montant created_at }
      doublages_details { id username montant created_at }
      extras_details { id username montant created_at }
      primes_details { id username montant created_at }
      restes_salaires_details { id username montant nb_jours created_at }
      diponce_divers
      diponce_admin
      offres
      offres_data
    }
  }
`;

const GET_INVOICES = gql`
    query GetInvoices($supplierName: String, $startDate: String, $endDate: String) {
    getInvoices(supplierName: $supplierName, startDate: $startDate, endDate: $endDate) {
      id
      supplier_name
      amount
      date
      photo_url
      photos
      photo_cheque_url
      photo_verso_url
      status
      payment_method
      paid_date
    }
  }
`;

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ role: 'admin' | 'caissier' } | null>(null);
    const [initializing, setInitializing] = useState(true);

    // Default to current month
    const today = new Date();
    const [pickerYear, setPickerYear] = useState(today.getFullYear());
    const [selectedDetail, setSelectedDetail] = useState<{ name: string, type: 'fournisseur' | 'divers' | 'administratif' } | null>(null);
    const [viewingData, setViewingData] = useState<any | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<{ isOpen: boolean, type: string, targetName?: string } | null>(null);
    const [hideRecetteCaisse, setHideRecetteCaisse] = useState(false);
    const [hideTotalExpenses, setHideTotalExpenses] = useState(false);
    const [hideTotalSalaries, setHideTotalSalaries] = useState(false);
    const [hideMonthlySummary, setHideMonthlySummary] = useState(false);
    const [isOffresExpanded, setIsOffresExpanded] = useState(false);
    const [imgZoom, setImgZoom] = useState(1);
    const [imgRotation, setImgRotation] = useState(0);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const imageContainerRef = useRef(null);

    const resetView = () => {
        setImgZoom(1);
        setImgRotation(0);
    };

    useEffect(() => {
        if (!viewingData) resetView();
    }, [viewingData]);

    // Filter dates
    const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const endOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [startDate, setStartDate] = useState(startOfMonth);
    const [endDate, setEndDate] = useState(endOfMonth);

    // Search filters for each category
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    useEffect(() => {
        const savedUser = localStorage.getItem('bb_user');
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed.role !== 'admin') {
                router.replace('/');
                return;
            } else {
                setUser(parsed);
            }
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

    const dateRange = useMemo(() => {
        return { start: startDate, end: endDate };
    }, [startDate, endDate]);

    const { data, loading } = useQuery(GET_CHIFFRES_MONTHLY, {
        variables: { startDate: dateRange.start, endDate: dateRange.end },
        skip: !dateRange.start
    });

    const aggregates = useMemo(() => {
        if (!data?.getChiffresByRange) return null;

        const base = data.getChiffresByRange.reduce((acc: any, curr: any) => {
            return {
                recette_de_caisse: acc.recette_de_caisse + parseFloat(curr.recette_de_caisse || '0'),
                total_diponce: acc.total_diponce + parseFloat(curr.total_diponce || '0'),
                recette_net: acc.recette_net + parseFloat(curr.recette_net || '0'),
                tpe: acc.tpe + parseFloat(curr.tpe || '0') + parseFloat(curr.tpe2 || '0'),
                cheque_bancaire: acc.cheque_bancaire + parseFloat(curr.cheque_bancaire || '0'),
                espaces: acc.espaces + parseFloat(curr.espaces || '0'),
                tickets_restaurant: acc.tickets_restaurant + parseFloat(curr.tickets_restaurant || '0'),
                extra: acc.extra + parseFloat(curr.extra || '0'),
                primes: acc.primes + parseFloat(curr.primes || '0'),
                offres: acc.offres + parseFloat(curr.offres || '0'),

                // Accumulate details
                // Accumulate details with date injection
                allExpenses: [...acc.allExpenses, ...JSON.parse(curr.diponce || '[]').map((i: any) => ({ ...i, date: curr.date, drillName: i.supplier }))],
                allAvances: [...acc.allAvances, ...curr.avances_details.map((i: any) => ({ ...i, date: curr.date }))],
                allDoublages: [...acc.allDoublages, ...curr.doublages_details.map((i: any) => ({ ...i, date: curr.date }))],
                allExtras: [...acc.allExtras, ...curr.extras_details.map((i: any) => ({ ...i, date: curr.date }))],
                allPrimes: [...acc.allPrimes, ...curr.primes_details.map((i: any) => ({ ...i, date: curr.date }))],
                allRestesSalaires: [...acc.allRestesSalaires, ...curr.restes_salaires_details.map((i: any) => ({ ...i, date: curr.date }))],
                allDivers: [...acc.allDivers, ...JSON.parse(curr.diponce_divers || '[]').map((i: any) => ({ ...i, date: curr.date, drillName: i.designation }))],
                allAdmin: [...acc.allAdmin, ...JSON.parse(curr.diponce_admin || '[]').map((i: any) => ({ ...i, date: curr.date, drillName: i.designation }))],
                allOffres: [...acc.allOffres, ...JSON.parse(curr.offres_data || '[]').map((i: any) => ({ ...i, date: curr.date, drillName: i.name }))],
            };
        }, {
            recette_de_caisse: 0, total_diponce: 0, recette_net: 0,
            tpe: 0, cheque_bancaire: 0, espaces: 0, tickets_restaurant: 0,
            extra: 0, primes: 0, offres: 0,
            allExpenses: [], allAvances: [], allDoublages: [], allExtras: [], allPrimes: [], allRestesSalaires: [],
            allDivers: [], allAdmin: [], allOffres: []
        });

        // Grouping function
        const aggregateGroup = (list: any[], nameKey: string, amountKey: string) => {
            const map = new Map();
            list.forEach(item => {
                const name = item[nameKey];
                if (!name) return;
                const amt = parseFloat(item[amountKey] || '0');
                map.set(name, (map.get(name) || 0) + amt);
            });
            return Array.from(map.entries())
                .map(([name, amount]) => ({ name, amount }))
                .filter(x => x.amount > 0)
                .sort((a, b) => b.amount - a.amount);
        };

        const filterByName = (list: any[]) => {
            if (!searchQuery) return list;
            return list.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        };

        const groupedExpenses = filterByName(aggregateGroup(base.allExpenses, 'supplier', 'amount'));
        const groupedDivers = filterByName(aggregateGroup(base.allDivers, 'designation', 'amount'));
        const groupedAdmin = filterByName(aggregateGroup(base.allAdmin, 'designation', 'amount'));
        const groupedOffres = filterByName(aggregateGroup(base.allOffres, 'name', 'amount'));

        const groupedAvances = filterByName(aggregateGroup(base.allAvances, 'username', 'montant'));
        const groupedDoublages = filterByName(aggregateGroup(base.allDoublages, 'username', 'montant'));
        const groupedExtras = filterByName(aggregateGroup(base.allExtras, 'username', 'montant'));
        const groupedPrimes = filterByName(aggregateGroup(base.allPrimes, 'username', 'montant'));
        const groupedRestesSalaires = filterByName(aggregateGroup(base.allRestesSalaires, 'username', 'montant'));

        const totalGeneralExpenses =
            groupedExpenses.reduce((a: number, b: any) => a + b.amount, 0) +
            groupedDivers.reduce((a: number, b: any) => a + b.amount, 0) +
            groupedAdmin.reduce((a: number, b: any) => a + b.amount, 0);

        const totalEmployeeExpenses =
            groupedAvances.reduce((a: number, b: any) => a + b.amount, 0) +
            groupedDoublages.reduce((a: number, b: any) => a + b.amount, 0) +
            groupedExtras.reduce((a: number, b: any) => a + b.amount, 0) +
            groupedPrimes.reduce((a: number, b: any) => a + b.amount, 0) +
            groupedRestesSalaires.reduce((a: number, b: any) => a + b.amount, 0);

        const totalOffres = groupedOffres.reduce((a: number, b: any) => a + b.amount, 0);

        return {
            ...base,
            offres: totalOffres, // Override base.offres with accurate sum from details
            groupedExpenses, groupedDivers, groupedAdmin, groupedOffres,
            groupedAvances, groupedDoublages, groupedExtras, groupedPrimes, groupedRestesSalaires,
            totalGeneralExpenses, totalEmployeeExpenses
        };
    }, [data, searchQuery]);

    // Query for selected supplier invoices
    const { data: invoiceData, loading: loadingInvoices } = useQuery(GET_INVOICES, {
        variables: {
            supplierName: (selectedDetail?.type === 'fournisseur' ? selectedDetail.name : undefined),
            startDate: dateRange.start,
            endDate: dateRange.end
        },
        skip: !selectedDetail || selectedDetail.type !== 'fournisseur'
    });

    if (initializing || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
            <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
        </div>
    );

    const monthDisplay = new Date(dateRange.start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <div className="flex min-h-screen bg-[#fdfbf7]">
            <Sidebar role={user.role} />

            <div className="flex-1 min-w-0">
                <header className={`sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#e6dace] py-3 md:py-6 px-4 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 md:gap-4 transition-all z-[60]`}>
                    <div className="flex items-center justify-between w-full xl:w-auto">
                        <div className="flex flex-col">
                            <h1 className="text-lg md:text-2xl font-black text-[#4a3426] tracking-tight uppercase leading-tight">Dashboard</h1>
                            <p className="text-[8px] md:text-xs text-[#8c8279] font-bold uppercase tracking-widest mt-1 opacity-60">Analytique & Statistiques</p>
                        </div>

                        {/* Mobile Filter Toggle Button */}
                        <button
                            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                            className="xl:hidden flex items-center justify-center h-10 px-4 rounded-xl bg-[#4a3426] text-white shadow-lg shadow-[#4a3426]/20 transition-all active:scale-95"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mr-2">{mobileFiltersOpen ? 'Fermer' : 'Filtres'}</span>
                            <motion.div
                                animate={{ rotate: mobileFiltersOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown size={14} />
                            </motion.div>
                        </button>
                    </div>

                    <div className={`flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto ${mobileFiltersOpen ? 'flex animate-slide-up' : 'hidden xl:flex'}`}>
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher un élément..."
                                value={searchQuery ?? ''}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-white border border-[#e6dace] rounded-2xl text-[11px] font-bold text-[#4a3426] outline-none focus:border-[#c69f6e] focus:ring-4 focus:ring-[#c69f6e]/10 transition-all pl-12 pr-4 shadow-sm"
                            />
                        </div>

                        {/* PÉRIODE SELECTION */}
                        <div className="flex items-center gap-2 bg-[#fcfaf8] p-1.5 rounded-2xl border border-[#e6dace] shadow-inner w-full sm:w-auto">
                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-none">
                                    <PremiumDatePicker label="DÉBUT" value={startDate} onChange={setStartDate} />
                                </div>
                                <div className="text-[#e6dace] font-black text-[10px] opacity-40 px-1 hidden sm:block">/</div>
                                <div className="flex-1 sm:flex-none">
                                    <PremiumDatePicker label="FIN" value={endDate} onChange={setEndDate} align="right" />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setStartDate(startOfMonth);
                                    setEndDate(endOfMonth);
                                }}
                                className="w-10 h-10 rounded-xl bg-white border border-[#e6dace] flex items-center justify-center text-[#c69f6e] hover:bg-[#c69f6e] hover:text-white transition-all shadow-sm group flex-shrink-0"
                                title="Ce mois"
                            >
                                <RotateCcw size={16} className="group-active:rotate-180 transition-transform" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-4 md:px-6 mt-6 md:mt-8 pb-20">
                    {loading ? (
                        <div className="py-40 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-[#c69f6e]" size={50} />
                            <p className="font-bold text-[#8c8279] animate-pulse">Calcul des statistiques du mois...</p>
                        </div>
                    ) : aggregates ? (
                        <div className="space-y-12">
                            {/* 1. Recette De Caisse (Hero) */}
                            <section className="bg-[#f0faf5] rounded-[2.5rem] p-6 md:p-10 lg:p-12 luxury-shadow border border-[#d1fae5] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10 md:gap-16 lg:gap-20 relative z-10 w-full max-w-5xl mx-auto">
                                    <div className="text-center md:text-left flex flex-col gap-1">
                                        <div className="text-[#2d6a4f] text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-40">Performance du mois</div>
                                        <div className="text-3xl md:text-4xl lg:text-5xl font-black text-[#2d6a4f] leading-none tracking-tighter capitalize">
                                            Période Sélectionnée
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center md:items-end w-full">
                                        <div className="bg-white/40 md:bg-transparent p-6 md:p-0 rounded-[2rem] border border-white md:border-transparent w-full md:w-auto">
                                            <div className="flex items-center justify-center md:justify-end gap-2 mb-2 text-[#8c8279]">
                                                <Wallet size={16} className="text-[#2d6a4f]" strokeWidth={2.5} />
                                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#4a3426]">Recette Caisse Cumulée</span>
                                                <button
                                                    onClick={() => setHideRecetteCaisse(!hideRecetteCaisse)}
                                                    className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors text-[#bba282]"
                                                >
                                                    {hideRecetteCaisse ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                            <div className="flex items-baseline justify-center md:justify-end gap-2 flex-wrap">
                                                {hideRecetteCaisse ? (
                                                    <span className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-[#4a3426] tracking-tighter">
                                                        ********
                                                    </span>
                                                ) : (
                                                    <span className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-[#4a3426] tracking-tighter">
                                                        {aggregates.recette_de_caisse.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                    </span>
                                                )}
                                                <span className="text-base sm:text-lg md:text-2xl font-black text-[#c69f6e] opacity-60">DT</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* TOTAL OFFRES CARD - TOP SECTION */}
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-[2rem] p-6 luxury-shadow border border-[#e6dace]/50 transition-all"
                            >
                                <div className="flex flex-col">
                                    {/* Header / Summary View */}
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => setIsOffresExpanded(!isOffresExpanded)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#c69f6e]/10 flex items-center justify-center text-[#c69f6e]">
                                                <Tag size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-[#4a3426] uppercase tracking-tight">Offres</h3>
                                                {!isOffresExpanded && (
                                                    <div className="flex items-baseline gap-2 mt-1">
                                                        <span className="text-xl font-black text-[#4a3426]">{aggregates.offres.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                        <span className="text-xs font-bold text-[#c69f6e]">DT</span>
                                                    </div>
                                                )}
                                                {isOffresExpanded && (
                                                    <p className="text-[10px] font-black text-[#bba282] uppercase tracking-[0.2em]">Montant cumulé des offres</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full transition-transform duration-300 ${isOffresExpanded ? 'rotate-180 bg-[#c69f6e]/10 text-[#c69f6e]' : 'text-[#bba282]'}`}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    <AnimatePresence>
                                        {isOffresExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pt-6 border-t border-[#e6dace]/50 mt-4 space-y-4">
                                                    <div
                                                        className="flex justify-between items-center bg-[#fcfaf8] p-3 rounded-2xl border border-[#e6dace]/50 hover:bg-[#f0faf5] hover:border-[#2d6a4f]/30 transition-all cursor-pointer group/total"
                                                        onClick={() => setShowHistoryModal({ isOpen: true, type: 'offres' })}
                                                    >
                                                        <span className="text-xs font-black text-[#8c8279] uppercase tracking-widest pl-2 group-hover/total:text-[#2d6a4f]">Total Offres Cumulées</span>
                                                        <span className="text-2xl font-black text-[#4a3426]">{aggregates.offres.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-sm text-[#c69f6e]">DT</span></span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {aggregates.groupedOffres.map((p: any, i: number) => (
                                                            <div
                                                                key={i}
                                                                className="flex justify-between items-center p-3 bg-[#fcfaf8] rounded-2xl border border-transparent hover:border-[#c69f6e]/30 hover:bg-white transition-all cursor-pointer group"
                                                                onClick={() => setShowHistoryModal({ isOpen: true, type: 'offres', targetName: p.name })}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-xl bg-[#2d6a4f] text-white flex items-center justify-center text-sm font-bold">
                                                                        {p.name.charAt(0)}
                                                                    </div>
                                                                    <span className="font-bold text-[#4a3426] group-hover:text-[#2d6a4f] transition-colors">{p.name}</span>
                                                                </div>
                                                                <span className="font-black text-[#2d6a4f] text-sm">{p.amount.toFixed(3)} <span className="text-xs text-[#c69f6e]">DT</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.section>

                            {/* 2. Unified Grid for All Expense Categories */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                {/* LEFT COLUMN: General Expenses */}
                                <div className="space-y-6">

                                    {/* 1.2 Dépenses Fournisseur */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('fournisseurs')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#4a3426]/10 flex items-center justify-center text-[#4a3426]">
                                                    <Truck size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Dépenses Fournisseurs</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Marchandises & Services</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedExpenses.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['fournisseurs'] ? 180 : 0 }} className="text-[#4a3426]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['fournisseurs'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedExpenses.length > 0 ? aggregates.groupedExpenses.map((a: any, i: number) => (
                                                            <button key={i} onClick={() => setSelectedDetail({ name: a.name, type: 'fournisseur' })} className="w-full flex justify-between items-center p-3 bg-[#fcfaf8] rounded-xl border border-[#e6dace]/30 group hover:bg-[#4a3426] transition-all">
                                                                <span className="font-bold text-[#4a3426] text-sm group-hover:text-white transition-colors truncate max-w-[60%]">{a.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-[#4a3426] group-hover:text-white transition-colors">{a.amount.toFixed(3)}</span>
                                                                    <Eye size={12} className="text-[#c69f6e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </button>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 1.3 Dépenses Divers */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('divers')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#c69f6e]/10 flex items-center justify-center text-[#c69f6e]">
                                                    <Sparkles size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Dépenses Divers</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Frais Exceptionnels</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedDivers.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['divers'] ? 180 : 0 }} className="text-[#c69f6e]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['divers'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedDivers.length > 0 ? aggregates.groupedDivers.map((a: any, i: number) => (
                                                            <button key={i} onClick={() => setSelectedDetail({ name: a.name, type: 'divers' })} className="w-full flex justify-between items-center p-3 bg-[#fcfaf8] rounded-xl border border-[#e6dace]/30 group hover:bg-[#4a3426] hover:border-[#4a3426] transition-all">
                                                                <span className="font-bold text-[#4a3426] text-sm group-hover:text-white transition-colors truncate max-w-[60%]">{a.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-[#4a3426] group-hover:text-white transition-colors">{a.amount.toFixed(3)}</span>
                                                                    <Eye size={12} className="text-[#c69f6e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </button>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 1.4 Dépenses Administratif */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('administratif')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#4a3426]/10 flex items-center justify-center text-[#4a3426]">
                                                    <LayoutDashboard size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Dépenses Administratif</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Loyers, Factures & Bur.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedAdmin.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['administratif'] ? 180 : 0 }} className="text-[#4a3426]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['administratif'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedAdmin.length > 0 ? aggregates.groupedAdmin.map((a: any, i: number) => (
                                                            <button key={i} onClick={() => setSelectedDetail({ name: a.name, type: 'administratif' })} className="w-full flex justify-between items-center p-3 bg-[#fcfaf8] rounded-xl border border-[#e6dace]/30 group hover:bg-[#4a3426] hover:border-[#4a3426] transition-all">
                                                                <span className="font-bold text-[#4a3426] text-sm group-hover:text-white transition-colors truncate max-w-[60%]">{a.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-[#4a3426] group-hover:text-white transition-colors">{a.amount.toFixed(3)}</span>
                                                                    <Eye size={12} className="text-[#c69f6e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </button>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* TOTAL EXPENSES CARD */}
                                    <div className="bg-[#4a3426] rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                        <div className="flex justify-between items-end relative z-10">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#c69f6e]">Total Dépenses</h3>
                                                    <button
                                                        onClick={() => setHideTotalExpenses(!hideTotalExpenses)}
                                                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-[#c69f6e]"
                                                    >
                                                        {hideTotalExpenses ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] opacity-60 mt-1 uppercase tracking-wide">Fournisseurs + Divers + Admin</p>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                {hideTotalExpenses ? (
                                                    <span className="text-4xl lg:text-5xl font-black tracking-tighter">********</span>
                                                ) : (
                                                    <span className="text-4xl lg:text-5xl font-black tracking-tighter">{aggregates.totalGeneralExpenses.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                )}
                                                <span className="text-lg font-bold text-[#c69f6e]">DT</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Employee Expenses */}
                                <div className="space-y-6">
                                    {/* 2.1 Accompte */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('accompte')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#a89284]/10 flex items-center justify-center text-[#a89284]">
                                                    <Calculator size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Accompte</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Avances sur salaires</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedAvances.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['accompte'] ? 180 : 0 }} className="text-[#a89284]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['accompte'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedAvances.length > 0 ? aggregates.groupedAvances.map((a: any, i: number) => (
                                                            <div key={i} onClick={() => setShowHistoryModal({ isOpen: true, type: "avance", targetName: a.name })} className="cursor-pointer flex justify-between items-center p-3 bg-[#f9f6f2] rounded-xl border border-transparent">
                                                                <span className="font-medium text-[#4a3426] text-sm opacity-70 hover:underline">{a.name}</span>
                                                                <b className="font-black text-[#4a3426]">{a.amount.toFixed(3)}</b>
                                                            </div>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 2.2 Doublage */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('doublage')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#4a3426]/10 flex items-center justify-center text-[#4a3426]">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Doublage</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Heures supplémentaires</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedDoublages.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['doublage'] ? 180 : 0 }} className="text-[#4a3426]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['doublage'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedDoublages.length > 0 ? aggregates.groupedDoublages.map((a: any, i: number) => (
                                                            <div key={i} onClick={() => setShowHistoryModal({ isOpen: true, type: "doublage", targetName: a.name })} className="cursor-pointer flex justify-between items-center p-3 bg-[#f9f6f2] rounded-xl border border-transparent">
                                                                <span className="font-medium text-[#4a3426] text-sm opacity-70 hover:underline">{a.name}</span>
                                                                <b className="font-black text-[#4a3426]">{a.amount.toFixed(3)}</b>
                                                            </div>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 2.3 Extra */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('extra')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#c69f6e]/10 flex items-center justify-center text-[#c69f6e]">
                                                    <Zap size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Extra</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Main d'œuvre occasionnelle</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedExtras.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['extra'] ? 180 : 0 }} className="text-[#c69f6e]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['extra'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedExtras.length > 0 ? aggregates.groupedExtras.map((a: any, i: number) => (
                                                            <div key={i} onClick={() => setShowHistoryModal({ isOpen: true, type: "extra", targetName: a.name })} className="cursor-pointer flex justify-between items-center p-3 bg-[#f9f6f2] rounded-xl border border-transparent">
                                                                <span className="font-medium text-[#4a3426] text-sm opacity-70 hover:underline">{a.name}</span>
                                                                <b className="font-black text-[#4a3426]">{a.amount.toFixed(3)}</b>
                                                            </div>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 2.4 Primes */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('primes')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#2d6a4f]/10 flex items-center justify-center text-[#2d6a4f]">
                                                    <Sparkles size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Primes</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Récompenses & Bonus</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedPrimes.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['primes'] ? 180 : 0 }} className="text-[#2d6a4f]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['primes'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedPrimes.length > 0 ? aggregates.groupedPrimes.map((a: any, i: number) => (
                                                            <div key={i} onClick={() => setShowHistoryModal({ isOpen: true, type: "prime", targetName: a.name })} className="cursor-pointer flex justify-between items-center p-3 bg-[#f9f6f2] rounded-xl border border-transparent">
                                                                <span className="font-medium text-[#4a3426] text-sm opacity-70 hover:underline">{a.name}</span>
                                                                <b className="font-black text-[#4a3426]">{a.amount.toFixed(3)}</b>
                                                            </div>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 2.5 Restes Salaires */}
                                    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                        <button onClick={() => toggleSection('restesSalaires')} className="flex justify-between items-center w-full text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-[#1e40af]/10 flex items-center justify-center text-[#1e40af]">
                                                    <Wallet size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Restes Salaires</h4>
                                                    <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Salaires Restants</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 md:px-4 py-2 rounded-xl">
                                                    <span className="text-[13px] md:text-sm font-black text-[#4a3426]">{aggregates.groupedRestesSalaires.reduce((a: number, b: any) => a + b.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-[#c69f6e] ml-1">DT</span>
                                                </div>
                                                <motion.div animate={{ rotate: expandedSections['restesSalaires'] ? 180 : 0 }} className="text-[#1e40af]"><ChevronDown size={20} /></motion.div>
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections['restesSalaires'] && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50">
                                                        {aggregates.groupedRestesSalaires.length > 0 ? aggregates.groupedRestesSalaires.map((a: any, i: number) => (
                                                            <div key={i} onClick={() => setShowHistoryModal({ isOpen: true, type: "restes_salaires", targetName: a.name })} className="cursor-pointer flex justify-between items-center p-3 bg-[#f9f6f2] rounded-xl border border-transparent">
                                                                <span className="font-medium text-[#4a3426] text-sm opacity-70 hover:underline">{a.name}</span>
                                                                <b className="font-black text-[#4a3426]">{a.amount.toFixed(3)}</b>
                                                            </div>
                                                        )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40 text-xs">Aucune donnée</div>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* TOTAL EMPLOYEE SALARIES CARD */}
                                    <div className="bg-[#1b4332] rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                        <div className="flex justify-between items-end relative z-10">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#c69f6e]">Total Salaires</h3>
                                                    <button
                                                        onClick={() => setHideTotalSalaries(!hideTotalSalaries)}
                                                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-[#c69f6e]"
                                                    >
                                                        {hideTotalSalaries ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] opacity-60 mt-1 uppercase tracking-wide">Accompte + Doublage + Extra + Primes + Restes Salaires</p>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                {hideTotalSalaries ? (
                                                    <span className="text-4xl lg:text-5xl font-black tracking-tighter">********</span>
                                                ) : (
                                                    <span className="text-4xl lg:text-5xl font-black tracking-tighter">{aggregates.totalEmployeeExpenses.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                                )}
                                                <span className="text-lg font-bold text-[#c69f6e]">DT</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. TOTALS & RÉPARTITION SUMMARY BOX */}
                            <div className="bg-[#1b4332] rounded-[2.5rem] luxury-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                                <div className="p-6 md:p-8 border-b border-white/10 relative z-10 flex flex-col gap-4 md:gap-6 items-start">
                                    <div className="space-y-0.5 w-full text-white">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex items-center gap-2 opacity-70">
                                                <Calculator size={16} />
                                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Dépenses Caisse Mensuelle</span>
                                            </div>
                                            <button
                                                onClick={() => setHideMonthlySummary(!hideMonthlySummary)}
                                                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/70"
                                            >
                                                {hideMonthlySummary ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            {hideMonthlySummary ? (
                                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter">********</span>
                                            ) : (
                                                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter">{aggregates.total_diponce.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</span>
                                            )}
                                            <span className="text-sm md:text-lg font-black opacity-30 uppercase">DT</span>
                                        </div>
                                        <div className="text-[9px] opacity-40 font-medium">
                                            Cumulé sur le mois selectionné
                                        </div>
                                    </div>
                                    <div className="w-full pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-2 opacity-70 mb-1 text-white">
                                            <TrendingUp size={18} />
                                            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Recette Nette</span>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            {hideMonthlySummary ? (
                                                <span className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none transition-all duration-500 text-[#c69f6e]`}>
                                                    ********
                                                </span>
                                            ) : (
                                                <span className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none transition-all duration-500 ${aggregates.recette_net >= 0 ? 'text-[#c69f6e]' : 'text-red-400'}`}>
                                                    {aggregates.recette_net.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                </span>
                                            )}
                                            <span className="text-sm md:text-lg font-black opacity-20 text-white uppercase shrink-0">DT</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 relative z-10">
                                    <h3 className="font-bold text-white mb-6 flex items-center gap-2 uppercase text-[10px] tracking-wider opacity-60">
                                        <Receipt size={14} /> Répartition Mensuelle Finale
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'TPE (Carte)', icon: CreditCard, val: aggregates.tpe },
                                            { label: 'Espèces', icon: Coins, val: aggregates.espaces },
                                            { label: 'Chèque', icon: Banknote, val: aggregates.cheque_bancaire },
                                            { label: 'T. Restaurant', icon: Receipt, val: aggregates.tickets_restaurant }
                                        ].map((m, i) => (
                                            <div key={i} className="bg-white/10 rounded-2xl p-6 border border-white/10">
                                                <div className="flex flex-col mb-4">
                                                    <div className="p-2 rounded-xl bg-white/10 text-white/60 w-fit mb-2"><m.icon size={20} /></div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{m.label}</span>
                                                </div>
                                                <div className="flex items-baseline gap-2 text-white mt-1">
                                                    <div className="text-2xl md:text-3xl font-black tracking-tighter">
                                                        {hideMonthlySummary ? '********' : m.val.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                    </div>
                                                    <div className="text-[10px] font-black opacity-20 uppercase shrink-0">DT</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-40 text-center text-[#8c8279]">
                            <Calculator size={50} className="mx-auto mb-4 opacity-10" />
                            <p className="font-bold">Aucune donnée disponible pour cette période.</p>
                        </div>
                    )}
                </main>

                <HistoryModal
                    isOpen={!!showHistoryModal}
                    onClose={() => setShowHistoryModal(null)}
                    type={showHistoryModal?.type}
                    targetName={showHistoryModal?.targetName}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                />
            </div>

            <AnimatePresence>
                {
                    selectedDetail && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[110] bg-[#1a110a]/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
                            onClick={() => setSelectedDetail(null)}
                        >
                            {/* High-End Fixed Close Button (Top Right of Screen) */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedDetail(null)}
                                className="fixed top-6 right-6 md:top-10 md:right-10 z-[120] w-14 h-14 flex items-center justify-center group active:scale-95"
                            >
                                <div className="absolute inset-0 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-colors shadow-2xl"></div>
                                <X size={32} className="text-white/40 group-hover:text-white transition-colors relative z-10" />
                            </motion.button>

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col relative"
                            >
                                <div className="p-10 md:p-14 bg-[#4a3426] text-white relative flex justify-between items-center shrink-0 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#c69f6e]/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/20 rounded-full blur-[80px] -ml-30 -mb-30 pointer-events-none"></div>

                                    <div className="relative z-10 flex-1">
                                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-white/10 p-4 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-inner">
                                                    {selectedDetail.type === 'fournisseur' ? <Truck size={36} className="text-[#c69f6e]" /> : <Receipt size={36} className="text-[#c69f6e]" />}
                                                </div>
                                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none max-w-[15ch] md:max-w-none">
                                                    {selectedDetail.name}
                                                </h2>
                                            </div>

                                            <div className="hidden md:block h-10 w-px bg-white/10"></div>

                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c69f6e]/80 mb-1">Total Mensuel</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black tracking-tighter text-white">
                                                        {(() => {
                                                            let group = [];
                                                            if (selectedDetail.type === 'fournisseur') group = aggregates?.groupedExpenses;
                                                            else if (selectedDetail.type === 'divers') group = aggregates?.groupedDivers;
                                                            else group = aggregates?.groupedAdmin;
                                                            return group?.find((e: any) => e.name === selectedDetail.name)?.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 });
                                                        })()}
                                                    </span>
                                                    <span className="text-sm font-bold text-[#c69f6e]">DT</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[#c69f6e] animate-pulse"></div>
                                            <p className="text-[11px] text-white/50 font-bold uppercase tracking-[0.2em]">{monthDisplay}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-[#fdfbf7]">
                                    {loadingInvoices && selectedDetail.type === 'fournisseur' ? (
                                        <div className="py-20 flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
                                            <p className="font-bold text-[#8c8279] animate-pulse">Chargement des factures...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {(() => {
                                                let list = [];
                                                if (selectedDetail.type === 'fournisseur') list = aggregates?.allExpenses;
                                                else if (selectedDetail.type === 'divers') list = aggregates?.allDivers;
                                                else list = aggregates?.allAdmin;

                                                return (list || [])
                                                    .filter((e: any) => e.drillName === selectedDetail.name && e.paymentMethod !== 'Prélèvement')
                                                    .map((inv: any, idx: number) => (
                                                        <motion.div
                                                            key={`${inv.invoiceId || 'manual'}-${idx}`}
                                                            whileHover={{ y: -5 }}
                                                            className="bg-white rounded-[2rem] border border-[#e6dace]/50 p-6 relative group overflow-hidden shadow-sm hover:shadow-xl transition-all"
                                                        >
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#c69f6e]/5 rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <div className="space-y-1">
                                                                        <div className="text-[10px] font-black uppercase text-[#8c8279] tracking-widest flex items-center gap-2">
                                                                            <Calendar size={12} className="text-[#c69f6e]" />
                                                                            {inv.date ? new Date(inv.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Sans Date'}
                                                                        </div>
                                                                        <div className="px-2 py-1 rounded-lg text-[8px] font-black uppercase inline-flex items-center gap-1 bg-green-50 text-green-600 border border-green-100">
                                                                            <div className="w-1 h-1 rounded-full bg-green-600"></div>
                                                                            Règlement effectué
                                                                        </div>
                                                                        <div className="mt-1 text-[8px] font-black text-[#8c8279] uppercase tracking-widest bg-[#f9f7f5] px-2 py-0.5 rounded border border-[#e6dace]/30 w-fit">
                                                                            {inv.paymentMethod || 'Espèces'}
                                                                        </div>
                                                                        {inv.details && (
                                                                            <div className="mt-2 text-[10px] text-[#4a3426] font-medium bg-[#fcfaf8] p-2 rounded-lg border border-[#e6dace] flex gap-2 items-start">
                                                                                <Sparkles size={12} className="text-[#c69f6e] mt-0.5 shrink-0" />
                                                                                <span className="italic">"{inv.details}"</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-2xl font-black text-[#4a3426] tracking-tighter leading-none">
                                                                            {parseFloat(inv.amount).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                                        </div>
                                                                        <div className="text-[9px] font-black text-[#c69f6e] uppercase tracking-widest mt-1">DT</div>
                                                                    </div>
                                                                </div>

                                                                {(() => {
                                                                    const hasLegacy = !!(inv.photo_url && inv.photo_url.length > 5);
                                                                    const hasCheque = !!((inv.photo_cheque || inv.photo_cheque_url || '').length > 5 || (inv.photo_verso || inv.photo_verso_url || '').length > 5);
                                                                    const hasGallery = Array.isArray(inv.invoices) && inv.invoices.length > 0;
                                                                    const hasNewPhotos = !!(inv.photos && inv.photos !== '[]' && inv.photos.length > 5);

                                                                    if (hasLegacy || hasCheque || hasGallery || hasNewPhotos) {
                                                                        return (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const normalized = {
                                                                                        ...inv,
                                                                                        photos: Array.isArray(inv.invoices) ? JSON.stringify(inv.invoices) : (inv.photos || '[]'),
                                                                                        photo_cheque_url: inv.photo_cheque || inv.photo_cheque_url,
                                                                                        photo_verso_url: inv.photo_verso || inv.photo_verso_url
                                                                                    };
                                                                                    setViewingData(normalized);
                                                                                }}
                                                                                className="w-full h-12 bg-[#4a3426] hover:bg-[#c69f6e] text-white rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#4a3426]/10 hover:shadow-[#c69f6e]/20"
                                                                            >
                                                                                <Eye size={16} />
                                                                                <span>Justificatifs</span>
                                                                            </button>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div className="w-full h-12 bg-[#f9f7f5] rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#8c8279] border border-dashed border-[#e6dace]">
                                                                            <span>Aucun visuel</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </motion.div>
                                                    ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Viewing Data Modal (Photos) - EXACT LOGIC FROM FACTURATION */}
            <AnimatePresence>
                {
                    viewingData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center overflow-hidden"
                            onClick={() => { setViewingData(null); setSelectedPhotoIndex(0); resetView(); }}
                        >
                            {(() => {
                                let allPhotos: { url: string, label: string }[] = [];
                                try {
                                    const rawPhotos = viewingData.photos;
                                    if (rawPhotos && rawPhotos !== 'null' && rawPhotos !== '[]') {
                                        const parsed = typeof rawPhotos === 'string' ? JSON.parse(rawPhotos) : rawPhotos;
                                        if (Array.isArray(parsed)) {
                                            parsed.forEach((p, i) => allPhotos.push({ url: p, label: `Page ${i + 1}` }));
                                        }
                                    }
                                } catch (e) { }
                                if (viewingData.photo_url && viewingData.photo_url.length > 5 && !allPhotos.find(p => p.url === viewingData.photo_url)) {
                                    allPhotos.unshift({ url: viewingData.photo_url, label: 'Document Principal' });
                                }
                                if (viewingData.photo_cheque_url) {
                                    allPhotos.push({ url: viewingData.photo_cheque_url, label: 'Chèque Recto' });
                                }
                                if (viewingData.photo_verso_url) {
                                    allPhotos.push({ url: viewingData.photo_verso_url, label: 'Chèque Verso' });
                                }

                                const activeIndex = typeof selectedPhotoIndex === 'number' ? selectedPhotoIndex : 0;
                                const activePhoto = allPhotos[activeIndex] || allPhotos[0];

                                return (
                                    <div className="relative w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>

                                        {/* Top Controls */}
                                        <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
                                            <div className="pointer-events-auto">
                                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-8 py-4 rounded-2xl flex items-center gap-6 shadow-2xl">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Détails</span>
                                                        <h2 className="text-2xl font-black text-white tracking-tight leading-none">{selectedDetail?.name || viewingData.supplier_name || 'Document'}</h2>
                                                        <p className="text-[10px] font-medium text-[#c69f6e] mt-1 max-w-xs truncate">
                                                            {allPhotos.length} Document{allPhotos.length > 1 ? 's' : ''} • {viewingData.paymentMethod || viewingData.payment_method || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="w-px h-10 bg-white/10" />
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#c69f6e] mb-1">Montant</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-3xl font-black text-white tracking-tight">
                                                                {parseFloat(viewingData.amount).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                            </span>
                                                            <span className="text-xs font-bold text-[#c69f6e]">DT</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 pointer-events-auto">
                                                <div className="flex bg-white/10 rounded-2xl p-1 gap-1 border border-white/10 backdrop-blur-md">
                                                    <button onClick={() => setImgZoom(prev => Math.max(0.5, prev - 0.25))} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Zoom Arrière"><ZoomOut size={20} /></button>
                                                    <div className="w-16 flex items-center justify-center font-black text-xs tabular-nums text-[#c69f6e]">{Math.round(imgZoom * 100)}%</div>
                                                    <button onClick={() => setImgZoom(prev => Math.min(5, prev + 0.25))} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Zoom Avant"><ZoomIn size={20} /></button>
                                                    <div className="w-px h-6 bg-white/10 self-center mx-1"></div>
                                                    <button onClick={() => setImgRotation(prev => prev + 90)} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Tourner"><RotateCcw size={20} /></button>
                                                    <button onClick={resetView} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Réinitialiser"><Maximize2 size={20} /></button>
                                                </div>
                                                <button onClick={() => { setViewingData(null); setSelectedPhotoIndex(0); resetView(); }} className="w-14 h-14 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full flex items-center justify-center transition-all text-white backdrop-blur-md"><X size={32} /></button>
                                            </div>
                                        </div>

                                        {/* Main Image Area */}
                                        <div ref={imageContainerRef} className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
                                            {allPhotos.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center text-white/20 italic font-bold uppercase tracking-widest gap-4">
                                                    <Truck size={64} className="opacity-50" />
                                                    <span>Aucun document disponible</span>
                                                </div>
                                            ) : activePhoto ? (
                                                <motion.div
                                                    className={`w-full h-full flex items-center justify-center p-4 ${imgZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                                                    onWheel={(e) => {
                                                        if (e.deltaY < 0) setImgZoom(prev => Math.min(5, prev + 0.2));
                                                        else setImgZoom(prev => Math.max(0.5, prev - 0.2));
                                                    }}
                                                    animate={{ scale: imgZoom, rotate: imgRotation }}
                                                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                                    drag={imgZoom > 1}
                                                    dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                                                    dragElastic={0.1}
                                                    dragMomentum={true}
                                                >
                                                    {activePhoto.url?.toLowerCase().includes('.pdf') || activePhoto.url?.startsWith('data:application/pdf') ? (
                                                        <iframe src={activePhoto.url} className="w-[80%] h-[90%] rounded-2xl border-none bg-white shadow-2xl pointer-events-auto" title="Document PDF" />
                                                    ) : (
                                                        <img
                                                            src={activePhoto.url}
                                                            draggable="false"
                                                            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
                                                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                                                        />
                                                    )}
                                                </motion.div>
                                            ) : null}
                                        </div>

                                        {imgZoom !== 1 && (
                                            <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none z-[100]">
                                                <span className="bg-black/80 backdrop-blur-xl text-[10px] font-black text-[#c69f6e] px-6 py-3 rounded-full border border-[#c69f6e]/30 shadow-2xl uppercase tracking-[0.2em]">
                                                    Zoom: {Math.round(imgZoom * 100)}% • Rotation: {imgRotation}°
                                                </span>
                                            </div>
                                        )}

                                        {/* Bottom Thumbnails */}
                                        {allPhotos.length > 0 && (
                                            <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
                                                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center gap-3 overflow-x-auto no-scrollbar max-w-[90vw] pointer-events-auto">
                                                    {allPhotos.map((photo, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                setSelectedPhotoIndex(idx);
                                                                setImgZoom(1);
                                                                setImgRotation(0);
                                                            }}
                                                            className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all flex-shrink-0 border-2 ${idx === activeIndex ? 'border-[#c69f6e] scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'} `}
                                                        >
                                                            {photo.url?.toLowerCase().includes('.pdf') || photo.url?.startsWith('data:application/pdf') ? (
                                                                <div className="w-full h-full bg-white flex items-center justify-center text-red-500 font-bold text-[8px]">PDF</div>
                                                            ) : (
                                                                <img src={photo.url} className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
