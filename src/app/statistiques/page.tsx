'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    Wallet, TrendingDown, TrendingUp, Calendar,
    BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
    ArrowUpRight, ArrowDownRight, LayoutDashboard, Filter, Download,
    Loader2, Users, Receipt, CreditCard, Banknote, Coins, X
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, Line, LineChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to safely parse JSON only once
const safeJsonParse = (str: string | null | undefined, fallback: any[] = []) => {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
};

const ChevronLeftComp = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>
);

const ChevronRightComp = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>
);

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
                            className={`absolute top-full lg:${align === 'right' ? 'right-0' : 'left-0'} -left-20 mt-3 bg-white rounded-[2rem] shadow-2xl border border-[#e6dace] p-6 z-[110] w-72`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <button
                                    type="button"
                                    onClick={() => setViewYear(viewYear - 1)}
                                    className="p-2 hover:bg-[#fcfaf8] rounded-xl text-[#8c8279] transition-colors"
                                >
                                    <ChevronLeftComp size={18} />
                                </button>
                                <span className="text-sm font-black text-[#4a3426] tracking-tighter">
                                    {viewYear}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewYear(viewYear + 1)}
                                    className="p-2 hover:bg-[#fcfaf8] rounded-xl text-[#8c8279] transition-colors"
                                >
                                    <ChevronRightComp size={18} />
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

const GET_STATS = gql`
  query GetStats($startDate: String!, $endDate: String!) {
    getChiffresByRange(startDate: $startDate, endDate: $endDate) {
      id
      date
      recette_de_caisse
      total_diponce
      diponce
      diponce_divers
      diponce_admin
      recette_net
      tpe
      cheque_bancaire
      espaces
      tickets_restaurant
      avances_details { id username montant }
      doublages_details { id username montant }
      extras_details { id username montant }
      primes_details { id username montant }
      restes_salaires_details { id username montant nb_jours }
    }
    getInvoices(payer: "riadh", startDate: $startDate, endDate: $endDate) {
      id
      supplier_name
      amount
      paid_date
    }
    getPaymentStats(startDate: $startDate, endDate: $endDate) {
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

const GET_SALARIES = gql`
  query GetSalaries($startDate: String!, $endDate: String!) {
    getMonthlySalaries(startDate: $startDate, endDate: $endDate) {
      month
      total
    }
  }
