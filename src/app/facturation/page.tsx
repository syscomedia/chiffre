'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    Loader2, Search, Calendar, Plus,
    CreditCard, Banknote, Coins, Receipt,
    Trash2, UploadCloud, CheckCircle2,
    Clock, Filter, X, Eye, DollarSign, Bookmark, Edit2, Package, LayoutGrid, Hash,
    ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, ChevronDown, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

// --- Helper Components & Utilities ---

const formatDateToDisplay = (dateStr: string) => {
    if (!dateStr) return 'JJ/MM/AAAA';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            resolve(base64Str); // Fallback to original if error
        };
    });
};

import { createPortal } from 'react-dom';

const PremiumDatePicker = ({ value, onChange, label, colorMode = 'brown', lockedDates = [], allowedDates, align = 'left' }: { value: string, onChange: (val: string) => void, label: string, colorMode?: 'brown' | 'green' | 'red', lockedDates?: string[], allowedDates?: string[], align?: 'left' | 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const theme = {
        brown: { text: 'text-[#c69f6e]', bg: 'bg-[#c69f6e]', shadow: 'shadow-[#c69f6e]/30', border: 'border-[#c69f6e]/30', hover: 'hover:border-[#c69f6e]' },
        green: { text: 'text-[#2d6a4f]', bg: 'bg-[#2d6a4f]', shadow: 'shadow-[#2d6a4f]/30', border: 'border-[#2d6a4f]/30', hover: 'hover:border-[#2d6a4f]' },
        red: { text: 'text-red-500', bg: 'bg-red-500', shadow: 'shadow-red-500/30', border: 'border-red-500/30', hover: 'hover:border-red-500' }
    }[colorMode];

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
                            <span className="text-sm font-black text-[#4a3426] uppercase tracking-[0.1em]">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2.5 hover:bg-[#fcfaf8] rounded-2xl text-[#c69f6e] transition-colors"><ChevronRight size={20} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-3">
                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[10px] font-black text-[#bba282] text-center uppercase tracking-widest opacity-40">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {daysInMonth.map((day, i) => {
                                if (!day) return <div key={`empty-${i}`} />;

                                const y = day.getFullYear();
                                const m = String(day.getMonth() + 1).padStart(2, '0');
                                const d = String(day.getDate()).padStart(2, '0');
                                const dStr = `${y}-${m}-${d}`;

                                const isSelected = value === dStr;
                                const isLocked = lockedDates.includes(dStr);
                                const isNotAllowed = allowedDates && !allowedDates.includes(dStr);
                                const isDisabled = isLocked || isNotAllowed;

                                const now = new Date();
                                const isToday = now.getFullYear() === day.getFullYear() &&
                                    now.getMonth() === day.getMonth() &&
                                    now.getDate() === day.getDate();

                                return (
                                    <button key={i} type="button"
                                        onClick={() => {
                                            if (isDisabled) return;
                                            onChange(dStr);
                                            setIsOpen(false);
                                        }}
                                        disabled={isDisabled}
                                        className={`h-10 w-10 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center relative
                                            ${isDisabled ? 'text-red-300 opacity-40 cursor-not-allowed' : (isSelected ? `${theme.bg} text-white shadow-lg ${theme.shadow}` : `text-[#4a3426] hover:bg-[#fcfaf8] border border-transparent hover:border-[#e6dace]`)}
                                            ${isToday && !isSelected && !isDisabled ? `${theme.text} bg-opacity-10 ${theme.bg}` : ''}`}
                                    >
                                        {day.getDate()}
                                        {isLocked && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />}
                                        {isNotAllowed && !isLocked && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-gray-400 rounded-full" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 sm:gap-3 bg-white hover:bg-white border border-[#e6dace] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 h-10 sm:h-12 transition-all w-full group shadow-sm ${theme.hover}`}
            >
                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${theme.bg} bg-opacity-10 ${theme.text} flex-shrink-0`}>
                    <Calendar size={14} className="sm:hidden" strokeWidth={2.5} />
                    <Calendar size={18} className="hidden sm:block" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start overflow-hidden min-w-0">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#bba282] opacity-60 leading-none mb-0.5 sm:mb-1">{label}</span>
                    <span className="text-xs sm:text-sm font-black text-[#4a3426] tracking-tight truncate leading-none">
                        {formatDateToDisplay(value)}
                    </span>
                </div>
            </button>
            {typeof document !== 'undefined' && createPortal(CalendarPopup, document.body)}
        </div>
    );
};

const PremiumMonthPicker = ({ value, onChange, align = 'left' }: { value: string, onChange: (val: string) => void, align?: 'left' | 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(parseInt(value?.split('-')[0]) || new Date().getFullYear());

    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const currentMonthIdx = parseInt(value?.split('-')[1]) - 1;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-3 bg-white border border-[#e6dace] rounded-xl px-4 h-10 transition-all min-w-[160px] hover:shadow-sm group shadow-sm"
            >
                <span className="text-[10px] font-black text-[#4a3426] uppercase tracking-widest truncate">
                    {!isNaN(currentMonthIdx) ? `${months[currentMonthIdx]} ${value.split('-')[0]}` : 'Choisir Mois'}
                </span>
                <Calendar size={14} className="text-[#c69f6e]" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className={`absolute top-full lg:left-0 -left-20 mt-3 bg-white rounded-[2rem] shadow-2xl border border-[#e6dace] p-6 z-[110] w-72`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <button
                                    type="button"
                                    onClick={() => setViewYear(viewYear - 1)}
                                    className="p-2 hover:bg-[#fcfaf8] rounded-xl text-[#8c8279] transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm font-black text-[#4a3426] tracking-tighter">
                                    {viewYear}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewYear(viewYear + 1)}
                                    className="p-2 hover:bg-[#fcfaf8] rounded-xl text-[#8c8279] transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {months.map((m, i) => {
                                    const mStr = String(i + 1).padStart(2, '0');
                                    const isSelected = value === `${viewYear}-${mStr}`;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                onChange(`${viewYear}-${mStr}`);
                                                setIsOpen(false);
                                            }}
                                            className={`
                                                py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                                                ${isSelected
                                                    ? 'bg-[#c69f6e] text-white shadow-lg shadow-[#c69f6e]/20'
                                                    : 'text-[#4a3426] hover:bg-[#fcfaf8] border border-transparent hover:border-[#e6dace]/30'
                                                }
                                            `}
                                        >
                                            {m.substring(0, 4)}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const ChevronLeft = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>
);

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>
);

// --- End Helpers ---

const GET_INVOICES = gql`
  query GetInvoices($supplierName: String, $startDate: String, $endDate: String) {
    getInvoices(supplierName: $supplierName, startDate: $startDate, endDate: $endDate) {
      id
      supplier_name
      amount
      date
      photo_url
      photo_cheque_url
      photo_verso_url
      status
      payment_method
      paid_date
      photos
      doc_type
      doc_number
      payer
      category
      details
    }
    getSuppliers {
      id
      name
    }
    getDesignations {
      id
      name
      type
    }
    getLockedDates
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

const UPSERT_DESIGNATION = gql`
  mutation UpsertDesignation($name: String!, $type: String) {
    upsertDesignation(name: $name, type: $type) {
      id
      name
      type
    }
  }
`;

const ADD_INVOICE = gql`
  mutation AddInvoice($supplier_name: String!, $amount: String!, $date: String!, $photo_url: String, $photos: String, $doc_type: String, $doc_number: String, $category: String, $details: String) {
    addInvoice(supplier_name: $supplier_name, amount: $amount, date: $date, photo_url: $photo_url, photos: $photos, doc_type: $doc_type, doc_number: $doc_number, category: $category, details: $details) {
      id
      status
      photos
      doc_type
      doc_number
      category
      details
    }
  }
`;

const PAY_INVOICE = gql`
  mutation PayInvoice($id: Int!, $payment_method: String!, $paid_date: String!, $photo_cheque_url: String, $photo_verso_url: String, $payer: String) {
    payInvoice(id: $id, payment_method: $payment_method, paid_date: $paid_date, photo_cheque_url: $photo_cheque_url, photo_verso_url: $photo_verso_url, payer: $payer) {
      id
      status
      photos
      paid_date
      payer
    }
  }
`;

const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: Int!) {
    deleteInvoice(id: $id)
  }
`;

const UNPAY_INVOICE = gql`
  mutation UnpayInvoice($id: Int!) {
    unpayInvoice(id: $id) {
      id
      status
      photos
    }
  }
`;

const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($id: Int!, $supplier_name: String, $amount: String, $date: String, $photo_url: String, $photos: String, $doc_type: String, $doc_number: String, $details: String) {
    updateInvoice(id: $id, supplier_name: $supplier_name, amount: $amount, date: $date, photo_url: $photo_url, photos: $photos, doc_type: $doc_type, doc_number: $doc_number, details: $details) {
      id
      photos
      supplier_name
      amount
      date
      doc_type
      doc_number
      details
    }
  }
`;

// --- Confirm Modal Component ---
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, color = 'brown', alert = false }: any) => {
    if (!isOpen) return null;
    const colors: { [key: string]: string } = {
        brown: 'bg-[#4a3426] hover:bg-[#38261b]',
        red: 'bg-red-500 hover:bg-red-600',
        green: 'bg-[#2d6a4f] hover:bg-[#1b4332]'
    };
    const backdropColors: { [key: string]: string } = {
        brown: 'bg-black/40',
        red: 'bg-red-600/90',
        green: 'bg-[#2d6a4f]/60'
    };
    const headerColors: { [key: string]: string } = {
        brown: 'bg-[#4a3426]',
        red: 'bg-red-500',
        green: 'bg-[#2d6a4f]'
    };
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 z-[300] ${backdropColors[color]} backdrop-blur-md flex items-center justify-center p-4 text-left`}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-white/20"
                >
                    <div className={`p-6 ${headerColors[color]} text-white`}>
                        <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <p className="text-sm font-bold text-[#8c8279] uppercase tracking-wide leading-relaxed">
                            {message}
                        </p>
                        <div className="flex gap-3">
                            {!alert && (
                                <button
                                    onClick={onClose}
                                    className="flex-1 h-12 bg-[#f9f6f2] text-[#8c8279] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#ece6df] transition-all"
                                >
                                    Annuler
                                </button>
                            )}
                            <button
                                onClick={() => { if (onConfirm) onConfirm(); onClose(); }}
                                className={`flex-1 h-12 ${colors[color]} text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg`}
                            >
                                {alert ? 'OK' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default function FacturationPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ role: 'admin' | 'caissier', full_name: string } | null>(null);
    const [initializing, setInitializing] = useState(true);

    // Filters
    const [searchSupplier, setSearchSupplier] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [payerRoleFilter, setPayerRoleFilter] = useState<'all' | 'admin' | 'caissier'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'fournisseur' | 'divers'>('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState<any>(null);
    const [showConfirm, setShowConfirm] = useState<{ type: string, title: string, message: string, color: string, onConfirm?: () => void, alert?: boolean } | null>(null);
    const [showChoiceModal, setShowChoiceModal] = useState(false);
    const [viewingData, setViewingData] = useState<any>(null);
    const [imgZoom, setImgZoom] = useState(1);
    const [imgRotation, setImgRotation] = useState(0);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const imageContainerRef = useRef(null);

    const resetView = () => {
        setImgZoom(1);
        setImgRotation(0);
    };

    useEffect(() => {
        if (!viewingData) resetView();
    }, [viewingData]);

    const today = new Date();
    const ty = today.getFullYear();
    const tm = String(today.getMonth() + 1).padStart(2, '0');
    const td = String(today.getDate()).padStart(2, '0');
    const todayStr = `${ty}-${tm}-${td}`;

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const y_ty = yesterday.getFullYear();
    const y_tm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const y_td = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${y_ty}-${y_tm}-${y_td}`;

    // Form state
    const [newInvoice, setNewInvoice] = useState<{ supplier_name: string, amount: string, date: string, photos: string[], doc_type: string, doc_number: string, details: string }>({
        supplier_name: '',
        amount: '',
        date: todayStr,
        photos: [],
        doc_type: '',
        doc_number: '',
        details: ''
    });
    const [paymentDetails, setPaymentDetails] = useState({
        method: 'Espèces',
        date: todayStr,
        photo_cheque_url: '',
        photo_verso_url: ''
    });

    const [section, setSection] = useState<'Fournisseur' | 'Divers' | null>(null);
    const [showAddNameModal, setShowAddNameModal] = useState(false);
    const [newName, setNewName] = useState({ name: '', section: 'Fournisseur' });
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

    const [execUpsertSupplier] = useMutation(UPSERT_SUPPLIER);
    const [execUpsertDesignation] = useMutation(UPSERT_DESIGNATION);
    const [execAddInvoice] = useMutation(ADD_INVOICE);
    const [execPayInvoice] = useMutation(PAY_INVOICE);
    const [execDeleteInvoice] = useMutation(DELETE_INVOICE);
    const [execUnpayInvoice] = useMutation(UNPAY_INVOICE);
    const [execUpdateInvoice] = useMutation(UPDATE_INVOICE);

    const handleAddName = async () => {
        if (!newName.name) return;
        try {
            if (newName.section === 'Fournisseur') {
                await execUpsertSupplier({ variables: { name: newName.name } });
            } else {
                await execUpsertDesignation({
                    variables: {
                        name: newName.name,
                        type: 'divers'
                    }
                });
            }
            refetch();
            setShowAddNameModal(false);
            setNewName({ name: '', section: 'Fournisseur' });
        } catch (err) {
            console.error("Error adding name:", err);
        }
    };

    const { data, loading, refetch } = useQuery(GET_INVOICES, {
        variables: {
            supplierName: searchSupplier || undefined
        }
    });

    const stats = useMemo(() => {
        if (!data?.getInvoices) return { paid: 0, unpaid: 0, countPaid: 0, countUnpaid: 0 };
        return data.getInvoices.reduce((acc: any, inv: any) => {
            // Category Filter
            if (categoryFilter !== 'all') {
                const cat = inv.category || 'fournisseur';
                if (cat !== categoryFilter) return acc;
            }

            // Payer Filter (only for paid)
            if (inv.status === 'paid' && payerRoleFilter !== 'all') {
                if (payerRoleFilter === 'admin') {
                    if (inv.payer !== 'admin' && inv.payer !== 'riadh') return acc;
                } else {
                    if (inv.payer !== payerRoleFilter) return acc;
                }
            }

            const amt = parseFloat(inv.amount || '0');
            if (inv.status === 'paid') {
                // Month filter only for paid invoices
                if (inv.paid_date && inv.paid_date.startsWith(selectedMonth)) {
                    // Also respect date range if active
                    let dateMatch = true;
                    if (filterStartDate || filterEndDate) {
                        const d = inv.paid_date || inv.date;
                        if (filterStartDate && d < filterStartDate) dateMatch = false;
                        if (filterEndDate && d > filterEndDate) dateMatch = false;
                    }

                    if (dateMatch) {
                        acc.paid += amt;
                        acc.countPaid += 1;
                    }
                }
            } else {
                // Unpaid invoices are NOT filtered by month or date range
                acc.unpaid += amt;
                acc.countUnpaid += 1;
            }
            return acc;
        }, { paid: 0, unpaid: 0, countPaid: 0, countUnpaid: 0 });
    }, [data, categoryFilter, payerRoleFilter, selectedMonth, filterStartDate, filterEndDate]);

    const filteredInvoices = useMemo(() => {
        if (!data?.getInvoices) return [];
        return data.getInvoices.filter((inv: any) => {
            // Status filter logic
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

            // Filters that ONLY apply to paid invoices
            if (inv.status === 'paid') {
                // Month filter
                if (!inv.paid_date || !inv.paid_date.startsWith(selectedMonth)) return false;

                // Date range filters
                if (filterStartDate || filterEndDate) {
                    const d = inv.paid_date || inv.date;
                    if (filterStartDate && d < filterStartDate) return false;
                    if (filterEndDate && d > filterEndDate) return false;
                }
            }

            if (payerRoleFilter !== 'all' && inv.status === 'paid') {
                if (payerRoleFilter === 'admin') {
                    if (inv.payer !== 'admin' && inv.payer !== 'riadh') return false;
                } else {
                    if (inv.payer !== payerRoleFilter) return false;
                }
            }
            if (categoryFilter !== 'all') {
                const cat = inv.category || 'fournisseur';
                if (cat !== categoryFilter) return false;
            }
            return true;
        });
    }, [data, statusFilter, payerRoleFilter, categoryFilter, selectedMonth, filterStartDate, filterEndDate]);

    useEffect(() => {
        const savedUser = localStorage.getItem('bb_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        } else {
            router.replace('/');
            return;
        }

        // Handle supplier filter from URL
        const params = new URLSearchParams(window.location.search);
        const supplier = params.get('supplier');
        if (supplier) setSearchSupplier(decodeURIComponent(supplier));

        setInitializing(false);

        // Handle back button - check if user is still logged in
        const handlePopState = () => {
            const currentUser = localStorage.getItem('bb_user');
            if (!currentUser) {
                router.replace('/');
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [router]);

    const lockedDates = data?.getLockedDates || [];

    const handleAddInvoice = async () => {
        if (!section) return;
        if (!newInvoice.supplier_name || !newInvoice.amount || !newInvoice.date) return;
        if (lockedDates.includes(newInvoice.date)) {
            Swal.fire({ icon: 'error', title: 'Erreur', text: "Cette date est verrouillée. Impossible d'ajouter une facture." });
            return;
        }
        setShowConfirm({
            type: 'add',
            title: 'Ajouter Facture',
            message: `Êtes-vous sûr de vouloir ajouter cette facture de ${newInvoice.amount} DT pour ${newInvoice.supplier_name} ?`,
            color: 'brown',
            onConfirm: async () => {
                try {
                    Swal.fire({
                        title: 'Ajout en cours...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    await execAddInvoice({
                        variables: {
                            ...newInvoice,
                            amount: newInvoice.amount.toString(),
                            photo_url: newInvoice.photos[0] || '',
                            photos: JSON.stringify(newInvoice.photos),
                            doc_type: newInvoice.doc_type,
                            doc_number: newInvoice.doc_number || null,
                            category: section.toLowerCase(),
                            details: newInvoice.details || ''
                        }
                    });
                    Swal.fire({ icon: 'success', title: 'Ajoutée', timer: 1500, showConfirmButton: false });
                    setShowAddModal(false);
                    setNewInvoice({
                        supplier_name: '',
                        amount: '',
                        date: todayStr,
                        photos: [],
                        doc_type: 'Facture',
                        doc_number: '',
                        details: ''
                    });
                    refetch();
                } catch (e) {
                    console.error(e);
                    Swal.fire({ icon: 'error', title: 'Erreur', text: "Impossible d'ajouter la facture. Les photos sont peut-être trop lourdes." });
                }
            }
        });
    };

    const handlePayInvoice = async () => {
        if (!showPayModal) return;
        if (lockedDates.includes(paymentDetails.date)) {
            Swal.fire({ icon: 'error', title: 'Erreur', text: "Cette date est verrouillée. Impossible de valider le paiement." });
            return;
        }
        setShowConfirm({
            type: 'pay',
            title: 'Valider Paiement',
            message: `Êtes-vous sûr de vouloir régler ${showPayModal.amount} DT à ${showPayModal.supplier_name} via ${paymentDetails.method} ?`,
            color: 'green',
            onConfirm: async () => {
                try {
                    Swal.fire({
                        title: 'Validation du paiement...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    await execPayInvoice({
                        variables: {
                            id: showPayModal.id,
                            payment_method: paymentDetails.method,
                            paid_date: paymentDetails.date,
                            photo_cheque_url: paymentDetails.photo_cheque_url || null,
                            photo_verso_url: paymentDetails.photo_verso_url || null,
                            payer: user?.role || 'admin'
                        }
                    });
                    Swal.fire({ icon: 'success', title: 'Paiement Validé', timer: 1500, showConfirmButton: false });
                    setShowPayModal(null);
                    setPaymentDetails({
                        method: 'Espèces',
                        date: todayStr,
                        photo_cheque_url: '',
                        photo_verso_url: ''
                    });
                    refetch();
                } catch (e) {
                    console.error(e);
                    Swal.fire({ icon: 'error', title: 'Erreur', text: "Impossible de valider le paiement. Vérifiez la taille des photos (Chèque)." });
                }
            }
        });
    };

    const handleUnpay = async (inv: any) => {
        if (lockedDates.includes(inv.paid_date)) {
            setShowConfirm({
                type: 'alert',
                title: 'INTERDIT',
                message: 'Cette date est verrouillée. Impossible de modifier cette facture.',
                color: 'red',
                alert: true
            });
            return;
        }
        setShowConfirm({
            type: 'unpay',
            title: 'Annulation Payement',
            message: `Voulez-vous vraiment annuler le paiement de cette facture pour ${inv.supplier_name} ? Elle redeviendra "non payée".`,
            color: 'brown',
            onConfirm: async () => {
                try {
                    await execUnpayInvoice({ variables: { id: inv.id } });
                    refetch();
                } catch (e) { console.error(e); }
            }
        });
    };

    const handleUpdateInvoice = async (invoiceData: any) => {
        setShowConfirm({
            type: 'update',
            title: 'Enregistrer Modifications',
            message: 'Êtes-vous sûr de vouloir enregistrer les modifications apportées à cette facture ?',
            color: 'brown',
            onConfirm: async () => {
                try {
                    Swal.fire({
                        title: 'Mise à jour...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    await execUpdateInvoice({
                        variables: {
                            id: invoiceData.id,
                            supplier_name: invoiceData.supplier_name,
                            amount: invoiceData.amount.toString(),
                            date: invoiceData.date,
                            photo_url: invoiceData.photos[0] || '',
                            photos: JSON.stringify(invoiceData.photos),
                            doc_type: invoiceData.doc_type,
                            doc_number: invoiceData.doc_number || '',
                            details: invoiceData.details || ''
                        }
                    });
                    Swal.fire({ icon: 'success', title: 'Mis à jour', timer: 1500, showConfirmButton: false });
                    setShowEditModal(null);
                    refetch();
                } catch (e) {
                    console.error(e);
                    Swal.fire({ icon: 'error', title: 'Erreur', text: "Impossible de mettre à jour. Les photos sont peut-être trop lourdes." });
                }
            }
        });
    };

    const handleDelete = async (inv: any) => {
        if (inv.status === 'paid' && lockedDates.includes(inv.paid_date)) {
            setShowConfirm({
                type: 'alert',
                title: 'INTERDIT',
                message: 'Cette date est verrouillée. Impossible de supprimer cette facture.',
                color: 'red',
                alert: true
            });
            return;
        }
        setShowConfirm({
            type: 'delete',
            title: 'Supprimer Facture',
            message: `Êtes-vous sûr de vouloir supprimer définitivement la facture de ${inv.supplier_name} ? Cette action est irréversible.`,
            color: 'red',
            onConfirm: async () => {
                try {
                    await execDeleteInvoice({ variables: { id: inv.id } });
                    refetch();
                } catch (e) {
                    console.error(e);
                }
            }
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'invoice' | 'recto' | 'verso' = 'invoice') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const processFile = async (file: File) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    const compressed = await compressImage(base64);
                    resolve(compressed);
                };
                reader.readAsDataURL(file);
            });
        };

        if (field === 'invoice') {
            const results = await Promise.all(Array.from(files).map(processFile));
            setNewInvoice(prev => ({
                ...prev,
                photos: [...prev.photos, ...results]
            }));
        } else {
            const res = await processFile(files[0]);
            if (field === 'recto') setPaymentDetails({ ...paymentDetails, photo_cheque_url: res });
            else if (field === 'verso') setPaymentDetails({ ...paymentDetails, photo_verso_url: res });
        }
    };

    const handleDeletePhoto = (index: number) => {
        setNewInvoice(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    if (initializing || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
            <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#fdfbf7]">
            <Sidebar role={user.role} />

            <div className="flex-1 min-w-0">
                <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#e6dace] py-4 md:py-6 px-4 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-[#4a3426] tracking-tight uppercase leading-none mb-1">Facturation</h1>
                            <div className="flex items-center gap-3">
                                <p className="text-[10px] md:text-xs text-[#8c8279] font-bold uppercase tracking-widest">Gestion des factures</p>
                                <div className="w-px h-3 bg-[#e6dace]" />
                                <PremiumMonthPicker value={selectedMonth} onChange={setSelectedMonth} />
                            </div>
                        </div>

                        {/* Mobile Filter Toggle Button */}
                        <button
                            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#e6dace] text-[#4a3426] shadow-sm transition-all"
                        >
                            <motion.div
                                animate={{ rotate: mobileFiltersOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown size={20} />
                            </motion.div>
                        </button>
                    </div>

                    <div className={`items-center gap-3 w-full md:w-auto ${mobileFiltersOpen ? 'flex' : 'hidden md:flex'}`}>
                        <button
                            onClick={() => setShowChoiceModal(true)}
                            className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 bg-white text-[#4a3426] border border-[#e6dace] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#fcfaf8] transition-all shadow-sm"
                        >
                            <Bookmark size={16} className="md:hidden" />
                            <Bookmark size={18} className="hidden md:block" />
                            <span>Ajouter Section</span>
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 bg-[#4a3426] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#38261b] transition-all shadow-lg shadow-[#4a3426]/10"
                        >
                            <Plus size={18} className="md:hidden" />
                            <Plus size={20} className="hidden md:block" />
                            <span>Ajouter Facture</span>
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 md:mt-8 pb-20">
                    {/* Category Filter */}
                    <div className="flex justify-center mb-6 md:mb-8">
                        <div className="inline-flex bg-white/50 backdrop-blur-sm p-1 md:p-1.5 rounded-2xl md:rounded-3xl border border-[#e6dace] shadow-sm w-full md:w-auto">
                            {[
                                { id: 'all', label: 'Tous', icon: <LayoutGrid size={14} /> },
                                { id: 'fournisseur', label: 'Fournisseur', icon: <Package size={14} /> },
                                { id: 'divers', label: 'Divers', icon: <Receipt size={14} /> }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryFilter(cat.id as any)}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-wider md:tracking-widest transition-all ${categoryFilter === cat.id
                                        ? 'bg-[#4a3426] text-white shadow-lg'
                                        : 'text-[#8c8279] hover:text-[#4a3426] hover:bg-white'
                                        }`}
                                >
                                    {cat.icon}
                                    <span className="hidden sm:inline">{cat.label}</span>
                                    <span className="sm:hidden">{cat.id === 'all' ? 'Tous' : cat.id === 'fournisseur' ? 'Fourn.' : 'Divers'}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stat Boxes */}
                    <div className={`grid grid-cols-1 ${user?.role !== 'caissier' ? 'md:grid-cols-2' : ''} gap-6 mb-8`}>
                        {user?.role !== 'caissier' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
                                className={`rounded-[2rem] p-6 border transition-all shadow-lg relative overflow-hidden group cursor-pointer ${statusFilter === 'paid' ? 'ring-4 ring-[#2d6a4f]/20 scale-[1.02]' : ''} bg-[#2d6a4f] border-[#2d6a4f] text-white`}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125"></div>
                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Payé</p>
                                        <h3 className="text-2xl font-black text-white">{stats.paid.toFixed(3)} <span className="text-xs opacity-50">DT</span></h3>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-white/80 uppercase tracking-wider relative z-10">
                                    <span>Factures validées</span>
                                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-full">{stats.countPaid}</span>
                                </div>
                                {statusFilter === 'paid' && <div className="absolute top-4 right-4 text-white/40"><Filter size={14} /></div>}
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            onClick={() => setStatusFilter(statusFilter === 'unpaid' ? 'all' : 'unpaid')}
                            className={`rounded-[2rem] p-6 border transition-all shadow-lg relative overflow-hidden group cursor-pointer ${statusFilter === 'unpaid' ? 'ring-4 ring-red-500/20 scale-[1.02]' : ''} bg-red-500 border-red-500 text-white`}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125"></div>
                            <div className="flex items-center gap-4 mb-4 relative z-10">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Non Payé</p>
                                    <h3 className="text-2xl font-black text-white">{stats.unpaid.toFixed(3)} <span className="text-xs opacity-50">DT</span></h3>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-white/80 uppercase tracking-wider relative z-10">
                                <span>Total Non Payé</span>
                                <span className="bg-white/20 text-white px-2 py-0.5 rounded-full">{stats.countUnpaid}</span>
                            </div>
                            {statusFilter === 'unpaid' && <div className="absolute top-4 right-4 text-white/40"><Filter size={14} /></div>}
                        </motion.div>

                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-6 mb-6 md:mb-8 border border-[#e6dace] shadow-sm flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-end">
                        <div className="flex-1 min-w-0 md:min-w-[200px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#8c8279] mb-2 block ml-1">
                                {categoryFilter === 'divers' ? 'Divers' : categoryFilter === 'fournisseur' ? 'Fournisseur' : 'Recherche'}
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher (Nom, N°, Montant)..."
                                    value={searchSupplier}
                                    onChange={(e) => setSearchSupplier(e.target.value)}
                                    className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-4 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-bold text-sm text-[#4a3426] outline-none focus:border-[#c69f6e] transition-all"
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#8c8279] mb-2 block ml-1">Période</label>
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="flex-1 md:flex-none">
                                    <PremiumDatePicker
                                        label="Début"
                                        value={filterStartDate}
                                        onChange={setFilterStartDate}
                                    />
                                </div>
                                <span className="text-[#8c8279] font-black opacity-30 text-xs uppercase hidden sm:block">à</span>
                                <div className="flex-1 md:flex-none">
                                    <PremiumDatePicker
                                        label="Fin"
                                        value={filterEndDate}
                                        onChange={setFilterEndDate}
                                        align="right"
                                    />
                                </div>
                            </div>
                        </div>
                        {(statusFilter !== 'all' || searchSupplier || filterStartDate || filterEndDate) && (
                            <button
                                onClick={() => {
                                    setStatusFilter('all');
                                    setSearchSupplier('');
                                    setFilterStartDate('');
                                    setFilterEndDate('');
                                }}
                                className="h-10 md:h-12 px-4 bg-[#fcfaf8] border border-[#e6dace] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#c69f6e] hover:bg-[#fff9f2] flex items-center justify-center gap-2 transition-all"
                            >
                                <X size={14} /> Réinitialiser
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="py-40 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-[#c69f6e]" size={50} />
                            <p className="font-bold text-[#8c8279] animate-pulse">Chargement des factures...</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Area for Unpaid Invoices */}
                            {(statusFilter === 'all' || statusFilter === 'unpaid') && (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                                            <Clock size={22} />
                                        </div>
                                        <h2 className="text-xl font-black text-[#4a3426] uppercase tracking-tight">Factures non payées</h2>
                                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-black text-sm border border-red-100">
                                            {filteredInvoices.filter((inv: any) => inv.status !== 'paid').length}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                        <AnimatePresence>
                                            {filteredInvoices.filter((inv: any) => inv.status !== 'paid').map((inv: any) => (
                                                <motion.div
                                                    key={inv.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-red-100 rounded-[2.5rem] border-2 border-red-400/50 overflow-hidden group hover:shadow-2xl hover:shadow-red-500/20 transition-all"
                                                >
                                                    <div className="p-6 pb-0 flex flex-wrap justify-between items-center gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 bg-red-500 text-white">
                                                                <Clock size={12} />
                                                                Non Payé
                                                            </div>
                                                            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/60 text-red-700 border border-red-200">
                                                                {inv.doc_type || 'Facture'} {inv.doc_number ? `#${inv.doc_number}` : ''}
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${inv.category === 'divers' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                                {inv.category === 'divers' ? 'Divers' : 'Fournisseur'}
                                                            </div>
                                                        </div>
                                                        {(() => {
                                                            const hasLegacy = !!(inv.photo_url && inv.photo_url.length > 5);
                                                            const hasNewPhotos = !!(inv.photos && inv.photos !== '[]' && inv.photos.length > 5);
                                                            const hasCheque = !!((inv.photo_cheque_url || '').length > 5 || (inv.photo_verso_url || '').length > 5);

                                                            if (hasLegacy || hasNewPhotos || hasCheque) {
                                                                return (
                                                                    <button
                                                                        onClick={() => setViewingData(inv)}
                                                                        className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors bg-white/60 px-3 py-1 rounded-lg border border-red-200"
                                                                    >
                                                                        <Eye size={14} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Voir Photo</span>
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="flex flex-col gap-2 mb-4">
                                                            <h3 className="font-black text-lg sm:text-2xl text-[#4a3426] tracking-tight break-words">{inv.supplier_name}</h3>
                                                            {inv.details && (
                                                                <p className="text-xs text-[#8c8279] font-medium -mt-1 break-words">{inv.details}</p>
                                                            )}

                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <div className="text-xl sm:text-2xl font-black text-red-600 whitespace-nowrap">
                                                                    {parseFloat(inv.amount || '0').toFixed(3)}
                                                                    <span className="text-[10px] font-bold text-red-500 uppercase ml-1">DT</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-red-400/20 shadow-sm">
                                                                    <Calendar size={12} className="text-red-600" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600/70">Reçu le:</span>
                                                                    <span className="text-[10px] font-black text-red-900">{new Date(inv.date).toLocaleDateString('fr-FR')}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setShowPayModal(inv)}
                                                                className="flex-1 h-11 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                                            >
                                                                <CheckCircle2 size={18} />
                                                                <span>À Payer</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowEditModal({
                                                                        id: inv.id,
                                                                        supplier_name: inv.supplier_name,
                                                                        amount: inv.amount,
                                                                        date: inv.date,
                                                                        photos: JSON.parse(inv.photos || '[]'),
                                                                        doc_type: inv.doc_type || 'Facture',
                                                                        doc_number: inv.doc_number || '',
                                                                        details: inv.details || ''
                                                                    });
                                                                }}
                                                                className="w-11 h-11 border-2 border-[#e6dace] text-[#8c8279] hover:text-[#4a3426] hover:border-[#4a3426] rounded-xl flex items-center justify-center transition-all"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(inv)}
                                                                className="w-11 h-11 border-2 border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl flex items-center justify-center transition-all"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        {filteredInvoices.filter((inv: any) => inv.status !== 'paid').length === 0 && (
                                            <div className="col-span-full py-10 bg-[#f9f6f2] rounded-[2rem] border-2 border-dashed border-[#e6dace] text-center">
                                                <div className="text-[#8c8279] opacity-40 mb-3"><CheckCircle2 className="mx-auto" size={40} /></div>
                                                <p className="font-bold text-[#8c8279] uppercase text-xs tracking-widest">Aucune facture en attente</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Separator */}
                            {statusFilter === 'all' && <div className="h-px bg-[#e6dace] w-full opacity-50"></div>}

                            {/* Area for Paid Invoices */}
                            {(statusFilter === 'all' || statusFilter === 'paid') && (
                                <section>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-700">
                                                <CheckCircle2 size={22} />
                                            </div>
                                            <h2 className="text-xl font-black text-[#4a3426] uppercase tracking-tight">Historique des Paiements</h2>
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-sm border border-green-200">
                                                {filteredInvoices.filter((inv: any) => inv.status === 'paid').length}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Category Filter (Dual location for convenience) */}
                                            <div className="inline-flex bg-white/50 backdrop-blur-sm p-1.5 rounded-3xl border border-[#e6dace] shadow-sm">
                                                {[
                                                    { id: 'all', label: 'Tous', icon: <LayoutGrid size={14} /> },
                                                    { id: 'fournisseur', label: 'Fournisseur', icon: <Package size={14} /> },
                                                    { id: 'divers', label: 'Divers', icon: <Receipt size={14} /> }
                                                ].map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setCategoryFilter(cat.id as any)}
                                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${categoryFilter === cat.id
                                                            ? 'bg-[#4a3426] text-white shadow-lg'
                                                            : 'text-[#8c8279] hover:text-[#4a3426] hover:bg-white'
                                                            }`}
                                                    >
                                                        {cat.icon}
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Payer Role Filter */}
                                            <div className="flex bg-white/50 p-1 rounded-2xl border border-green-200 gap-1">
                                                {[
                                                    { id: 'all', label: 'Tous' },
                                                    { id: 'admin', label: 'Admin' },
                                                    { id: 'caissier', label: 'Caisse' }
                                                ].map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => setPayerRoleFilter(r.id as any)}
                                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${payerRoleFilter === r.id
                                                            ? 'bg-[#2d6a4f] text-white shadow-sm'
                                                            : 'text-green-700/60 hover:text-green-700 hover:bg-green-50'
                                                            }`}
                                                    >
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                        <AnimatePresence>
                                            {filteredInvoices.filter((inv: any) => inv.status === 'paid').map((inv: any) => (
                                                <motion.div
                                                    key={inv.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-green-100 rounded-[2.5rem] border-2 border-green-400/50 overflow-hidden group hover:shadow-2xl hover:shadow-green-500/20 transition-all"
                                                >
                                                    <div className="p-6 pb-0 flex flex-wrap justify-between items-center gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 bg-green-500 text-white">
                                                                <CheckCircle2 size={12} />
                                                                Payé
                                                            </div>
                                                            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/60 text-green-700 border border-green-200">
                                                                {inv.doc_type || 'Facture'} {inv.doc_number ? `#${inv.doc_number}` : ''}
                                                            </div>
                                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${inv.category === 'divers' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                                {inv.category === 'divers' ? 'Divers' : 'Fournisseur'}
                                                            </div>
                                                            {inv.payer && (
                                                                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${(inv.payer === 'admin' || inv.payer === 'riadh') ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                                                    }`}>
                                                                    {inv.payer === 'riadh' ? 'Admin' : inv.payer}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(() => {
                                                            const hasLegacy = !!(inv.photo_url && inv.photo_url.length > 5);
                                                            const hasNewPhotos = !!(inv.photos && inv.photos !== '[]' && inv.photos.length > 5);
                                                            const hasCheque = !!((inv.photo_cheque_url || '').length > 5 || (inv.photo_verso_url || '').length > 5);

                                                            if (hasLegacy || hasNewPhotos || hasCheque) {
                                                                return (
                                                                    <button
                                                                        onClick={() => setViewingData(inv)}
                                                                        className="flex items-center gap-2 text-green-700 hover:text-green-800 transition-colors bg-white/60 px-3 py-1 rounded-lg border border-green-200"
                                                                    >
                                                                        <Eye size={14} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Voir Photo</span>
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="flex flex-col gap-2 mb-4">
                                                            <h3 className="font-black text-lg sm:text-2xl text-[#4a3426] tracking-tight opacity-70 break-words">{inv.supplier_name}</h3>
                                                            {inv.details && (
                                                                <p className="text-xs text-[#8c8279] font-medium -mt-1 break-words">{inv.details}</p>
                                                            )}

                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <div className="text-xl sm:text-2xl font-black text-green-700 whitespace-nowrap">
                                                                    {parseFloat(inv.amount || '0').toFixed(3)}
                                                                    <span className="text-[10px] font-bold text-green-600/60 uppercase ml-1">DT</span>
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-green-400/20 shadow-sm">
                                                                        <Calendar size={12} className="text-green-600" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600/70">Reçu le:</span>
                                                                        <span className="text-[10px] font-black text-green-900">{new Date(inv.date).toLocaleDateString('fr-FR')}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-green-400/20 shadow-sm">
                                                                        <Calendar size={12} className="text-green-600" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600/70">Réglé le:</span>
                                                                        <span className="text-[10px] font-black text-green-900">{new Date(inv.paid_date).toLocaleDateString('fr-FR')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-green-100 border border-green-200 rounded-2xl p-4 mb-4">
                                                            <div className="flex items-center text-[10px] font-black uppercase tracking-[0.1em] text-green-700">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                                                    {inv.payment_method}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => (user?.role === 'admin' || !lockedDates.includes(inv.paid_date)) && handleUnpay(inv)}
                                                                disabled={user?.role !== 'admin' && lockedDates.includes(inv.paid_date)}
                                                                className={`flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${(user?.role === 'admin' || !lockedDates.includes(inv.paid_date))
                                                                    ? 'bg-[#2D6B4E] text-white hover:bg-[#1f4b36] cursor-pointer'
                                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                                                                    }`}
                                                            >
                                                                <RotateCcw size={18} />
                                                                <span className="text-xs uppercase">Annuler Payement</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (user?.role !== 'admin' && lockedDates.includes(inv.paid_date)) return;
                                                                    if (lockedDates.includes(inv.paid_date)) {
                                                                        setShowConfirm({
                                                                            type: 'alert',
                                                                            title: 'INTERDIT',
                                                                            message: 'Cette date est verrouillée. Impossible de modifier cette facture.',
                                                                            color: 'red',
                                                                            alert: true
                                                                        });
                                                                        return;
                                                                    }
                                                                    setShowEditModal({
                                                                        id: inv.id,
                                                                        supplier_name: inv.supplier_name,
                                                                        amount: inv.amount,
                                                                        date: inv.date,
                                                                        photos: JSON.parse(inv.photos || '[]'),
                                                                        doc_type: inv.doc_type || 'Facture',
                                                                        doc_number: inv.doc_number || '',
                                                                        details: inv.details || ''
                                                                    });
                                                                }}
                                                                disabled={user?.role !== 'admin' && lockedDates.includes(inv.paid_date)}
                                                                className={`w-11 h-11 border-2 rounded-xl flex items-center justify-center transition-all ${(user?.role === 'admin' || !lockedDates.includes(inv.paid_date))
                                                                    ? 'border-[#e6dace] text-[#8c8279] hover:text-[#4a3426] hover:border-[#4a3426] cursor-pointer'
                                                                    : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                                                                    }`}
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => (user?.role === 'admin' || !lockedDates.includes(inv.paid_date)) && handleDelete(inv)}
                                                                disabled={user?.role !== 'admin' && lockedDates.includes(inv.paid_date)}
                                                                className={`w-11 h-11 border-2 rounded-xl flex items-center justify-center transition-all ${(user?.role === 'admin' || !lockedDates.includes(inv.paid_date))
                                                                    ? 'border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 cursor-pointer'
                                                                    : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                                                                    }`}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        {filteredInvoices.filter((inv: any) => inv.status === 'paid').length === 0 && (
                                            <div className="col-span-full py-10 bg-[#f9f6f2] rounded-[2rem] border-2 border-dashed border-[#e6dace] text-center">
                                                <p className="font-bold text-[#8c8279] uppercase text-xs tracking-widest opacity-40">Aucun historique de paiement</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </main>
            </div >

            {/* Add Invoice Modal */}
            <AnimatePresence>
                {
                    showAddModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-[#4a3426]/60 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => setShowAddModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-[1.5rem] w-full max-w-lg max-h-[96vh] overflow-y-auto shadow-2xl border border-white/20 custom-scrollbar m-auto"
                            >
                                <div className="p-3 bg-[#4a3426] text-white relative rounded-t-[1.5rem]">
                                    <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                        <Receipt size={20} className="text-[#c69f6e]" />
                                        Nouveau Reçu
                                    </h2>
                                    <button onClick={() => setShowAddModal(false)} className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-4 space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">Section</label>
                                        <div className="flex gap-1.5 mb-1.5">
                                            {['Fournisseur', 'Divers'].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        setSection(s as any);
                                                        setNewInvoice({ ...newInvoice, supplier_name: '' });
                                                    }}
                                                    className={`flex-1 h-8 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${section === s
                                                        ? 'bg-[#4a3426] text-[#c69f6e] border-[#4a3426] shadow-md shadow-[#4a3426]/10'
                                                        : 'bg-white text-[#8c8279] border-[#e6dace] hover:border-[#4a3426]/20'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {!section ? (
                                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#8c8279] opacity-50">
                                            <div className="w-12 h-12 rounded-full border-2 border-[#8c8279] border-dashed flex items-center justify-center">
                                                <LayoutGrid size={20} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Sélectionner une section</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">
                                                    {section === 'Fournisseur' ? 'Fournisseur' : 'Désignation'}
                                                </label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c69f6e] z-10 pointer-events-none" size={16} />
                                                    <input
                                                        type="text"
                                                        value={newInvoice.supplier_name}
                                                        onChange={(e) => setNewInvoice({ ...newInvoice, supplier_name: e.target.value })}
                                                        onFocus={() => setShowSupplierDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                                                        placeholder={`Rechercher ${section === 'Fournisseur' ? 'un fournisseur' : 'une désignation'}...`}
                                                        className="w-full h-10 pl-10 pr-10 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-bold text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all text-xs placeholder:text-[#8c8279]/40 placeholder:font-normal"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentSection = section || 'Fournisseur';
                                                            setNewName({ ...newName, section: currentSection });
                                                            setShowAddNameModal(true);
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#4a3426] text-white rounded-lg hover:bg-[#38261b] transition-all z-10"
                                                    >
                                                        <Plus size={14} />
                                                    </button>

                                                    {/* Dropdown Suggestions */}
                                                    <AnimatePresence>
                                                        {showSupplierDropdown && (() => {
                                                            const items = section === 'Fournisseur'
                                                                ? (data?.getSuppliers || [])
                                                                : (data?.getDesignations || []).filter((d: any) => d.type === 'divers');

                                                            const filtered = items.filter((item: any) =>
                                                                item.name.toLowerCase().includes(newInvoice.supplier_name.toLowerCase())
                                                            );

                                                            if (filtered.length === 0) return null;

                                                            return (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -10 }}
                                                                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e6dace] rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 custom-scrollbar"
                                                                >
                                                                    {filtered.map((item: any) => (
                                                                        <button
                                                                            key={item.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setNewInvoice({ ...newInvoice, supplier_name: item.name });
                                                                                setShowSupplierDropdown(false);
                                                                            }}
                                                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-[#4a3426] hover:bg-[#fcfaf8] transition-colors border-b border-[#f4ece4] last:border-b-0"
                                                                        >
                                                                            {item.name}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            );
                                                        })()}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">Document & N°</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 flex gap-1">
                                                        {['Facture', 'BL'].map((t) => (
                                                            <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => setNewInvoice({ ...newInvoice, doc_type: t })}
                                                                className={`flex-1 h-8 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${newInvoice.doc_type === t
                                                                    ? 'bg-[#d00000] text-white border-[#d00000] shadow-md shadow-[#d00000]/10'
                                                                    : 'bg-white text-[#8c8279] border-[#e6dace] hover:border-[#d00000]/20'
                                                                    }`}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex-[1.2] relative">
                                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="N° optional"
                                                            value={newInvoice.doc_number}
                                                            onChange={(e) => setNewInvoice({ ...newInvoice, doc_number: e.target.value })}
                                                            className="w-full h-8 pl-9 pr-3 bg-[#f9f6f2] border border-[#e6dace] rounded-lg font-bold text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all text-[11px]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">Montant (DT)</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            placeholder="0.000"
                                                            value={newInvoice.amount}
                                                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                                                            className="w-full h-12 pl-9 pr-3 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-black text-xl text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all min-w-[180px]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">Date Facture</label>
                                                    <div className="scale-[0.85] origin-top-left -mb-4">
                                                        <PremiumDatePicker
                                                            label="Date"
                                                            value={newInvoice.date}
                                                            onChange={(val) => setNewInvoice({ ...newInvoice, date: val })}
                                                            lockedDates={lockedDates}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Détails (Optionnel)</label>
                                                <textarea
                                                    value={newInvoice.details}
                                                    onChange={(e) => setNewInvoice({ ...newInvoice, details: e.target.value })}
                                                    placeholder="Détails supplémentaires..."
                                                    className="w-full h-16 p-3 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-medium text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all text-[11px] resize-none"
                                                />
                                            </div>

                                            <div className="mt-[-8px]">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">Photos</label>
                                                <div className="grid grid-cols-6 gap-1.5 mb-1.5">
                                                    {newInvoice.photos.map((p, idx) => (
                                                        <div key={idx} className="relative aspect-square bg-[#f9f6f2] rounded-lg overflow-hidden group border border-[#e6dace]">
                                                            <img src={p} className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(idx); }}
                                                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <div
                                                        onClick={() => document.getElementById('photo-upload')?.click()}
                                                        className="aspect-square bg-[#fcfaf8] border border-dashed border-[#e6dace] rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-[#c69f6e] hover:bg-[#fff9f2] transition-all"
                                                    >
                                                        <UploadCloud className="text-[#c69f6e] opacity-40" size={16} />
                                                        <span className="text-[6px] font-black text-[#8c8279] uppercase tracking-widest text-center">Ajouter</span>
                                                        <input id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleAddInvoice}
                                                disabled={!newInvoice.supplier_name || !newInvoice.amount || !newInvoice.doc_type}
                                                className="w-full h-11 bg-[#4a3426] text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#38261b] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                            >
                                                Confirmer l'ajout
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Pay Modal */}
            <AnimatePresence>
                {
                    showPayModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-[#2d6a4f]/60 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => setShowPayModal(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-[1.5rem] w-full max-w-md max-h-[96vh] overflow-y-auto shadow-2xl border border-white/20 custom-scrollbar m-auto"
                            >
                                <div className="p-3 bg-[#2d6a4f] text-white relative rounded-t-[1.5rem]">
                                    <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                        <CheckCircle2 size={24} className="text-[#a7c957]" />
                                        Paiement
                                    </h2>
                                    <button onClick={() => setShowPayModal(null)} className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-4 space-y-3">
                                    <div className="bg-[#f0faf5] p-2.5 rounded-xl border border-[#d1e7dd]">
                                        <span className="text-[9px] font-black text-[#2d6a4f] uppercase tracking-widest block mb-0.5">Détails Facture</span>
                                        <div className="flex justify-between items-baseline font-black text-[#1b4332]">
                                            <span className="text-sm">{showPayModal.supplier_name}</span>
                                            <span className="text-lg">{parseFloat(showPayModal.amount).toFixed(3)} DT</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Mode de Paiement</label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { id: 'Espèces', icon: Coins },
                                                { id: 'Tpe', icon: CreditCard },
                                                { id: 'Chèque', icon: Banknote },
                                                { id: 'T. Restaurant', icon: Receipt }
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setPaymentDetails({ ...paymentDetails, method: m.id })}
                                                    className={`h-9 rounded-lg border-2 flex items-center gap-2 px-2 transition-all ${paymentDetails.method === m.id
                                                        ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white shadow-md'
                                                        : 'bg-white border-[#e6dace] text-[#8c8279] hover:border-[#2d6a4f]'
                                                        }`}
                                                >
                                                    <m.icon size={14} />
                                                    <span className="font-bold text-[9px]">{m.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-0.5 block ml-1">Date de Règlement</label>
                                        <div className="scale-[0.9] origin-top-left -mb-2">
                                            <PremiumDatePicker
                                                label="Date"
                                                colorMode="green"
                                                value={paymentDetails.date}
                                                onChange={(val) => setPaymentDetails({ ...paymentDetails, date: val })}
                                                lockedDates={lockedDates}
                                                allowedDates={user?.role === 'caissier' ? [todayStr, yesterdayStr] : undefined}
                                            />
                                        </div>
                                    </div>

                                    {paymentDetails.method === 'Chèque' && (
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Recto</label>
                                                <div
                                                    onClick={() => document.getElementById('recto-upload')?.click()}
                                                    className="h-16 bg-[#fcfaf8] border-2 border-dashed border-[#e6dace] rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-[#2d6a4f] hover:bg-[#f0faf5] transition-all overflow-hidden"
                                                >
                                                    {paymentDetails.photo_cheque_url ? (
                                                        <img src={paymentDetails.photo_cheque_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="text-[#2d6a4f] opacity-40" size={16} />
                                                            <span className="text-[6px] font-black text-[#8c8279] uppercase tracking-widest">Ajouter</span>
                                                        </>
                                                    )}
                                                    <input id="recto-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'recto')} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Verso</label>
                                                <div
                                                    onClick={() => document.getElementById('verso-upload')?.click()}
                                                    className="h-16 bg-[#fcfaf8] border-2 border-dashed border-[#e6dace] rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-[#2d6a4f] hover:bg-[#f0faf5] transition-all overflow-hidden"
                                                >
                                                    {paymentDetails.photo_verso_url ? (
                                                        <img src={paymentDetails.photo_verso_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="text-[#2d6a4f] opacity-40" size={16} />
                                                            <span className="text-[6px] font-black text-[#8c8279] uppercase tracking-widest">Ajouter</span>
                                                        </>
                                                    )}
                                                    <input id="verso-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'verso')} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handlePayInvoice}
                                        className="w-full h-11 bg-[#2d6a4f] text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#1b4332] transition-all shadow-lg"
                                    >
                                        Valider et Archiver
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Image Viewer Overlay */}
            <AnimatePresence>
                {
                    viewingData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center overflow-hidden"
                            onClick={() => setViewingData(null)}
                        >
                            <div className="relative w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>

                                {/* Top Controls */}
                                <div className="absolute top-0 left-0 right-0 z-50 p-3 sm:p-6 flex justify-between items-start pointer-events-none">
                                    {/* Info Card - Compact on mobile */}
                                    <div className="pointer-events-auto max-w-[70%] sm:max-w-none">
                                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-6 shadow-2xl">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5 sm:mb-1">Fournisseur</span>
                                                <h2 className="text-base sm:text-2xl font-black text-white tracking-tight leading-none truncate">{viewingData.supplier_name}</h2>
                                                {viewingData.details && (
                                                    <p className="text-[9px] sm:text-[10px] font-medium text-[#c69f6e] mt-0.5 sm:mt-1 truncate max-w-[150px] sm:max-w-xs">{viewingData.details}</p>
                                                )}
                                            </div>
                                            <div className="w-px h-8 sm:h-10 bg-white/10 hidden sm:block" />
                                            <div className="flex flex-col items-end hidden sm:flex">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#c69f6e] mb-1">Montant</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-white tracking-tight">
                                                        {parseFloat(viewingData.amount || '0').toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#c69f6e]">DT</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Close button - Always visible top right */}
                                    <button onClick={() => setViewingData(null)} className="w-10 h-10 sm:w-14 sm:h-14 bg-black/60 hover:bg-black/80 border border-white/10 rounded-full flex items-center justify-center transition-all text-white backdrop-blur-md pointer-events-auto"><X size={20} className="sm:w-8 sm:h-8" /></button>
                                </div>

                                {/* Desktop Controls - Hidden on mobile */}
                                <div className="absolute top-20 right-6 z-50 pointer-events-none hidden sm:block">
                                    <div className="flex items-center gap-4 pointer-events-auto">
                                        <div className="flex bg-white/10 rounded-2xl p-1 gap-1 border border-white/10 backdrop-blur-md">
                                            <button onClick={() => setImgZoom(prev => Math.max(0.5, prev - 0.25))} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Zoom Arrière"><ZoomOut size={20} /></button>
                                            <div className="w-16 flex items-center justify-center font-black text-xs tabular-nums text-[#c69f6e]">{Math.round(imgZoom * 100)}%</div>
                                            <button onClick={() => setImgZoom(prev => Math.min(5, prev + 0.25))} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Zoom Avant"><ZoomIn size={20} /></button>
                                            <div className="w-px h-6 bg-white/10 self-center mx-1"></div>
                                            <button onClick={() => setImgRotation(prev => prev + 90)} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Tourner"><RotateCcw size={20} /></button>
                                            <button onClick={resetView} className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white" title="Réinitialiser"><Maximize2 size={20} /></button>
                                            <div className="w-px h-6 bg-white/10 self-center mx-1"></div>
                                            <button
                                                onClick={() => {
                                                    let allPhotos: string[] = [];
                                                    try {
                                                        const p = JSON.parse(viewingData.photos || '[]');
                                                        allPhotos = Array.isArray(p) ? p : [];
                                                    } catch (e) { allPhotos = []; }
                                                    if (viewingData.photo_url && !allPhotos.includes(viewingData.photo_url)) {
                                                        allPhotos = [viewingData.photo_url, ...allPhotos];
                                                    }
                                                    if (viewingData.photo_cheque_url) allPhotos.push(viewingData.photo_cheque_url);
                                                    if (viewingData.photo_verso_url) allPhotos.push(viewingData.photo_verso_url);
                                                    const activeIndex = viewingData.selectedIndex || 0;
                                                    const activePhoto = allPhotos[activeIndex];
                                                    if (activePhoto) {
                                                        const link = document.createElement('a');
                                                        link.href = activePhoto;
                                                        link.download = `${viewingData.supplier_name || 'facture'}_${activeIndex + 1}.${activePhoto.startsWith('data:application/pdf') || activePhoto.toLowerCase().includes('.pdf') ? 'pdf' : 'jpg'}`;
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }
                                                }}
                                                className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white"
                                                title="Télécharger"
                                            >
                                                <Download size={20} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    let allPhotos: string[] = [];
                                                    try {
                                                        const p = JSON.parse(viewingData.photos || '[]');
                                                        allPhotos = Array.isArray(p) ? p : [];
                                                    } catch (e) { allPhotos = []; }
                                                    if (viewingData.photo_url && !allPhotos.includes(viewingData.photo_url)) {
                                                        allPhotos = [viewingData.photo_url, ...allPhotos];
                                                    }
                                                    if (viewingData.photo_cheque_url) allPhotos.push(viewingData.photo_cheque_url);
                                                    if (viewingData.photo_verso_url) allPhotos.push(viewingData.photo_verso_url);
                                                    const activeIndex = viewingData.selectedIndex || 0;
                                                    const activePhoto = allPhotos[activeIndex];
                                                    if (activePhoto) {
                                                        try {
                                                            const isPdf = activePhoto.startsWith('data:application/pdf') || activePhoto.toLowerCase().includes('.pdf');
                                                            const fileName = `${viewingData.supplier_name || 'facture'}_${activeIndex + 1}.${isPdf ? 'pdf' : 'jpg'}`;
                                                            let blob: Blob;
                                                            if (activePhoto.startsWith('data:')) {
                                                                const byteString = atob(activePhoto.split(',')[1]);
                                                                const mimeType = activePhoto.split(',')[0].split(':')[1].split(';')[0];
                                                                const ab = new ArrayBuffer(byteString.length);
                                                                const ia = new Uint8Array(ab);
                                                                for (let i = 0; i < byteString.length; i++) {
                                                                    ia[i] = byteString.charCodeAt(i);
                                                                }
                                                                blob = new Blob([ab], { type: mimeType });
                                                            } else {
                                                                const response = await fetch(activePhoto);
                                                                blob = await response.blob();
                                                            }
                                                            const file = new File([blob], fileName, { type: isPdf ? 'application/pdf' : 'image/jpeg' });
                                                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                                await navigator.share({ files: [file], title: `Facture - ${viewingData.supplier_name}` });
                                                            } else if (navigator.share) {
                                                                await navigator.share({ title: `Facture - ${viewingData.supplier_name}`, text: `Facture de ${viewingData.supplier_name} - ${parseFloat(viewingData.amount || '0').toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT` });
                                                            } else {
                                                                const link = document.createElement('a');
                                                                link.href = activePhoto;
                                                                link.download = fileName;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }
                                                        } catch (err) {
                                                            console.error('Share failed:', err);
                                                        }
                                                    }
                                                }}
                                                className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all text-white"
                                                title="Partager"
                                            >
                                                <Share2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Action Buttons - Fixed at bottom right */}
                                <div className="absolute bottom-28 right-3 z-50 flex flex-col gap-2 pointer-events-auto sm:hidden">
                                    <button
                                        onClick={() => {
                                            let allPhotos: string[] = [];
                                            try {
                                                const p = JSON.parse(viewingData.photos || '[]');
                                                allPhotos = Array.isArray(p) ? p : [];
                                            } catch (e) { allPhotos = []; }
                                            if (viewingData.photo_url && !allPhotos.includes(viewingData.photo_url)) {
                                                allPhotos = [viewingData.photo_url, ...allPhotos];
                                            }
                                            if (viewingData.photo_cheque_url) allPhotos.push(viewingData.photo_cheque_url);
                                            if (viewingData.photo_verso_url) allPhotos.push(viewingData.photo_verso_url);
                                            const activeIndex = viewingData.selectedIndex || 0;
                                            const activePhoto = allPhotos[activeIndex];
                                            if (activePhoto) {
                                                const link = document.createElement('a');
                                                link.href = activePhoto;
                                                link.download = `${viewingData.supplier_name || 'facture'}_${activeIndex + 1}.${activePhoto.startsWith('data:application/pdf') || activePhoto.toLowerCase().includes('.pdf') ? 'pdf' : 'jpg'}`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }
                                        }}
                                        className="w-12 h-12 bg-black/60 hover:bg-black/80 border border-white/10 rounded-full flex items-center justify-center transition-all text-white backdrop-blur-md"
                                        title="Télécharger"
                                    >
                                        <Download size={20} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            let allPhotos: string[] = [];
                                            try {
                                                const p = JSON.parse(viewingData.photos || '[]');
                                                allPhotos = Array.isArray(p) ? p : [];
                                            } catch (e) { allPhotos = []; }
                                            if (viewingData.photo_url && !allPhotos.includes(viewingData.photo_url)) {
                                                allPhotos = [viewingData.photo_url, ...allPhotos];
                                            }
                                            if (viewingData.photo_cheque_url) allPhotos.push(viewingData.photo_cheque_url);
                                            if (viewingData.photo_verso_url) allPhotos.push(viewingData.photo_verso_url);
                                            const activeIndex = viewingData.selectedIndex || 0;
                                            const activePhoto = allPhotos[activeIndex];
                                            if (activePhoto) {
                                                try {
                                                    const isPdf = activePhoto.startsWith('data:application/pdf') || activePhoto.toLowerCase().includes('.pdf');
                                                    const fileName = `${viewingData.supplier_name || 'facture'}_${activeIndex + 1}.${isPdf ? 'pdf' : 'jpg'}`;
                                                    let blob: Blob;
                                                    if (activePhoto.startsWith('data:')) {
                                                        const byteString = atob(activePhoto.split(',')[1]);
                                                        const mimeType = activePhoto.split(',')[0].split(':')[1].split(';')[0];
                                                        const ab = new ArrayBuffer(byteString.length);
                                                        const ia = new Uint8Array(ab);
                                                        for (let i = 0; i < byteString.length; i++) {
                                                            ia[i] = byteString.charCodeAt(i);
                                                        }
                                                        blob = new Blob([ab], { type: mimeType });
                                                    } else {
                                                        const response = await fetch(activePhoto);
                                                        blob = await response.blob();
                                                    }
                                                    const file = new File([blob], fileName, { type: isPdf ? 'application/pdf' : 'image/jpeg' });
                                                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                        await navigator.share({ files: [file], title: `Facture - ${viewingData.supplier_name}` });
                                                    } else if (navigator.share) {
                                                        await navigator.share({ title: `Facture - ${viewingData.supplier_name}`, text: `Facture de ${viewingData.supplier_name} - ${parseFloat(viewingData.amount || '0').toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT` });
                                                    } else {
                                                        const link = document.createElement('a');
                                                        link.href = activePhoto;
                                                        link.download = fileName;
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }
                                                } catch (err) {
                                                    console.error('Share failed:', err);
                                                }
                                            }
                                        }}
                                        className="w-12 h-12 bg-[#c69f6e] hover:bg-[#b8916a] border border-white/10 rounded-full flex items-center justify-center transition-all text-white backdrop-blur-md"
                                        title="Partager"
                                    >
                                        <Share2 size={20} />
                                    </button>
                                </div>

                                {/* Main Image Area */}
                                <div ref={imageContainerRef} className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
                                    {(() => {
                                        // Combine all photos into a single list clearly
                                        let allPhotos: string[] = [];
                                        try {
                                            const p = JSON.parse(viewingData.photos || '[]');
                                            allPhotos = Array.isArray(p) ? p : [];
                                        } catch (e) { allPhotos = []; }

                                        if (viewingData.photo_url && !allPhotos.includes(viewingData.photo_url)) {
                                            allPhotos = [viewingData.photo_url, ...allPhotos];
                                        }
                                        // Add Cheques if present
                                        if (viewingData.photo_cheque_url) allPhotos.push(viewingData.photo_cheque_url);
                                        if (viewingData.photo_verso_url) allPhotos.push(viewingData.photo_verso_url);

                                        const activeIndex = viewingData.selectedIndex || 0;

                                        if (allPhotos.length === 0) return (
                                            <div className="flex flex-col items-center justify-center text-white/20 italic font-bold uppercase tracking-widest gap-4">
                                                <UploadCloud size={64} className="opacity-50" />
                                                <span>Aucun document disponible</span>
                                            </div>
                                        );

                                        const activePhoto = allPhotos[activeIndex];

                                        return (
                                            <motion.div
                                                className={`w-full h-full flex items-center justify-center p-4 ${imgZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                                                onWheel={(e) => {
                                                    // e.preventDefault(); 
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
                                                {activePhoto?.startsWith('data:application/pdf') || activePhoto?.toLowerCase().includes('.pdf') ? (
                                                    <iframe src={activePhoto} className="w-[80%] h-[90%] rounded-2xl border-none bg-white shadow-2xl pointer-events-auto" title="Document PDF" />
                                                ) : (
                                                    <img
                                                        src={activePhoto}
                                                        draggable="false"
                                                        className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
                                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                                    />
                                                )}
                                            </motion.div>
                                        );
                                    })()}
                                </div>

                                {imgZoom !== 1 && (
                                    <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none z-[100]">
                                        <span className="bg-black/80 backdrop-blur-xl text-[10px] font-black text-[#c69f6e] px-6 py-3 rounded-full border border-[#c69f6e]/30 shadow-2xl uppercase tracking-[0.2em]">
                                            Zoom: {Math.round(imgZoom * 100)}% • Rotation: {imgRotation}°
                                        </span>
                                    </div>
                                )}

                                {/* Bottom Thumbnails */}
                                <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center gap-3 overflow-x-auto no-scrollbar max-w-[90vw] pointer-events-auto">
                                        {(() => {
                                            let allPhotos: string[] = [];
                                            try {
                                                const p = JSON.parse(viewingData.photos || '[]');
                                                allPhotos = Array.isArray(p) ? p : [];
                                            } catch (e) { allPhotos = []; }

                                            if (viewingData.photo_url && !allPhotos.includes(viewingData.photo_url)) {
                                                allPhotos = [viewingData.photo_url, ...allPhotos];
                                            }
                                            if (viewingData.photo_cheque_url) allPhotos.push(viewingData.photo_cheque_url);
                                            if (viewingData.photo_verso_url) allPhotos.push(viewingData.photo_verso_url);

                                            const activeIndex = viewingData.selectedIndex || 0;

                                            return allPhotos.map((photo, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setViewingData({ ...viewingData, selectedIndex: idx });
                                                        setImgZoom(1);
                                                        setImgRotation(0);
                                                    }}
                                                    className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all flex-shrink-0 border-2 ${idx === activeIndex ? 'border-[#c69f6e] scale-110' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'} `}
                                                >
                                                    {photo.startsWith('data:application/pdf') || photo.toLowerCase().includes('.pdf') ? (
                                                        <div className="w-full h-full bg-white flex items-center justify-center text-red-500 font-bold text-[8px]">PDF</div>
                                                    ) : (
                                                        <img src={photo} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence>

            {/* Edit Invoice Modal */}
            <AnimatePresence>
                {
                    showEditModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[150] bg-[#4a3426]/60 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => setShowEditModal(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-[1.5rem] w-full max-w-lg max-h-[96vh] overflow-y-auto shadow-2xl border border-white/20 custom-scrollbar m-auto"
                            >
                                <div className="p-3 bg-[#4a3426] text-white relative rounded-t-[1.5rem]">
                                    <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                        <Edit2 size={20} className="text-[#c69f6e]" />
                                        Modifier Facture
                                    </h2>
                                    <button onClick={() => setShowEditModal(null)} className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-4 space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Fournisseur / Elément</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                                            <select
                                                value={showEditModal.supplier_name}
                                                onChange={(e) => setShowEditModal({ ...showEditModal, supplier_name: e.target.value })}
                                                className="w-full h-10 pl-10 pr-10 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-bold text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all appearance-none text-xs"
                                            >
                                                <option value="">Sélectionner</option>
                                                {data?.getSuppliers.map((s: any) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                                                {data?.getDesignations.map((d: any) => (<option key={d.id} value={d.name}>{d.name}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Document & N°</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex gap-1">
                                                {['Facture', 'BL'].map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setShowEditModal({ ...showEditModal, doc_type: t })}
                                                        className={`flex-1 h-8 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${showEditModal.doc_type === t
                                                            ? 'bg-[#d00000] text-white border-[#d00000] shadow-md shadow-[#d00000]/10'
                                                            : 'bg-white text-[#8c8279] border-[#e6dace] hover:border-[#d00000]/20'
                                                            }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex-[1.2] relative">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="N° optional"
                                                    value={showEditModal.doc_number}
                                                    onChange={(e) => setShowEditModal({ ...showEditModal, doc_number: e.target.value })}
                                                    className="w-full h-8 pl-9 pr-3 bg-[#f9f6f2] border border-[#e6dace] rounded-lg font-bold text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all text-[11px]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Montant (DT)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c69f6e]" size={16} />
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="0.000"
                                                    value={showEditModal.amount}
                                                    onChange={(e) => setShowEditModal({ ...showEditModal, amount: e.target.value })}
                                                    className="w-full h-12 pl-9 pr-3 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-black text-xl text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all min-w-[180px]"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Date Facture</label>
                                            <div className="scale-[0.9] origin-top-left -mb-2">
                                                <PremiumDatePicker
                                                    label="Date"
                                                    value={showEditModal.date}
                                                    onChange={(val) => setShowEditModal({ ...showEditModal, date: val })}
                                                    lockedDates={lockedDates}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Détails (Optionnel)</label>
                                        <textarea
                                            value={showEditModal.details}
                                            onChange={(e) => setShowEditModal({ ...showEditModal, details: e.target.value })}
                                            placeholder="Détails supplémentaires..."
                                            className="w-full h-16 p-3 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-medium text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all text-[11px] resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-1 block ml-1">Photos ({showEditModal.photos.length}/5)</label>
                                        <div className="grid grid-cols-5 gap-2 mb-2">
                                            {showEditModal.photos.map((p: string, i: number) => (
                                                <div key={i} className="aspect-square bg-[#fcfaf8] border border-[#e6dace] rounded-lg relative group overflow-hidden">
                                                    <img src={p} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => setShowEditModal({ ...showEditModal, photos: showEditModal.photos.filter((_: any, idx: number) => idx !== i) })}
                                                        className="absolute top-0.5 right-0.5 bg-red-500 text-white p-1 rounded-full opacity-100 transition-all shadow-md"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {showEditModal.photos.length < 5 && (
                                                <button
                                                    onClick={() => document.getElementById('edit-upload')?.click()}
                                                    className="aspect-square bg-[#fcfaf8] border border-dashed border-[#e6dace] rounded-lg flex items-center justify-center text-[#c69f6e] hover:border-[#c69f6e] hover:bg-[#fcfaf8] transition-all"
                                                >
                                                    <Plus size={18} />
                                                    <input
                                                        id="edit-upload"
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const files = e.target.files;
                                                            if (files && files.length > 0) {
                                                                const results = await Promise.all(Array.from(files).map(file => {
                                                                    return new Promise<string>((resolve) => {
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = async () => {
                                                                            const base64 = reader.result as string;
                                                                            const compressed = await compressImage(base64);
                                                                            resolve(compressed);
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    });
                                                                }));
                                                                setShowEditModal({
                                                                    ...showEditModal,
                                                                    photos: [...showEditModal.photos, ...results].slice(0, 5)
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUpdateInvoice(showEditModal)}
                                        className="w-full h-11 bg-[#4a3426] text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#38261b] transition-all shadow-lg"
                                    >
                                        Enregistrer les modifications
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!showConfirm}
                onClose={() => setShowConfirm(null)}
                onConfirm={showConfirm?.onConfirm}
                title={showConfirm?.title}
                message={showConfirm?.message}
                color={showConfirm?.color}
                alert={showConfirm?.alert}
            />



            {/* Choice Modal for Adding Section */}
            <AnimatePresence>
                {
                    showChoiceModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setShowChoiceModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-[#e6dace]"
                            >
                                <div className="p-8 bg-[#4a3426] text-white relative">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Ajouter Section</h3>
                                    <p className="text-xs opacity-60 font-bold uppercase tracking-widest mt-1">Choisissez le type d'élément à ajouter</p>
                                    <button onClick={() => setShowChoiceModal(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="p-8 grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'Fournisseur', label: 'Ajouter Fournisseur', desc: 'Pour les factures de marchandises', icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { id: 'Divers', label: 'Ajouter Divers', desc: 'Pour les charges exceptionnelles', icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-50' }
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setNewName({ name: '', section: item.id as any });
                                                setShowChoiceModal(false);
                                                setShowAddNameModal(true);
                                            }}
                                            className="flex items-center gap-6 p-6 rounded-3xl border-2 border-transparent hover:border-[#4a3426] hover:bg-[#fcfaf8] transition-all group text-left"
                                        >
                                            <div className={`w-16 h-16 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                                                <item.icon size={32} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-lg font-black text-[#4a3426] uppercase tracking-tight">{item.label}</h4>
                                                <p className="text-sm text-[#8c8279] font-medium">{item.desc}</p>
                                            </div>
                                            <Plus size={24} className="text-[#e6dace] group-hover:text-[#4a3426] transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Add Name Modal */}
            <AnimatePresence>
                {
                    showAddNameModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[210] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setShowAddNameModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-[#e6dace]"
                            >
                                <div className="p-6 bg-[#4a3426] text-white">
                                    <h3 className="text-lg font-black uppercase tracking-tight">Ajouter {newName.section}</h3>
                                    <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest mt-1">Section: {newName.section}</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c8279] mb-2 block ml-1">Nom / Désignation</label>
                                        <input
                                            type="text"
                                            placeholder={`Nom du ${newName.section.toLowerCase()}...`}
                                            value={newName.name}
                                            onChange={(e) => setNewName({ ...newName, name: e.target.value })}
                                            className="w-full h-12 px-4 bg-[#f9f6f2] border border-[#e6dace] rounded-xl font-bold text-[#4a3426] focus:border-[#c69f6e] outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                setShowAddNameModal(false);
                                                setShowChoiceModal(true);
                                            }}
                                            className="flex-1 h-12 bg-[#f9f6f2] text-[#8c8279] rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#ece6df] transition-all"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            onClick={handleAddName}
                                            disabled={!newName.name}
                                            className="flex-1 h-12 bg-[#4a3426] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#38261b] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                                        >
                                            Valider
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
