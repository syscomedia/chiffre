'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    LayoutDashboard, CheckCircle2, ShoppingBag, AlertCircle, ShoppingCart, TrendingUp, History, User, CreditCard, Banknote, Coins, Receipt, LayoutGrid,
    Calculator, Plus, Zap, Sparkles, Search, ChevronDown, X, Eye, Truck, Download, Clock, Filter, RotateCcw, FileText, Calendar, Loader2,
    ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

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

const GET_CHIFFRES_DATA = gql`
  query GetCoutAchatData($startDate: String!, $endDate: String!) {
    getChiffresByRange(startDate: $startDate, endDate: $endDate) {
      diponce
      diponce_divers
      avances_details {
        montant
      }
      doublages_details {
        montant
      }
      extras_details {
        montant
      }
      primes_details {
        montant
      }
      restes_salaires_details {
        montant
      }
    }
    getInvoices(startDate: $startDate, endDate: $endDate, filterBy: "date") {
      id
      supplier_name
      amount
      date
      status
      payment_method
      paid_date
      payer
      category
      doc_type
      doc_number
      photo_url
      photos
      photo_cheque_url
      photo_verso_url
      coutachat
    }
    getPaymentStats(startDate: $startDate, endDate: $endDate, filterBy: "date") {
      totalRecetteCaisse
      totalExpenses
      totalRecetteNette
      totalRiadhExpenses
      totalTPE
      totalCheque
      totalCash
      totalTicketsRestaurant
    }
  }
`;