`;

const COLORS = ['#c69f6e', '#8c8279', '#4a3426', '#d4c5b0'];

export default function StatistiquesPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ role: 'admin' | 'caissier' } | null>(null);
    const [initializing, setInitializing] = useState(true);

    // Filter States
    const today = new Date();
    const ty = today.getFullYear();
    const tm = String(today.getMonth() + 1).padStart(2, '0');
    const td = String(today.getDate()).padStart(2, '0');
    const todayStr = `${ty}-${tm}-${td}`;

    // Filter States
    const [startDate, setStartDate] = useState(`${ty}-${tm}-01`);
    const [endDate, setEndDate] = useState(todayStr);
    const [selectedMonth, setSelectedMonth] = useState(todayStr.substring(0, 7));
    const [aggregation, setAggregation] = useState<'day' | 'month'>('day');

    const handleMonthChange = (monthStr: string) => {
        setSelectedMonth(monthStr);
        const [year, month] = monthStr.split('-').map(Number);
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        setStartDate(start);
        setEndDate(end);
        setAggregation('day');
    };

    const [selectedSupplier, setSelectedSupplier] = useState<string>('Tous');

    const [pickingDate, setPickingDate] = useState<'start' | 'end' | null>(null);
    const [viewDate, setViewDate] = useState(new Date());

    const [selectedExpensesData, setSelectedExpensesData] = useState<any>(null);

    const generateCalendarDays = (date: string | Date | number) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
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

    const { data, loading, error } = useQuery(GET_STATS, {
        variables: { startDate, endDate },
        skip: !startDate || !endDate
    });

    const { data: salaryData } = useQuery(GET_SALARIES, {
        variables: { startDate, endDate },
        skip: !startDate || !endDate
    });

    // Pre-parse all JSON data once to avoid repeated parsing
    const parsedData = useMemo(() => {
        if (!data?.getChiffresByRange) return null;

        const raw = data.getChiffresByRange;
        return raw.map((d: any) => ({
            ...d,
            _diponce: safeJsonParse(d.diponce),
            _diponce_divers: safeJsonParse(d.diponce_divers),
            _diponce_admin: safeJsonParse(d.diponce_admin),
            _recette: parseFloat(d.recette_de_caisse) || 0,
            _depenses: parseFloat(d.total_diponce) || 0,
            _net: parseFloat(d.recette_net) || 0,
            _tpe: parseFloat(d.tpe) || 0,
            _cheque: parseFloat(d.cheque_bancaire) || 0,
            _especes: parseFloat(d.espaces) || 0,
            _tickets: parseFloat(d.tickets_restaurant) || 0,
            _extras: (d.extras_details || []).reduce((acc: number, r: any) => acc + (parseFloat(r.montant) || 0), 0),
            _doublages: (d.doublages_details || []).reduce((acc: number, r: any) => acc + (parseFloat(r.montant) || 0), 0),
            _avances: (d.avances_details || []).reduce((acc: number, r: any) => acc + (parseFloat(r.montant) || 0), 0),
            _primes: (d.primes_details || []).reduce((acc: number, r: any) => acc + (parseFloat(r.montant) || 0), 0),
            _restes: (d.restes_salaires_details || []).reduce((acc: number, r: any) => acc + (parseFloat(r.montant) || 0), 0),
        }));
    }, [data]);

    const statsData = useMemo(() => {
        if (!parsedData) return [];

        if (aggregation === 'day') {
            return parsedData.map((d: any) => ({
                name: new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
                fullDate: d.date,
                recette: d._recette,
                depenses: d._depenses,
                net: d._net,
                tpe: d._tpe,
                cheque: d._cheque,
                especes: d._especes,
                tickets: d._tickets,
            }));
        }
        else {
            // Aggregate by month
            const months: Record<string, any> = {};
            parsedData.forEach((d: any) => {
                const m = d.date.substring(0, 7);
                if (!months[m]) {
                    months[m] = {
                        name: new Date(d.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                        recette: 0, depenses: 0, net: 0, tpe: 0, cheque: 0, especes: 0, tickets: 0, count: 0
                    };
                }
                months[m].recette += d._recette;
                months[m].depenses += d._depenses;
                months[m].net += d._net;
                months[m].tpe += d._tpe;
                months[m].cheque += d._cheque;
                months[m].especes += d._especes;
                months[m].tickets += d._tickets;
                months[m].count += 1;
            });
            return Object.values(months);
        }
    }, [parsedData, aggregation]);

    const riadhStatsData = useMemo(() => {
        if (!data?.getInvoices) return [];
        const raw = data.getInvoices;
        const groups: Record<string, any> = {};

        for (let i = 0; i < raw.length; i++) {
            const inv = raw[i];
            const dateStr = inv.paid_date;
            if (!dateStr) continue;
            const key = aggregation === 'day' ? dateStr : dateStr.substring(0, 7);
            if (!groups[key]) {
                groups[key] = {
                    name: aggregation === 'day'
                        ? new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                        : new Date(dateStr).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    depenses: 0,
                    fullDate: dateStr,
                    details: []
                };
            }
            const amount = parseFloat(inv.amount) || 0;
            groups[key].depenses += amount;
            groups[key].details.push({
                supplier: inv.supplier_name,
                amount: amount
            });
        }

        return Object.values(groups).sort((a: any, b: any) => a.fullDate.localeCompare(b.fullDate));
    }, [data, aggregation]);

    const totals = useMemo(() => {
        if (data?.getPaymentStats) {
            const s = data.getPaymentStats;
            return {
                recette: parseFloat(s.totalRecetteCaisse) || 0,
                depenses: parseFloat(s.totalExpenses) || 0,
                net: parseFloat(s.totalRecetteNette) || 0,
                tpe: parseFloat(s.totalTPE) || 0,
                cheque: parseFloat(s.totalCheque) || 0,
                especes: parseFloat(s.totalCash) || 0,
                tickets: parseFloat(s.totalTicketsRestaurant) || 0,
            };
        }
        let recette = 0, depenses = 0, net = 0, tpe = 0, cheque = 0, especes = 0, tickets = 0;
        for (let i = 0; i < statsData.length; i++) {
            const curr = statsData[i];
            recette += curr.recette;
            depenses += curr.depenses;
            net += curr.net;
            tpe += curr.tpe;
            cheque += curr.cheque;
            especes += curr.especes;
            tickets += curr.tickets;
        }
        return { recette, depenses, net, tpe, cheque, especes, tickets };
    }, [statsData, data]);

    const supplierData = useMemo(() => {
        if (!parsedData) return [];
        const res: Record<string, number> = {};
        const excluded = new Set(['RIADH', 'MALIKA', 'SALAIRES']);

        for (let i = 0; i < parsedData.length; i++) {
            const items = parsedData[i]._diponce;
            for (let j = 0; j < items.length; j++) {
                const e = items[j];
                const name = e.supplier || e.designation || e.name || 'Divers';
                if (!excluded.has(name.toUpperCase())) {
                    res[name] = (res[name] || 0) + (parseFloat(e.amount) || 0);
                }
            }
        }

        return Object.entries(res)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [parsedData]);

    const diversData = useMemo(() => {
        if (!parsedData) return [];
        const res: Record<string, number> = {};
        const excluded = new Set(['RIADH', 'MALIKA', 'SALAIRES']);

        for (let i = 0; i < parsedData.length; i++) {
            const d = parsedData[i];
            const items = [...d._diponce_divers, ...d._diponce_admin];
            for (let j = 0; j < items.length; j++) {
                const e = items[j];
                const name = e.designation || e.name || e.supplier || 'Divers';
                if (!excluded.has(name.toUpperCase())) {
                    res[name] = (res[name] || 0) + (parseFloat(e.amount) || 0);
                }
            }
        }

        return Object.entries(res)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [parsedData]);

    const laborData = useMemo(() => {
        if (!parsedData) return [];

        if (aggregation === 'day') {
            const result = [];
            for (let i = 0; i < parsedData.length; i++) {
                const d = parsedData[i];
                const dayAdvances = d._avances;
                if (dayAdvances > 0) {
                    result.push({
                        name: new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
                        total: dayAdvances,
                        details: (d.avances_details || []).map((r: any) => ({
                            name: r.username,
                            value: parseFloat(r.montant) || 0
                        })),
                        type: 'Journalier'
                    });
                }
            }
            return result;
        } else {
            const months: Record<string, { total: number, details: Record<string, number> }> = {};
            for (let i = 0; i < parsedData.length; i++) {
                const d = parsedData[i];
                const mKey = d.date.substring(0, 7);
                if (!months[mKey]) months[mKey] = { total: 0, details: {} };

                months[mKey].total += d._avances;

                const avances = d.avances_details || [];
                for (let j = 0; j < avances.length; j++) {
                    const r = avances[j];
                    const name = r.username;
                    const amt = parseFloat(r.montant) || 0;
                    months[mKey].details[name] = (months[mKey].details[name] || 0) + amt;
                }
            }

            return Object.entries(months)
                .filter(([_, val]) => val.total > 0)
                .map(([m, val]) => ({
                    name: new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    total: val.total,
                    details: Object.entries(val.details).map(([name, value]) => ({ name, value })),
                    type: 'Aggregated'
                }));
        }
    }, [parsedData, aggregation]);

    const intelligentInsights = useMemo(() => {
        if (statsData.length === 0) return null;
        let bestPeriod = statsData[0];
        let worstPeriod = statsData[0];
        for (let i = 1; i < statsData.length; i++) {
            if (statsData[i].recette > bestPeriod.recette) bestPeriod = statsData[i];
            if (statsData[i].recette < worstPeriod.recette) worstPeriod = statsData[i];
        }
        const avgNet = totals.net / statsData.length;
        const totalProfitMargin = (totals.net / (totals.recette || 1)) * 100;
        return { bestPeriod, worstPeriod, avgNet, totalProfitMargin };
    }, [statsData, totals]);

    const aggregatedExpensesDetailed = useMemo(() => {
        if (!parsedData) return { data: [], suppliers: [], categoryGroups: [], colorMap: {} };

        // Separate categories by type
        const diversTotals: Record<string, number> = {};
        const adminTotals: Record<string, number> = {};
        const fournisseurTotals: Record<string, number> = {};
        const payrollTotals: Record<string, number> = {
            'EXTRA': 0,
            'DOUBLAGE': 0,
            'ACCOMPTE': 0,
            'PRIMES': 0,
            'TOUS EMPLOYÉS': 0
        };

        for (let i = 0; i < parsedData.length; i++) {
            const d = parsedData[i];

            // Process DÉPENSES DIVERS
            const divers = d._diponce_divers;
            for (let j = 0; j < divers.length; j++) {
                const e = divers[j];
                const name = e.designation || e.name || 'Divers';
                diversTotals[name] = (diversTotals[name] || 0) + (parseFloat(e.amount) || 0);
            }

            // Process DÉPENSES ADMINISTRATIF
            const admin = d._diponce_admin;
            for (let j = 0; j < admin.length; j++) {
                const e = admin[j];
                const name = e.designation || e.name || 'Admin';
                adminTotals[name] = (adminTotals[name] || 0) + (parseFloat(e.amount) || 0);
            }

            // Process DÉPENSES FOURNISSEURS
            const diponce = d._diponce;
            for (let j = 0; j < diponce.length; j++) {
                const e = diponce[j];
                const name = e.supplier || e.name || 'Fournisseur';
                fournisseurTotals[name] = (fournisseurTotals[name] || 0) + (parseFloat(e.amount) || 0);
            }

            // Add payroll totals
            payrollTotals['EXTRA'] += d._extras;
            payrollTotals['DOUBLAGE'] += d._doublages;
            payrollTotals['ACCOMPTE'] += d._avances;
            payrollTotals['PRIMES'] += d._primes;
        }

        // Add monthly salaries to TOUS EMPLOYÉS
        const salaries = salaryData?.getMonthlySalaries || [];
        for (let i = 0; i < salaries.length; i++) {
            payrollTotals['TOUS EMPLOYÉS'] += parseFloat(salaries[i].total) || 0;
        }

        // Build ordered supplier list
        const orderedSuppliers: string[] = [];

        // 1. DÉPENSES DIVERS (sorted by amount)
        Object.entries(diversTotals)
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name]) => orderedSuppliers.push(name));

        // 2. DÉPENSES ADMINISTRATIF (sorted by amount)
        Object.entries(adminTotals)
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name]) => orderedSuppliers.push(name));

        // 3. DÉPENSES FOURNISSEURS (sorted by amount)
        Object.entries(fournisseurTotals)
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name]) => orderedSuppliers.push(name));

        // 4. Payroll categories in specific order
        const payrollCats = ['EXTRA', 'DOUBLAGE', 'ACCOMPTE', 'PRIMES', 'TOUS EMPLOYÉS'];
        for (let i = 0; i < payrollCats.length; i++) {
            if (payrollTotals[payrollCats[i]] > 0) {
                orderedSuppliers.push(payrollCats[i]);
            }
        }

        const aggregated: Record<string, any> = {};
        for (let i = 0; i < parsedData.length; i++) {
            const d = parsedData[i];
            const key = aggregation === 'day' ? d.date : d.date.substring(0, 7);
            if (!aggregated[key]) {
                aggregated[key] = {
                    name: aggregation === 'day'
                        ? new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                        : new Date(d.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    total: 0
                };
                for (let j = 0; j < orderedSuppliers.length; j++) {
                    aggregated[key][orderedSuppliers[j]] = 0;
                }
            }

            // Add divers
            const divers = d._diponce_divers;
            for (let j = 0; j < divers.length; j++) {
                const e = divers[j];
                const name = e.designation || e.name || 'Divers';
                const amt = parseFloat(e.amount) || 0;
                aggregated[key][name] = (aggregated[key][name] || 0) + amt;
                aggregated[key].total += amt;
            }

            // Add admin
            const admin = d._diponce_admin;
            for (let j = 0; j < admin.length; j++) {
                const e = admin[j];
                const name = e.designation || e.name || 'Admin';
                const amt = parseFloat(e.amount) || 0;
                aggregated[key][name] = (aggregated[key][name] || 0) + amt;
                aggregated[key].total += amt;
            }

            // Add fournisseurs
            const diponce = d._diponce;
            for (let j = 0; j < diponce.length; j++) {
                const e = diponce[j];
                const name = e.supplier || e.name || 'Fournisseur';
                const amt = parseFloat(e.amount) || 0;
                aggregated[key][name] = (aggregated[key][name] || 0) + amt;
                aggregated[key].total += amt;
            }

            // Add payroll expenses per day
            aggregated[key]['EXTRA'] += d._extras;
            aggregated[key]['DOUBLAGE'] += d._doublages;
            aggregated[key]['ACCOMPTE'] += d._avances;
            aggregated[key]['PRIMES'] += d._primes;
            aggregated[key]['TOUS EMPLOYÉS'] += d._restes;
            aggregated[key].total += d._extras + d._doublages + d._avances + d._primes + d._restes;
        }

        // Build category groups for legend
        const categoryGroups: Array<{ title: string, items: string[] }> = [];

        const diversItems = Object.entries(diversTotals)
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);
        if (diversItems.length > 0) {
            categoryGroups.push({ title: 'DÉPENSES DIVERS', items: diversItems });
        }

        const adminItems = Object.entries(adminTotals)
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);
        if (adminItems.length > 0) {
            categoryGroups.push({ title: 'DÉPENSES ADMINISTRATIF', items: adminItems });
        }

        const fournisseurItems = Object.entries(fournisseurTotals)
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);
        if (fournisseurItems.length > 0) {
            categoryGroups.push({ title: 'DÉPENSES FOURNISSEURS', items: fournisseurItems });
        }

        const payrollItems = payrollCats.filter(cat => payrollTotals[cat] > 0);
        if (payrollItems.length > 0) {
            categoryGroups.push({ title: 'MAIN D\'OEUVRE', items: payrollItems });
        }

        // Generate dynamic unique colors for each supplier
        const colorMap: Record<string, string> = {};

        // Fixed colors for MAIN D'OEUVRE categories - VERY distinct colors
        const fixedColors: Record<string, string> = {
            'DOUBLAGE': '#78716c',
            'EXTRA': '#22c55e',
            'ACCOMPTE': '#f97316',
            'PRIMES': '#06b6d4',
            'TOUS EMPLOYÉS': '#3b82f6',
        };

        // Predefined array of VERY distinct colors for dynamic items
        const distinctColors = [
            '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
            '#6366f1', '#84cc16', '#0891b2', '#d946ef', '#059669',
            '#dc2626', '#7c3aed', '#db2777', '#0d9488', '#ca8a04',
            '#4f46e5', '#65a30d', '#0e7490', '#c026d3', '#047857',
        ];

        let dynamicIdx = 0;
        for (let i = 0; i < orderedSuppliers.length; i++) {
            const name = orderedSuppliers[i];
            if (fixedColors[name]) {
                colorMap[name] = fixedColors[name];
            } else {
                colorMap[name] = distinctColors[dynamicIdx % distinctColors.length];
                dynamicIdx++;
            }
        }

        return { data: Object.values(aggregated), suppliers: orderedSuppliers, categoryGroups, colorMap };
    }, [parsedData, aggregation, salaryData]);

    const allAvailableSuppliers = useMemo(() => {
        if (!parsedData) return [];
        const s = new Set<string>();
        for (let i = 0; i < parsedData.length; i++) {
            const exps = parsedData[i]._diponce;
            for (let j = 0; j < exps.length; j++) {
                if (exps[j].supplier) s.add(exps[j].supplier);
            }
        }
        return Array.from(s).sort();
    }, [parsedData]);

    if (initializing || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
            <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8f5f2] text-[#2d241e] font-sans flex">
            <Sidebar role="admin" />

            <div className="flex-1 min-w-0 pb-24 lg:pb-0">
                {/* Header */}
                <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-[#e6dace] py-3 md:py-6 px-4 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 md:gap-4 transition-all">
                    <div className="flex items-center justify-between w-full xl:w-auto">
                        <div className="flex flex-col">
                            <h1 className="text-lg md:text-2xl font-black text-[#4a3426] tracking-tight uppercase leading-tight">Analytique Bey</h1>
                            <p className="text-[8px] md:text-xs text-[#8c8279] font-bold uppercase tracking-widest mt-1 opacity-60">Intelligence & Performance</p>
                        </div>

                        {/* Mobile Stats Toggle (Placeholder if needed) */}
                        <div className="xl:hidden flex items-center gap-2">
                            <div className="flex bg-[#f4ece4] p-1 rounded-xl">
                                <button
                                    onClick={() => setAggregation('day')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${aggregation === 'day' ? 'bg-[#4a3426] text-white' : 'text-[#8c8279]'}`}
                                >
                                    Jour
                                </button>
                                <button
                                    onClick={() => setAggregation('month')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${aggregation === 'month' ? 'bg-[#4a3426] text-white' : 'text-[#8c8279]'}`}
                                >
                                    Mois
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
                        {intelligentInsights && (
                            <div className="hidden lg:flex items-center gap-4 mr-4 px-4 py-2 bg-[#2d6a4f]/5 rounded-2xl border border-[#2d6a4f]/10">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-[#2d6a4f] uppercase tracking-tighter">Marge Moyenne</span>
                                    <span className="text-sm font-black text-[#2d6a4f]">{intelligentInsights.totalProfitMargin.toFixed(1)}%</span>
                                </div>
                                <div className="w-px h-6 bg-[#2d6a4f]/20"></div>
                                <div className="flex flex-col">
                                    <PremiumMonthPicker value={selectedMonth} onChange={handleMonthChange} align="right" />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[#f4ece4] p-1.5 rounded-2xl border border-[#e6dace]">
                            <button
                                onClick={() => { setPickingDate('start'); setViewDate(new Date(startDate)); }}
                                className="flex-1 bg-white border border-[#e6dace]/50 rounded-xl text-[11px] font-black text-[#4a3426] py-1.5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {formatDateDisplay(startDate)}
                            </button>
                            <span className="text-[#c69f6e] font-black text-xs px-1">/</span>
                            <button
                                onClick={() => { setPickingDate('end'); setViewDate(new Date(endDate)); }}
                                className="flex-1 bg-white border border-[#e6dace]/50 rounded-xl text-[11px] font-black text-[#4a3426] py-1.5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {formatDateDisplay(endDate)}
                            </button>
                        </div>

                        <div className="hidden xl:flex bg-[#f4ece4] p-1 rounded-xl">
                            <button
                                onClick={() => setAggregation('day')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${aggregation === 'day' ? 'bg-[#4a3426] text-white shadow-md' : 'text-[#8c8279]'}`}
                            >
                                Journalier
                            </button>
                            <button
                                onClick={() => setAggregation('month')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${aggregation === 'month' ? 'bg-[#4a3426] text-white shadow-md' : 'text-[#8c8279]'}`}
                            >
                                Mensuel
                            </button>
                        </div>

                        <div className="relative flex-1 md:flex-none min-w-[140px]">
                            <select
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="w-full bg-[#f4ece4] border border-[#e6dace] rounded-2xl h-11 px-4 text-[11px] font-black uppercase text-[#4a3426] outline-none appearance-none cursor-pointer pr-10 shadow-sm transition-all focus:border-[#c69f6e]"
                            >
                                <option value="Tous">Tous Fournisseurs</option>
                                {allAvailableSuppliers.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#c69f6e]">
                                <Filter size={14} />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-[1600px] mx-auto px-4 md:px-8 mt-8 space-y-8">
                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Recette Totale', val: totals.recette, icon: Wallet, color: 'text-blue-700', bg: 'bg-blue-50' },
                            { label: 'Dépenses', val: totals.depenses, icon: TrendingDown, color: 'text-red-700', bg: 'bg-red-50' },
                            { label: 'Reste net', val: totals.net, icon: TrendingUp, color: 'text-green-700', bg: 'bg-green-50' },
                            { label: 'Moyenne Recette', val: totals.recette / (statsData.length || 1), icon: BarChart3, color: 'text-[#c69f6e]', bg: 'bg-[#f4ece4]' }
                        ].map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="bg-white p-6 rounded-3xl luxury-shadow border border-[#e6dace]/50 group hover:border-[#c69f6e]/50 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}>
                                        <s.icon size={20} />
                                    </div>

                                </div>
                                <p className="text-[#8c8279] text-[10px] items-center font-bold uppercase tracking-widest mb-1">{s.label}</p>
                                <h3 className={`text-2xl font-black text-[#4a3426]`}>
                                    {s.val.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-xs font-bold opacity-40">DT</span>
                                </h3>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main Analytics Chart */}
                    <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50 relative overflow-hidden">
                        <div className="mb-10">
                            <h3 className="text-xl font-bold text-[#4a3426] flex items-center gap-2">
                                <LineChartIcon className="text-[#c69f6e]" /> Evolution du Journalier

                            </h3>
                            <p className="text-xs text-[#8c8279] mt-1">Analyse détaillée du flux de trésorerie sur la période sélectionnée</p>
                        </div>

                        <div className="h-[300px] md:h-[400px] lg:h-[450px] w-full">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
                                    <p className="text-sm font-bold text-[#8c8279]">Chargement de l'intelligence...</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={statsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRecette" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#c69f6e" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#c69f6e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e6dd" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={(props) => {
                                                const { x, y, payload } = props;
                                                const dataPoint = statsData.find((d: any) => d.name === payload.value);
                                                return (
                                                    <g transform={`translate(${x},${y})`}>
                                                        <text
                                                            x={0}
                                                            y={0}
                                                            dy={10}
                                                            textAnchor="middle"
                                                            fill="#8c8279"
                                                            fontSize={11}
                                                            fontWeight="bold"
                                                        >
                                                            {payload.value}
                                                        </text>
                                                        {dataPoint && (
                                                            <text
                                                                x={0}
                                                                y={0}
                                                                dy={24}
                                                                textAnchor="middle"
                                                                fill="#3b82f6"
                                                                fontSize={10}
                                                                fontWeight="900"
                                                            >
                                                                {dataPoint.recette.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            }}
                                            height={60}
                                            interval={aggregation === 'day' ? (statsData.length > 15 ? 2 : 0) : 0}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8279', fontSize: 11 }} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '20px' }}
                                            cursor={{ stroke: '#c69f6e', strokeWidth: 2, strokeDasharray: '5 5' }}
                                            itemSorter={(item) => {
                                                const order: Record<string, number> = { 'Recette Totale': 1, 'Dépenses': 2, 'Reste net': 3 };
                                                return order[item.name as string] || 99;
                                            }}
                                        />
                                        <Legend verticalAlign="top" height={60} iconType="circle" wrapperStyle={{ paddingBottom: '20px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }} />

                                        <Bar dataKey="recette" name="Recette Totale" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={aggregation === 'day' ? 20 : 40} />
                                        <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#e63946" strokeWidth={2} fillOpacity={0} strokeDasharray="3 3" />
                                        <Line type="monotone" dataKey="net" name="Reste net" stroke="#2d6a4f" strokeWidth={4} dot={{ r: 4, fill: '#2d6a4f', strokeWidth: 2, stroke: '#fff' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Riadh Analytics Chart */}
                    <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50 relative overflow-hidden">
                        <div className="mb-10">
                            <h3 className="text-xl font-bold text-[#4a3426] flex items-center gap-2">
                                <LineChartIcon className="text-[#c69f6e]" /> Statistique Riadh
                            </h3>
                            <p className="text-xs text-[#8c8279] mt-1">Analyse détaillée des dépenses payées par Riadh</p>
                        </div>

                        <div className="h-[300px] md:h-[400px] lg:h-[450px] w-full">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="animate-spin text-[#c69f6e]" size={40} />
                                    <p className="text-sm font-bold text-[#8c8279]">Chargement...</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={riadhStatsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e6dd" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={(props) => {
                                                const { x, y, payload } = props;
                                                const dataPoint = riadhStatsData.find((d: any) => d.name === payload.value);
                                                return (
                                                    <g transform={`translate(${x},${y})`}>
                                                        <text
                                                            x={0}
                                                            y={0}
                                                            dy={10}
                                                            textAnchor="middle"
                                                            fill="#8c8279"
                                                            fontSize={11}
                                                            fontWeight="bold"
                                                        >
                                                            {payload.value}
                                                        </text>
                                                        {dataPoint && (
                                                            <text
                                                                x={0}
                                                                y={0}
                                                                dy={24}
                                                                textAnchor="middle"
                                                                fill="#e63946"
                                                                fontSize={10}
                                                                fontWeight="900"
                                                            >
                                                                {dataPoint.depenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            }}
                                            height={60}
                                            interval={aggregation === 'day' ? (riadhStatsData.length > 15 ? 2 : 0) : 0}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8279', fontSize: 11 }} />
                                        <RechartsTooltip
                                            cursor={{ stroke: '#c69f6e', strokeWidth: 2, strokeDasharray: '5 5' }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-[#e6dace] min-w-[250px]">
                                                            <p className="text-[10px] font-black text-[#8c8279] uppercase tracking-widest mb-3 pb-2 border-b border-[#f4ece4]">{label}</p>
                                                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                                {data.details?.map((detail: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center gap-4">
                                                                        <span className="text-[11px] font-bold text-[#4a3426] truncate max-w-[150px]">{detail.supplier}</span>
                                                                        <span className="text-[11px] font-black text-red-500">{detail.amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-3 pt-2 border-t border-[#f4ece4] flex justify-between">
                                                                <span className="text-[10px] font-black text-[#4a3426] uppercase">Total</span>
                                                                <span className="text-[10px] font-black text-red-600 font-bold">{data.depenses.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend verticalAlign="top" height={60} iconType="circle" wrapperStyle={{ paddingBottom: '20px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }} />

                                        <Area type="monotone" dataKey="depenses" name="Dépenses Riadh" stroke="#e63946" strokeWidth={2} fillOpacity={0.1} fill="#e63946" legendType="none" />
                                        <Bar dataKey="depenses" name="Dépenses Riadh" fill="#e63946" radius={[10, 10, 0, 0]} barSize={aggregation === 'day' ? 30 : 50} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                    </div>

                    {/* Multi-charts Row: Suppliers & Divers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Suppliers Breakdown */}
                        <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50">
                            <h3 className="text-xl font-bold text-[#4a3426] mb-8 flex items-center gap-2">
                                <LayoutDashboard className="text-[#c69f6e]" /> Top Dépenses Fournisseurs
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={supplierData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0e6dd" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: '#4a3426', fontSize: 11, fontWeight: 700 }} />
                                        <RechartsTooltip cursor={{ fill: '#f8f5f2', radius: 10 }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" name="Dépenses (DT)" fill="#4a3426" radius={[0, 10, 10, 0]} barSize={20}>
                                            {supplierData.map((_, index) => (
                                                <Cell key={index} fill={index === 0 ? '#c69f6e' : '#4a3426'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Divers Breakdown */}
                        <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50">
                            <h3 className="text-xl font-bold text-[#4a3426] mb-8 flex items-center gap-2">
                                <Coins className="text-[#c69f6e]" /> Top Dépenses Divers
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={diversData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0e6dd" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: '#4a3426', fontSize: 11, fontWeight: 700 }} />
                                        <RechartsTooltip cursor={{ fill: '#f8f5f2', radius: 10 }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" name="Dépenses (DT)" fill="#4a3426" radius={[0, 10, 10, 0]} barSize={20}>
                                            {diversData.map((_, index) => (
                                                <Cell key={index} fill={index === 0 ? '#c69f6e' : '#4a3426'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Charges & Payment Types Chart */}
                    <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-[#4a3426] flex items-center gap-2">
                                <TrendingDown className="text-red-500" /> Analyse des Dépenses & Charges
                            </h3>
                            <p className="text-xs text-[#8c8279] mt-1">Évolution {aggregation === 'day' ? 'journalière' : 'mensuelle'} des charges par fournisseur</p>
                        </div>
                        <div className="h-[350px] md:h-[500px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={aggregatedExpensesDetailed.data}
                                    onClick={(state: any) => {
                                        // Robustly get data using activeLabel if activePayload is missing
                                        if (state && (state.activePayload || state.activeLabel)) {
                                            const label = state.activeLabel;

                                            // Fallback: find data manually if payload is missing
                                            let payload = state.activePayload;
                                            if (!payload || payload.length === 0) {
                                                const dataPoint = aggregatedExpensesDetailed.data.find((d: any) => d.name === label);
                                                if (dataPoint) {
                                                    // Reconstruct payload somewhat if needed
                                                    payload = Object.entries(dataPoint)
                                                        .filter(([k, v]) => k !== 'name' && k !== 'total' && typeof v === 'number' && v > 0)
                                                        .map(([k, v]) => ({ name: k, value: v }));
                                                }
                                            }

                                            if (payload && payload.length > 0) {
                                                setSelectedExpensesData({
                                                    label: label,
                                                    payload: payload
                                                });
                                            }
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e6dd" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={(props) => {
                                            const { x, y, payload } = props;
                                            const dataPoint = aggregatedExpensesDetailed.data.find((d: any) => d.name === payload.value);
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text
                                                        x={0}
                                                        y={0}
                                                        dy={10}
                                                        textAnchor="middle"
                                                        fill="#8c8279"
                                                        fontSize={11}
                                                        fontWeight="bold"
                                                    >
                                                        {payload.value}
                                                    </text>
                                                    {dataPoint && (
                                                        <text
                                                            x={0}
                                                            y={0}
                                                            dy={24}
                                                            textAnchor="middle"
                                                            fill="#4a3426"
                                                            fontSize={10}
                                                            fontWeight="900"
                                                        >
                                                            {dataPoint.total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        }}
                                        height={60}
                                        interval={aggregation === 'day' ? (aggregatedExpensesDetailed.data.length > 15 ? 2 : 0) : 0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8279', fontSize: 11 }} />
                                    <RechartsTooltip
                                        cursor={{ fill: 'transparent' }}
                                        wrapperStyle={{ pointerEvents: 'none' }}
                                        content={() => null}
                                    />
                                    {aggregatedExpensesDetailed.suppliers.map((s: string) => {
                                        return <Bar key={s} dataKey={s} stackId="a" fill={aggregatedExpensesDetailed.colorMap?.[s] || '#ccc'} barSize={aggregation === 'day' ? 20 : 40} />;
                                    })}
                                </BarChart>
                            </ResponsiveContainer>

                            {selectedExpensesData && (
                                <>
                                    <div
                                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
                                        onClick={() => setSelectedExpensesData(null)}
                                    />
                                    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
                                        <div
                                            className="bg-white rounded-[2rem] shadow-2xl border border-[#e6dace] w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
                                        >
                                            <div className="p-5 border-b border-[#f4ece4] flex justify-between items-center bg-[#fcfaf8]">
                                                <div>
                                                    <p className="text-[10px] font-black text-[#8c8279] uppercase tracking-widest">Détails Journaliers</p>
                                                    <h3 className="text-lg font-black text-[#4a3426] leading-none mt-1">{selectedExpensesData.label}</h3>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedExpensesData(null)}
                                                    className="p-2 hover:bg-[#e6dace]/20 rounded-full transition-colors text-[#8c8279]"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="p-5 overflow-y-auto custom-scrollbar">
                                                <div className="space-y-5">
                                                    {(() => {
                                                        const payload = selectedExpensesData.payload;
                                                        // Calculate total
                                                        const total = payload.reduce((acc: number, curr: any) => acc + ((curr.value as number) || 0), 0);

                                                        const groups: Array<{ title: string, items: any[] }> = [];

                                                        aggregatedExpensesDetailed.categoryGroups?.forEach(group => {
                                                            const groupItems = payload.filter((p: any) =>
                                                                group.items.includes(p.name as string) &&
                                                                (parseFloat(p.value as string) || 0) > 0
                                                            ).sort((a: any, b: any) => (b.value as number) - (a.value as number))
                                                                .map((p: any) => ({ ...p, color: aggregatedExpensesDetailed.colorMap?.[p.name as string] || '#ccc' }));

                                                            if (groupItems.length > 0) {
                                                                groups.push({ title: group.title, items: groupItems });
                                                            }
                                                        });

                                                        if (groups.length === 0) return <p className="text-sm text-center text-gray-400 py-4">Aucune donnée disponible</p>;

                                                        return (
                                                            <>
                                                                {groups.map((group, groupIdx) => (
                                                                    <div key={groupIdx}>
                                                                        <p className="text-[10px] font-black text-[#2d6a4f] uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                            <span className="w-1 h-1 rounded-full bg-[#2d6a4f]"></span>
                                                                            {group.title}
                                                                        </p>
                                                                        <div className="space-y-2.5">
                                                                            {group.items.map((entry, index) => (
                                                                                <div key={index} className="flex justify-between items-center p-2 rounded-xl hover:bg-[#f8f5f2] transition-colors border border-transparent hover:border-[#f0e6dd]">
                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: entry.color }}></div>
                                                                                        <span className="text-xs font-bold text-[#4a3426] truncate">{entry.name}</span>
                                                                                    </div>
                                                                                    <span className="text-xs font-black text-[#c69f6e] bg-[#fdfbf7] px-2 py-1 rounded-lg border border-[#e6dace]/30">
                                                                                        {parseFloat(entry.value as string).toLocaleString('fr-FR', { minimumFractionDigits: 3 })}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                <div className="bg-[#4a3426] p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-[#4a3426]/10 mt-6">
                                                                    <span className="text-xs font-bold text-[#e6dace] uppercase tracking-widest">Total Global</span>
                                                                    <span className="text-lg font-black text-white">
                                                                        {total.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span className="text-sm text-[#c69f6e]">DT</span>
                                                                    </span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Row: Evolution des avances */}
                    <div className="grid grid-cols-1 gap-8">
                        {/* Advances Evolution Chart */}
                        <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-[#4a3426] flex items-center gap-2">
                                    <Banknote className="text-[#c69f6e]" /> Evolution des avances
                                </h3>
                                <p className="text-xs text-[#8c8279] mt-1">Somme des acomptes accordés aux employés (détails par personne)</p>
                            </div>
                            <div className="h-[350px] md:h-[450px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={laborData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e6dd" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={(props) => {
                                                const { x, y, payload } = props;
                                                const dataPoint = laborData.find((d: any) => d.name === payload.value);
                                                return (
                                                    <g transform={`translate(${x},${y})`}>
                                                        <text
                                                            x={0}
                                                            y={0}
                                                            dy={10}
                                                            textAnchor="middle"
                                                            fill="#8c8279"
                                                            fontSize={11}
                                                            fontWeight="bold"
                                                        >
                                                            {payload.value}
                                                        </text>
                                                        {dataPoint && (
                                                            <text
                                                                x={0}
                                                                y={0}
                                                                dy={24}
                                                                textAnchor="middle"
                                                                fill="#c69f6e"
                                                                fontSize={10}
                                                                fontWeight="900"
                                                            >
                                                                {dataPoint.total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            }}
                                            height={60}
                                            interval={aggregation === 'day' ? (laborData.length > 15 ? 2 : 0) : 0}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8279', fontSize: 11 }} />
                                        <RechartsTooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-[#e6dace] min-w-[200px]">
                                                            <p className="text-[10px] font-black text-[#8c8279] uppercase tracking-widest mb-3 pb-2 border-b border-[#f4ece4]">{label}</p>
                                                            <div className="space-y-2">
                                                                {data.details?.map((detail: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center gap-4">
                                                                        <span className="text-[11px] font-bold text-[#4a3426]">{detail.name}</span>
                                                                        <span className="text-[11px] font-black text-[#c69f6e]">{detail.value.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-3 pt-2 border-t border-[#f4ece4] flex justify-between">
                                                                <span className="text-[10px] font-black text-[#4a3426] uppercase">Total</span>
                                                                <span className="text-[10px] font-black text-[#4a3426]">{data.total.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="total" name="Total Avances" fill="#c69f6e" radius={[10, 10, 0, 0]} barSize={aggregation === 'day' ? 30 : 50} />
                                        <Line type="monotone" dataKey="total" stroke="#4a3426" strokeWidth={3} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Data Table */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] luxury-shadow border border-[#e6dace]/50 overflow-hidden">
                        <div className="p-4 md:p-8 border-b border-[#e6dace]">
                            <h3 className="text-xl font-bold text-[#4a3426]">Tableau de Données Détaillé</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#fcfaf8] border-b border-[#e6dace]">
                                    <tr>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest">Période</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">Recette Totale</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">Dépenses</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">Reste net</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">Espèces</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">Chèque</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">TPE (Carte)</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right">T. Restau</th>
                                        <th className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-[#8c8279] uppercase tracking-widest text-right text-[#c69f6e]">Rentabilité</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...statsData].reverse().map((d: any, i: number) => {
                                        const margin = (d.net / (d.recette || 1)) * 100;
                                        return (
                                            <tr key={i} className="border-b border-[#f4ece4] hover:bg-[#fcfaf8] transition-colors">
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-[#4a3426]">{d.name}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-right text-blue-700">{d.recette.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-right text-red-500">{d.depenses.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black text-right text-green-700">{d.net.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-right opacity-60">{d.especes.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-right opacity-60">{d.cheque.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-right opacity-60">{d.tpe.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-right opacity-60">{d.tickets.toLocaleString()}</td>
                                                <td className="px-2 md:px-4 xl:px-8 py-4 md:py-5 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${margin > 50 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {margin.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div >



            {/* Modern Calendar Modal */}
            <AnimatePresence>
                {
                    pickingDate && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPickingDate(null)}>
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-[#c69f6e]/20 w-full max-w-sm luxury-shadow" onClick={e => e.stopPropagation()}>
                                <div className="text-center mb-8">
                                    <div className="inline-flex p-3 bg-[#fdfbf7] rounded-2xl border border-[#c69f6e]/10 mb-3">
                                        <Calendar className="text-[#c69f6e]" size={24} />
                                    </div>
                                    <h3 className="text-lg font-black text-[#4a3426] uppercase tracking-tight">{pickingDate === 'start' ? 'Date de Début' : 'Date de Fin'}</h3>
                                    <p className="text-[10px] font-bold text-[#bba282] uppercase tracking-[0.2em] mt-1">Sélectionnez une période</p>
                                </div>

                                <div className="flex items-center justify-between mb-8 bg-[#fcfaf8] p-2 rounded-2xl border border-[#f4ece4]">
                                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-[#c69f6e] transition-all"><ChevronLeftComp size={20} /></button>
                                    <h3 className="text-sm font-black text-[#4a3426] uppercase tracking-widest">{viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
                                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-[#c69f6e] transition-all"><ChevronRightComp size={20} /></button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-4">
                                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d: string, i: number) => (
                                        <span key={i} className="text-[10px] font-black text-[#bba282] uppercase">{d}</span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {generateCalendarDays(viewDate).map((day, i) => {
                                        if (!day) return <div key={i}></div>;

                                        const y = viewDate.getFullYear();
                                        const m = String(viewDate.getMonth() + 1).padStart(2, '0');
                                        const d = String(day).padStart(2, '0');
                                        const currentD = `${y}-${m}-${d}`;

                                        const isSelected = (pickingDate === 'start' ? startDate : endDate) === currentD;

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    if (pickingDate === 'start') setStartDate(currentD);
                                                    else setEndDate(currentD);
                                                    setPickingDate(null);
                                                }}
                                                className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${isSelected ? 'bg-[#c69f6e] text-white shadow-lg shadow-[#c69f6e]/30' : 'text-[#4a3426] hover:bg-[#fcfaf8] hover:text-[#c69f6e]'}`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 pt-6 border-t border-[#f4ece4] flex justify-center">
                                    <button onClick={() => setPickingDate(null)} className="text-[10px] font-black text-[#8c8279] uppercase tracking-[0.2em] hover:text-[#4a3426] transition-colors">Annuler</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