export default function CoutAchatPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ role: 'admin' | 'caissier' } | null>(null);
    const [initializing, setInitializing] = useState(true);

    const today = new Date();
    const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const endOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [startDate, setStartDate] = useState(startOfMonth);
    const [endDate, setEndDate] = useState(endOfMonth);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'tous' | 'fournisseur' | 'divers'>('tous');
    const [docTypeFilter, setDocTypeFilter] = useState<'tous' | 'bl' | 'facture'>('tous');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [selectedDetail, setSelectedDetail] = useState<{ name: string, type: 'paid' | 'unpaid' | 'fournisseur' | 'divers' } | null>(null);
    const [viewingData, setViewingData] = useState<any>(null);
    const [imgZoom, setImgZoom] = useState(1);
    const [imgRotation, setImgRotation] = useState(0);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const imageContainerRef = useRef(null);

    const resetView = () => {
        setImgZoom(1);
        setImgRotation(0);
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };


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

    const { data, loading } = useQuery(GET_CHIFFRES_DATA, {
        variables: { startDate, endDate },
        skip: !startDate || !endDate
    });

    const aggregates = useMemo(() => {
        if (!data) return null;

        const allInvoices = data.getInvoices || [];
        const invoices = allInvoices.filter((inv: any) => {
            const p = (inv.payer || '').toString().toLowerCase().trim();
            const isAdmin = p.includes('admin');
            const isRiadh = p.includes('riadh');

            // Apply coutachat condition ONLY for riadh or admin
            if (isAdmin || isRiadh) {
                return inv.coutachat === true;
            }

            // Keep others (caissier, etc.) working as before (included)
            return true;
        });

        const matchesCategory = (item: any) => {
            const cat = (item.category || '').toLowerCase();
            // Strictly exclude administrative costs from this page
            if (cat === 'administratif' || cat === 'admin') return false;

            if (categoryFilter === 'tous') return true;
            if (categoryFilter === 'fournisseur') {
                return cat === '' || cat === 'fournisseur';
            }
            if (categoryFilter === 'divers') {
                return cat.includes('divers');
            }
            return true;
        };
        const matchesDocType = (item: any) => {
            if (docTypeFilter === 'tous') return true;
            const type = (item.doc_type || '').toLowerCase();
            return type === docTypeFilter;
        };

        const base = data.getChiffresByRange.reduce((acc: any, curr: any) => {
            const diponceList = JSON.parse(curr.diponce || '[]');
            const manualExpenses = diponceList
                .filter((e: any) => !e.isFromFacturation && matchesCategory(e) && matchesDocType(e))
                .map((e: any) => ({ ...e, date: curr.date }));

            const diversList = JSON.parse(curr.diponce_divers || '[]')
                .filter((e: any) => !e.isFromFacturation && matchesCategory({ ...e, category: 'Divers' }) && matchesDocType(e))
                .map((e: any) => ({ ...e, date: curr.date }));

            return {
                allExpenses: [...acc.allExpenses, ...manualExpenses],
                allDivers: [...acc.allDivers, ...diversList],
                manualDiversOnly: [...acc.manualDiversOnly, ...diversList.filter((e: any) => !e.isFromFacturation)],
                labor: acc.labor + (categoryFilter === 'tous' ? (
                    (curr.avances_details || []).reduce((s: number, i: any) => s + (parseFloat(i.montant) || 0), 0) +
                    (curr.doublages_details || []).reduce((s: number, i: any) => s + (parseFloat(i.montant) || 0), 0) +
                    (curr.extras_details || []).reduce((s: number, i: any) => s + (parseFloat(i.montant) || 0), 0) +
                    (curr.primes_details || []).reduce((s: number, i: any) => s + (parseFloat(i.montant) || 0), 0) +
                    (curr.restes_salaires_details || []).reduce((s: number, i: any) => s + (parseFloat(i.montant) || 0), 0)
                ) : 0)
            };
        }, {
            allExpenses: [], allDivers: [], manualDiversOnly: [], labor: 0
        });

        const filteredInvoices = invoices.filter((inv: any) => matchesCategory(inv) && matchesDocType(inv));
        const paidInvoices = filteredInvoices.filter((inv: any) => inv.status === 'paid');
        const unpaidInvoices = filteredInvoices.filter((inv: any) => inv.status !== 'paid');

        // Split into Supplier vs Divers for clearer UI separation
        const paidSupplierInvoices = paidInvoices.filter((i: any) => !(i.category || '').toLowerCase().includes('divers'));
        const unpaidSupplierInvoices = unpaidInvoices.filter((i: any) => !(i.category || '').toLowerCase().includes('divers'));

        const paidDiversInvoices = paidInvoices.filter((i: any) => (i.category || '').toLowerCase().includes('divers'));
        const unpaidDiversInvoices = unpaidInvoices.filter((i: any) => (i.category || '').toLowerCase().includes('divers'));

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

        // Merge Facturation Divers into allDivers for unified view
        // Priority: Invoices > Manual
        // User requested ONLY PAID divers in the list
        const mergedDivers = [
            ...base.manualDiversOnly,
            ...paidDiversInvoices.map((i: any) => ({ designation: i.supplier_name, amount: i.amount, isFromFacturation: true, date: i.date }))
        ];

        // Merge Facturation Suppliers into allExpenses for unified view ("Dépenses Fournisseurs")
        const mergedFournisseurs = [
            ...base.allExpenses,
            ...paidSupplierInvoices.map((i: any) => ({ supplier: i.supplier_name, amount: i.amount, isFromFacturation: true, date: i.date }))
        ];

        const topFournisseurs = filterByName(aggregateGroup(mergedFournisseurs, 'supplier', 'amount'));
        const topDivers = filterByName(aggregateGroup(mergedDivers, 'designation', 'amount'));
        const combinedPaid = [
            ...paidInvoices.map((i: any) => ({ ...i, name: i.supplier_name })),
            ...base.allExpenses.map((e: any) => ({ ...e, name: e.supplier, supplier_name: e.supplier, status: 'paid' })),
            ...base.allDivers.map((e: any) => ({ ...e, name: e.designation, supplier_name: e.designation, status: 'paid' }))
        ];
        const combinedUnpaid = unpaidInvoices.map((i: any) => ({ ...i, name: i.supplier_name }));

        const topPaid = filterByName(aggregateGroup(combinedPaid, 'name', 'amount'));
        const topUnpaid = filterByName(aggregateGroup(combinedUnpaid, 'name', 'amount'));

        const totalPaidUnified = topPaid.reduce((a, b) => a + b.amount, 0);
        const totalUnpaidUnified = topUnpaid.reduce((a, b) => a + b.amount, 0);

        // Filter invoices by search query for stats calculation
        const filterInvoiceByName = (inv: any) => {
            if (!searchQuery) return true;
            return (inv.supplier_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        };
        const allPaidInvoicesForStats = paidInvoices.filter(filterInvoiceByName);
        const allUnpaidInvoicesForStats = unpaidInvoices.filter(filterInvoiceByName);

        const stats = {
            facturePaid: allPaidInvoicesForStats.filter((i: any) => (i.doc_type || '').toLowerCase() === 'facture').reduce((a: number, b: any) => a + parseFloat(b.amount || 0), 0),
            factureUnpaid: allUnpaidInvoicesForStats.filter((i: any) => (i.doc_type || '').toLowerCase() === 'facture').reduce((a: number, b: any) => a + parseFloat(b.amount || 0), 0),
            blPaid: allPaidInvoicesForStats.filter((i: any) => (i.doc_type || '').toLowerCase() === 'bl').reduce((a: number, b: any) => a + parseFloat(b.amount || 0), 0),
            blUnpaid: allUnpaidInvoicesForStats.filter((i: any) => (i.doc_type || '').toLowerCase() === 'bl').reduce((a: number, b: any) => a + parseFloat(b.amount || 0), 0),
        };

        // Filter manual items by search query for totals
        const filterExpenseByName = (e: any) => {
            if (!searchQuery) return true;
            return (e.supplier || e.designation || '').toLowerCase().includes(searchQuery.toLowerCase());
        };

        // Calculate totals for divers (only manual divers from diponce_divers, not from facturation)
        const totalDivers = base.manualDiversOnly.filter(filterExpenseByName).reduce((a: number, b: any) => a + parseFloat(b.amount || 0), 0);

        // Calculate totals for direct manual expenses (only from diponce, not facturation)
        const totalDirectManual = base.allExpenses.filter(filterExpenseByName).reduce((a: number, b: any) => a + parseFloat(b.amount || 0), 0);

        return {
            fournisseurs: topFournisseurs,
            divers: topDivers,
            paidInvoices: topPaid,
            unpaidInvoices: topUnpaid,
            rawFournisseurs: base.allExpenses,
            rawDivers: base.allDivers,
            rawPaidInvoices: combinedPaid,
            rawUnpaidInvoices: combinedUnpaid,
            totalPaid: totalPaidUnified,
            totalUnpaid: totalUnpaidUnified,
            totalPaidInvoices: totalPaidUnified,
            totalUnpaidInvoices: totalUnpaidUnified,
            stats,
            totalDirectManual,
            totalDivers,
            totalGlobalConsommation: totalPaidUnified + totalUnpaidUnified
        };
    }, [data, searchQuery, categoryFilter, docTypeFilter]);

    if (initializing || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
            <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#fdfbf7]">
            <Sidebar role={user.role} />

            <div className="flex-1 min-w-0">
                <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-[#e6dace] py-3 md:py-6 px-4 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 xl:gap-8 transition-all">
                    <div className="flex flex-col xl:w-auto shrink-0 gap-3">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col shrink-0">
                                <h1 className="text-lg md:text-2xl font-black text-[#4a3426] tracking-tight uppercase leading-tight xl:whitespace-nowrap">Coût d'achat & Dépenses</h1>
                                <p className="text-[8px] md:text-xs text-[#8c8279] font-bold uppercase tracking-widest mt-1 opacity-60">Analyse détaillée du flux</p>
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

                        {/* Search bar under title for XL (the "problem" device range) */}
                        <div className="hidden xl:flex 2xl:hidden relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-white border border-[#e6dace] rounded-xl text-[11px] font-bold text-[#4a3426] outline-none focus:border-[#c69f6e] pl-11 pr-4 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className={`flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full xl:w-auto ${mobileFiltersOpen ? 'flex animate-slide-up' : 'hidden xl:flex'}`}>
                        <div className="relative flex-1 xl:flex-none">
                            {/* Full search for Mobile and 2XL+, hidden for XL (moved to title group) */}
                            <div className="flex xl:hidden 2xl:flex relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-11 bg-white border border-[#e6dace] rounded-2xl text-[11px] font-bold text-[#4a3426] outline-none focus:border-[#c69f6e] pl-11 pr-4 shadow-sm 2xl:w-64"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex bg-[#fcfaf8] p-1 rounded-2xl border border-[#e6dace] shadow-inner">
                                {[
                                    { id: 'tous', label: 'Tous' },
                                    { id: 'fournisseur', label: 'Fourn.' },
                                    { id: 'divers', label: 'Divers' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setCategoryFilter(tab.id as any)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${categoryFilter === tab.id ? 'bg-[#4a3426] text-white shadow-md' : 'text-[#8c8279]'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex bg-[#fcfaf8] p-1 rounded-2xl border border-[#e6dace] shadow-inner">
                                {[
                                    { id: 'tous', label: 'Tous' },
                                    { id: 'bl', label: 'BL' },
                                    { id: 'facture', label: 'Facture' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setDocTypeFilter(tab.id as any)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${docTypeFilter === tab.id ? 'bg-[#c69f6e] text-white shadow-md' : 'text-[#8c8279]'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-[#fcfaf8] p-1.5 rounded-2xl border border-[#e6dace] shadow-inner">
                            <PremiumDatePicker label="DÉBUT" value={startDate} onChange={setStartDate} />
                            <div className="text-[#e6dace] font-black text-[10px] opacity-40">/</div>
                            <PremiumDatePicker label="FIN" value={endDate} onChange={setEndDate} align="right" />
                            <button
                                onClick={() => { setStartDate(startOfMonth); setEndDate(endOfMonth); }}
                                className="w-10 h-10 rounded-xl bg-white border border-[#e6dace] flex items-center justify-center text-[#c69f6e] hover:bg-[#c69f6e] hover:text-white transition-all shadow-sm group"
                            >
                                <RotateCcw size={16} className="group-active:rotate-180 transition-transform" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8 space-y-8 pb-24">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#c69f6e]">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-xs font-black uppercase tracking-widest opacity-60">Chargement des données...</span>
                        </div>
                    ) : aggregates && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                <div className="bg-[#4a3426] p-5 rounded-[2rem] text-white shadow-xl flex flex-col justify-between min-h-[140px]">
                                    <div className="flex justify-between items-start opacity-60">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><CheckCircle2 size={20} /></div>
                                        <div className="text-[9px] font-black uppercase tracking-widest">achat Payé</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black tracking-tighter">{aggregates.totalPaid.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</div>
                                        <div className="flex flex-col gap-0.5 mt-2 opacity-50">
                                            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest">
                                                <span>Facture:</span>
                                                <span>{aggregates.stats.facturePaid.toFixed(3)}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest">
                                                <span>BL:</span>
                                                <span>{aggregates.stats.blPaid.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-[2rem] border border-red-100 shadow-sm flex flex-col justify-between min-h-[140px]">
                                    <div className="flex justify-between items-start">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={20} /></div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-red-300">achat non payé</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black tracking-tighter text-red-500">{aggregates.totalUnpaid.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</div>
                                        <div className="flex flex-col gap-0.5 mt-2">
                                            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-red-400/60">
                                                <span>Facture:</span>
                                                <span>{aggregates.stats.factureUnpaid.toFixed(3)}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-red-400/60">
                                                <span>BL:</span>
                                                <span>{aggregates.stats.blUnpaid.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden xl:flex bg-white p-5 rounded-[2rem] border border-[#e6dace]/50 shadow-sm flex-col justify-between min-h-[140px]">
                                    <div className="flex justify-between items-start opacity-60">
                                        <div className="w-10 h-10 rounded-xl bg-[#c69f6e]/10 text-[#c69f6e] flex items-center justify-center"><ShoppingBag size={20} /></div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[#8c8279]">Achats Total</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black tracking-tighter text-[#4a3426]">{aggregates.totalGlobalConsommation.toLocaleString('fr-FR', { minimumFractionDigits: 3 })}</div>
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-[#8c8279] mt-1 opacity-60">Total {categoryFilter === 'tous' ? 'Général' : categoryFilter}</p>
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-gradient-to-br from-[#fdfbf7] to-[#f9f6f2] p-5 rounded-[2rem] border border-[#e6dace]/50 shadow-sm flex flex-col justify-between min-h-[140px]">
                                    <div className="flex justify-between items-start">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-[#4a3426]">Détail {categoryFilter.toUpperCase()}</div>
                                        <div className="text-[10px] font-black text-[#c69f6e]">{aggregates.totalGlobalConsommation.toFixed(3)} DT</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                                        <div className="flex justify-between items-center pb-1 border-b border-[#e6dace]/30">
                                            <span className="text-[9px] font-black text-[#8c8279] uppercase">Facturé (Payé)</span>
                                            <span className="text-xs font-black text-[#4a3426]">{aggregates.stats.facturePaid.toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-1 border-b border-[#e6dace]/30">
                                            <span className="text-[9px] font-black text-[#8c8279] uppercase">Facturé (non payé)</span>
                                            <span className="text-xs font-black text-red-500">{aggregates.stats.factureUnpaid.toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-1 border-b border-[#e6dace]/30">
                                            <span className="text-[9px] font-black text-[#8c8279] uppercase">BL (Payé)</span>
                                            <span className="text-xs font-black text-[#4a3426]">{aggregates.stats.blPaid.toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-1 border-b border-[#e6dace]/30">
                                            <span className="text-[9px] font-black text-[#8c8279] uppercase">BL (non payé)</span>
                                            <span className="text-xs font-black text-red-500">{aggregates.stats.blUnpaid.toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-1 border-b border-[#e6dace]/30">
                                            <span className="text-[9px] font-black text-[#8c8279] uppercase">Dép. Directes</span>
                                            <span className="text-xs font-black text-[#4a3426]">{aggregates.totalDirectManual.toFixed(3)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-1 border-b border-[#e6dace]/30">
                                            <span className="text-[9px] font-black text-[#8c8279] uppercase">Dép. Divers</span>
                                            <span className="text-xs font-black text-[#4a3426]">{aggregates.totalDivers.toFixed(3)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 1. Factures Payées */}
                                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                    <button onClick={() => toggleSection('paid')} className="flex justify-between items-center w-full text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-[#2d6a4f]/10 flex items-center justify-center text-[#2d6a4f] text-sm"><CheckCircle2 /></div>
                                            <div>
                                                <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Factures Payées</h4>
                                                <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">Règlements effectués</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 py-2 rounded-xl text-xs font-black text-[#2d6a4f]">
                                                {aggregates.totalPaidInvoices.toFixed(3)} DT
                                            </div>
                                            <motion.div animate={{ rotate: expandedSections['paid'] ? 180 : 0 }} className="text-[#c69f6e]"><ChevronDown size={20} /></motion.div>
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {expandedSections['paid'] && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50 text-xs">
                                                    {aggregates.paidInvoices.length > 0 ? aggregates.paidInvoices.map((a: any, i: number) => (
                                                        <div key={i}
                                                            onClick={() => setSelectedDetail({ name: a.name, type: 'paid' })}
                                                            className="flex justify-between items-center p-3 bg-[#fcfaf8] rounded-xl border border-[#e6dace]/30 cursor-pointer hover:bg-[#c69f6e]/5 transition-colors">
                                                            <span className="font-bold text-[#4a3426] opacity-70">{a.name}</span>
                                                            <span className="font-black text-[#2d6a4f]">{a.amount.toFixed(3)} DT</span>
                                                        </div>
                                                    )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40">Aucun paiement</div>}

                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* 2. Factures Non Payées */}
                                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 luxury-shadow border border-[#e6dace]/50 flex flex-col">
                                    <button onClick={() => toggleSection('unpaid')} className="flex justify-between items-center w-full text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 text-sm"><AlertCircle /></div>
                                            <div>
                                                <h4 className="font-black text-[#4a3426] text-xs uppercase tracking-widest">Factures Non Payées</h4>
                                                <p className="text-[8px] font-bold text-[#8c8279] uppercase tracking-[0.2em] mt-0.5">En attente de paiement</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#fdfbf7] border border-[#e6dace]/40 px-3 py-2 rounded-xl text-xs font-black text-red-500">
                                                {aggregates.totalUnpaidInvoices.toFixed(3)} DT
                                            </div>
                                            <motion.div animate={{ rotate: expandedSections['unpaid'] ? 180 : 0 }} className="text-[#c69f6e]"><ChevronDown size={20} /></motion.div>
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {expandedSections['unpaid'] && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="pt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-2 border-t border-dashed border-[#e6dace]/50 text-xs">
                                                    {aggregates.unpaidInvoices.length > 0 ? aggregates.unpaidInvoices.map((a: any, i: number) => (
                                                        <div key={i}
                                                            onClick={() => setSelectedDetail({ name: a.name, type: 'unpaid' })}
                                                            className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors">
                                                            <span className="font-bold text-[#4a3426] opacity-70">{a.name}</span>
                                                            <span className="font-black text-red-500">{a.amount.toFixed(3)} DT</span>
                                                        </div>
                                                    )) : <div className="py-10 text-center italic text-[#8c8279] opacity-40">Toutes les factures sont payées</div>}

                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                            </div>
                        </>
                    )}
                </main>
            </div>

            <AnimatePresence>
                {selectedDetail && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-[#1a110a]/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
                        onClick={() => setSelectedDetail(null)}
                    >
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
                                <div className="relative z-10 flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/10 p-4 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-inner">
                                                {selectedDetail.type === 'divers' ? <Sparkles size={36} className="text-[#c69f6e]" /> : <Truck size={36} className="text-[#c69f6e]" />}
                                            </div>
                                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none">
                                                {selectedDetail.name}
                                            </h2>
                                        </div>
                                        <div className="hidden md:block h-10 w-px bg-white/10"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c69f6e]/80 mb-1">Total Période</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black tracking-tighter text-white">
                                                    {(() => {
                                                        let group: any[] = [];
                                                        if (selectedDetail.type === 'fournisseur') group = aggregates?.fournisseurs || [];
                                                        else if (selectedDetail.type === 'divers') group = aggregates?.divers || [];
                                                        else if (selectedDetail.type === 'paid') group = aggregates?.paidInvoices || [];
                                                        else if (selectedDetail.type === 'unpaid') group = aggregates?.unpaidInvoices || [];
                                                        return group?.find((e: any) => e.name === selectedDetail.name)?.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 });
                                                    })()}

                                                </span>
                                                <span className="text-sm font-bold text-[#c69f6e]">DT</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#c69f6e] animate-pulse"></div>
                                        <p className="text-[11px] text-white/50 font-bold uppercase tracking-[0.2em]">
                                            Détails du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-[#fdfbf7]">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(() => {
                                        let list: any[] = [];
                                        if (selectedDetail.type === 'paid') list = (aggregates?.rawPaidInvoices || []).filter((i: any) => i.supplier_name === selectedDetail.name);
                                        else if (selectedDetail.type === 'unpaid') list = (aggregates?.rawUnpaidInvoices || []).filter((i: any) => i.supplier_name === selectedDetail.name);
                                        else if (selectedDetail.type === 'fournisseur') list = (aggregates?.rawFournisseurs || []).filter((i: any) => i.supplier === selectedDetail.name);
                                        else if (selectedDetail.type === 'divers') list = (aggregates?.rawDivers || []).filter((i: any) => i.designation === selectedDetail.name);


                                        return (list || [])
                                            .sort((a: any, b: any) => new Date(b.date || b.paid_date).getTime() - new Date(a.date || a.paid_date).getTime())
                                            .map((item: any, idx: number) => (

                                                <motion.div
                                                    key={idx}
                                                    whileHover={{ y: -5 }}
                                                    className="bg-white rounded-[2rem] border border-[#e6dace]/50 p-6 relative group overflow-hidden shadow-sm hover:shadow-xl transition-all"
                                                >
                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] font-black uppercase text-[#8c8279] tracking-widest flex items-center gap-2">
                                                                    <Calendar size={12} className="text-[#c69f6e]" />
                                                                    {new Date(item.date || item.paid_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </div>
                                                                {item.doc_type && (
                                                                    <div className="px-2 py-1 rounded-lg text-[8px] font-black uppercase inline-flex items-center gap-1 bg-[#4a3426]/5 text-[#4a3426] border border-[#4a3426]/10">
                                                                        <FileText size={10} />
                                                                        {item.doc_type} {item.doc_number && `#${item.doc_number}`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={`p-2 rounded-xl text-white shadow-lg ${item.status === 'paid' ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                                                                {item.status === 'paid' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col mb-6">
                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#c69f6e] mb-1">Montant</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-2xl font-black text-[#4a3426] tracking-tighter">
                                                                    {parseFloat(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                                </span>
                                                                <span className="text-[10px] font-black text-[#8c8279]">DT</span>
                                                            </div>
                                                        </div>

                                                        <div className="mb-6">
                                                            {(() => {
                                                                const hasLegacy = !!(item.photo_url && item.photo_url.length > 5);
                                                                const hasCheque = !!((item.photo_cheque || item.photo_cheque_url || '').length > 5 || (item.photo_verso || item.photo_verso_url || '').length > 5);
                                                                const hasGallery = Array.isArray(item.invoices) && item.invoices.length > 0;
                                                                const hasNewPhotos = !!(item.photos && item.photos !== '[]' && item.photos.length > 5);

                                                                if (hasLegacy || hasCheque || hasGallery || hasNewPhotos) {
                                                                    return (
                                                                        <button
                                                                            onClick={() => {
                                                                                const normalized = {
                                                                                    ...item,
                                                                                    photos: Array.isArray(item.invoices) ? JSON.stringify(item.invoices) : (item.photos || '[]'),
                                                                                    photo_cheque_url: item.photo_cheque || item.photo_cheque_url,
                                                                                    photo_verso_url: item.photo_verso || item.photo_verso_url
                                                                                };
                                                                                setViewingData(normalized);
                                                                                resetView();
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

                                                        <div className="pt-4 border-t border-[#e6dace]/50 flex items-center justify-between">

                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-[#fdfbf7] flex items-center justify-center border border-[#e6dace]/50">
                                                                    {item.payment_method === 'Espèces' ? <Coins size={12} className="text-[#c69f6e]" /> : <CreditCard size={12} className="text-[#c69f6e]" />}
                                                                </div>
                                                                <span className="text-[9px] font-bold text-[#8c8279] uppercase">{item.payment_method || 'Especes'}</span>
                                                            </div>
                                                            {item.payer && (
                                                                <div className="flex items-center gap-1 opacity-40">
                                                                    <User size={10} />
                                                                    <span className="text-[8px] font-black uppercase tracking-[0.1em]">{item.payer}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ));
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Photo Viewer Modal */}
            <AnimatePresence>
                {viewingData && (
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
                                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">{viewingData.name || viewingData.supplier_name || 'Document'}</h2>
                                                    <p className="text-[10px] font-medium text-[#c69f6e] mt-1 max-w-xs truncate">
                                                        {allPhotos.length} Document{allPhotos.length > 1 ? 's' : ''} • {viewingData.payment_method || 'N/A'}
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
                )}
            </AnimatePresence>
        </div>
    );
}


function ChevronLeft({ size, className }: { size: number, className?: string }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>;
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>;
}
