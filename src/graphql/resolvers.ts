import { query } from '@/lib/db';
import { beyQuery } from '@/lib/beyDb';

const parseAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().trim().replace(/\s/g, '').replace(/,/g, '.');
    // Handle multiple dots (e.g. 13.246.000 -> 13246.0)
    const parts = str.split('.');
    if (parts.length > 2) {
        const decimalPart = parts.pop();
        const integerPart = parts.join('');
        return parseFloat(`${integerPart}.${decimalPart}`) || 0;
    }
    return parseFloat(str) || 0;
};

export const resolvers = {
    Query: {
        getChiffreByDate: async (_: any, { date: inputDate }: { date: string }) => {
            const date = inputDate.split('T')[0]; // Ensure we only have YYYY-MM-DD
            const res = await query('SELECT * FROM chiffres WHERE date = $1', [date]);

            // Fetch paid invoices for this date, excluding those paid via the paiements page (payer = 'riadh')
            const paidInvoicesRes = await query("SELECT * FROM invoices WHERE status = 'paid' AND paid_date = $1 AND (payer IS NULL OR payer != 'riadh')", [date]);
            const paidSuppliers: any[] = [];
            const paidDivers: any[] = [];

            paidInvoicesRes.rows.forEach(inv => {
                let photos = [];
                try {
                    photos = typeof inv.photos === 'string' ? JSON.parse(inv.photos) : (Array.isArray(inv.photos) ? inv.photos : []);
                } catch (e) { photos = []; }

                if (inv.photo_url && !photos.includes(inv.photo_url)) {
                    photos = [inv.photo_url, ...photos];
                }

                const item: any = {
                    supplier: inv.supplier_name, // Mapping for Fournisseur
                    designation: inv.supplier_name, // Mapping for Divers
                    amount: inv.amount,
                    paymentMethod: inv.payment_method,
                    invoices: photos,
                    photo_cheque: inv.photo_cheque_url,
                    photo_verso: inv.photo_verso_url,
                    isFromFacturation: true,
                    invoiceId: inv.id,
                    invoiceDate: inv.date, // Date when invoice was created
                    invoiceOrigin: inv.origin, // Origin: 'daily_sheet' or 'direct_expense'
                    doc_type: inv.doc_type,
                    doc_number: inv.doc_number,
                    details: inv.details || '',
                    hasRetenue: inv.has_retenue || false,
                    originalAmount: inv.original_amount || inv.amount,
                    line_number: inv.line_number ?? null
                };

                const catStr = (inv.category || '').toLowerCase();
                if (catStr === 'divers') {
                    paidDivers.push(item);
                } else {
                    paidSuppliers.push(item);
                }
            });

            // Fetch from local database
            const [avances, doublages, extras, primes] = await Promise.all([
                query('SELECT id, employee_name as username, montant, created_at FROM advances WHERE date = $1 ORDER BY id DESC', [date]),
                query('SELECT id, employee_name as username, montant, created_at FROM doublages WHERE date = $1 ORDER BY id DESC', [date]),
                query('SELECT id, employee_name as username, montant, created_at FROM extras WHERE date = $1 ORDER BY id DESC', [date]),
                query('SELECT id, employee_name as username, montant, created_at FROM primes WHERE date = $1 ORDER BY id DESC', [date])
            ]);

            const extraDetails = extras.rows;
            const primesDetails = primes.rows;
            let restesSalairesDetails: any = { rows: [] };
            try {
                restesSalairesDetails = await query('SELECT id, employee_name as username, montant, nb_jours, created_at FROM restes_salaires_daily WHERE date = $1 ORDER BY id DESC', [date]);
            } catch (e) {
                // table may not exist yet
            }

            // Try to fetch details column separately (may not exist yet)
            let detailsMap: Record<string, Record<string, string>> = { advances: {}, doublages: {}, extras: {}, primes: {}, restes_salaires_daily: {} };
            try {
                const [advDet, doubDet, extDet, prmDet, rstDet] = await Promise.all([
                    query('SELECT id, details FROM advances WHERE date = $1', [date]),
                    query('SELECT id, details FROM doublages WHERE date = $1', [date]),
                    query('SELECT id, details FROM extras WHERE date = $1', [date]),
                    query('SELECT id, details FROM primes WHERE date = $1', [date]),
                    query('SELECT id, details FROM restes_salaires_daily WHERE date = $1', [date])
                ]);
                advDet.rows.forEach((r: any) => { detailsMap.advances[r.id] = r.details || ''; });
                doubDet.rows.forEach((r: any) => { detailsMap.doublages[r.id] = r.details || ''; });
                extDet.rows.forEach((r: any) => { detailsMap.extras[r.id] = r.details || ''; });
                prmDet.rows.forEach((r: any) => { detailsMap.primes[r.id] = r.details || ''; });
                rstDet.rows.forEach((r: any) => { detailsMap.restes_salaires_daily[r.id] = r.details || ''; });
            } catch (e) {
                // details column doesn't exist yet - that's fine
            }

            const existingData = res.rows.length > 0 ? res.rows[0] : {};

            // Re-calculate totals based on both manual entries and paid invoices
            const dayAvances = avances.rows.map(r => ({ id: r.id, username: r.username, montant: parseFloat(r.montant || '0'), details: detailsMap.advances[r.id] || '', created_at: r.created_at }));
            const dayDoublages = doublages.rows.map(r => ({ id: r.id, username: r.username, montant: parseFloat(r.montant || '0'), details: detailsMap.doublages[r.id] || '', created_at: r.created_at }));
            const dayExtras = extraDetails.map(r => ({ id: r.id, username: r.username, montant: parseFloat(r.montant || '0'), details: detailsMap.extras[r.id] || '', created_at: r.created_at }));
            const dayPrimes = primesDetails.map(r => ({ id: r.id, username: r.username, montant: parseFloat(r.montant || '0'), details: detailsMap.primes[r.id] || '', created_at: r.created_at }));
            const dayRestesSalaires = restesSalairesDetails.rows.map((r: any) => ({ id: r.id, username: r.username, montant: parseFloat(r.montant || '0'), nb_jours: parseFloat(r.nb_jours || '0'), details: detailsMap.restes_salaires_daily[r.id] || '', date, created_at: r.created_at }));

            // Initial manual lists from DB row
            let existingDiponce = [];
            try {
                const raw = existingData.diponce;
                existingDiponce = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
            } catch (e) { existingDiponce = []; }

            let diversListEntries = [];
            try {
                const raw = existingData.diponce_divers;
                diversListEntries = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
            } catch (e) { diversListEntries = []; }

            let adminList = [];
            try {
                const raw = existingData.diponce_admin;
                adminList = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
            } catch (e) { adminList = []; }

            // Assign line_numbers to items that don't have one (backward compat + new paid invoices)
            // Manual items get numbered first, then paid invoices get numbers after the max
            const assignLineNumbersToList = (manualItems: any[], paidItems: any[]) => {
                let maxLn = 0;
                // Find max line_number from both lists
                for (const item of manualItems) {
                    if (item.line_number != null && item.line_number > maxLn) maxLn = item.line_number;
                }
                for (const item of paidItems) {
                    if (item.line_number != null && item.line_number > maxLn) maxLn = item.line_number;
                }
                // Assign line_number to manual items missing it
                for (const item of manualItems) {
                    if (item.line_number == null) item.line_number = ++maxLn;
                }
                // Assign line_number to paid items missing it (they go after existing items)
                for (const item of paidItems) {
                    if (item.line_number == null) item.line_number = ++maxLn;
                }
                // Combine and sort by line_number to preserve original order
                const combined = [...manualItems, ...paidItems];
                combined.sort((a: any, b: any) => (a.line_number || 0) - (b.line_number || 0));
                return combined;
            };

            // Combine with dynamic invoices, sorted by line_number
            const finalCombinedDiponce = assignLineNumbersToList(existingDiponce, paidSuppliers);
            const finalCombinedDivers = assignLineNumbersToList(diversListEntries, paidDivers);

            // Dynamic sums
            const sumDiponce = finalCombinedDiponce.reduce((s: number, i: any) => {
                const val = parseAmount(i.amount);
                return s + (isNaN(val) ? 0 : val);
            }, 0);

            const sumDivers = finalCombinedDivers.reduce((s: number, i: any) => {
                const val = parseAmount(i.amount);
                return s + (isNaN(val) ? 0 : val);
            }, 0);

            const sumAdmin = adminList.reduce((s: number, i: any) => {
                const val = parseAmount(i.amount);
                return s + (isNaN(val) ? 0 : val);
            }, 0);

            const sumFixes = dayAvances.reduce((s: number, r: any) => s + (parseAmount(r.montant) || 0), 0) +
                dayDoublages.reduce((s: number, r: any) => s + (parseAmount(r.montant) || 0), 0) +
                dayExtras.reduce((s: number, r: any) => s + (parseAmount(r.montant) || 0), 0) +
                dayPrimes.reduce((s: number, r: any) => s + (parseAmount(r.montant) || 0), 0) +
                dayRestesSalaires.reduce((s: number, r: any) => s + (parseAmount(r.montant) || 0), 0);

            const totalDiponceVal = sumDiponce + sumDivers + sumAdmin + sumFixes;
            const recetteCaisseVal = parseAmount(existingData.recette_de_caisse || '0');
            const recetteNetVal = (isNaN(recetteCaisseVal) ? 0 : recetteCaisseVal) - totalDiponceVal;

            return {
                id: existingData.id || null,
                date: date,
                recette_de_caisse: recetteCaisseVal.toString(),
                total_diponce: totalDiponceVal.toString(),
                recette_net: recetteNetVal.toString(),
                tpe: existingData.tpe || '0',
                tpe2: existingData.tpe2 || '0',
                cheque_bancaire: existingData.cheque_bancaire || '0',
                espaces: existingData.espaces || '0',
                tickets_restaurant: existingData.tickets_restaurant || '0',
                extra: existingData.extra || '0',
                primes: existingData.primes || '0',
                offres: existingData.offres || '0',
                offres_data: typeof existingData.offres_data === 'string' ? existingData.offres_data : JSON.stringify(existingData.offres_data || []),
                caisse_photo: existingData.caisse_photo || null,
                is_locked: !!existingData.is_locked,
                diponce: JSON.stringify(finalCombinedDiponce),
                diponce_divers: JSON.stringify(finalCombinedDivers),
                diponce_admin: JSON.stringify(adminList),
                avances_details: dayAvances,
                doublages_details: dayDoublages,
                extras_details: dayExtras,
                primes_details: dayPrimes,
                restes_salaires_details: dayRestesSalaires
            };
        },
        getInvoices: async (_: any, { supplierName, startDate, endDate, month, payer, filterBy }: any) => {
            let sql = 'SELECT * FROM invoices WHERE 1=1';
            const params = [];
            if (supplierName) {
                params.push(`%${supplierName}%`);
                sql += ` AND (supplier_name ILIKE $${params.length} OR doc_number ILIKE $${params.length} OR amount::text ILIKE $${params.length})`;
            }

            const dateCol = filterBy === 'date' ? 'date' : null;

            if (startDate && endDate) {
                params.push(startDate, endDate);
                if (dateCol) {
                    sql += ` AND (${dateCol} >= $${params.length - 1} AND ${dateCol} <= $${params.length})`;
                } else {
                    sql += ` AND (
                        (date >= $${params.length - 1} AND date <= $${params.length}) 
                        OR 
                        (paid_date >= $${params.length - 1} AND paid_date <= $${params.length})
                    )`;
                }
            } else if (startDate) {
                params.push(startDate);
                sql += ` AND ${dateCol || 'date'} >= $${params.length}`;
            } else if (endDate) {
                params.push(endDate);
                sql += ` AND ${dateCol || 'date'} <= $${params.length}`;
            }

            if (month) {
                params.push(`${month}-%`);
                if (dateCol) {
                    sql += ` AND ${dateCol} LIKE $${params.length}`;
                } else {
                    sql += ` AND (date LIKE $${params.length} OR paid_date LIKE $${params.length})`;
                }
            }

            if (payer) {
                params.push(payer);
                sql += ` AND payer = $${params.length}`;
            }
            sql += ' ORDER BY updated_at DESC, id DESC';
            const res = await query(sql, params);
            return res.rows.map(r => ({
                ...r,
                photos: typeof r.photos === 'string' ? r.photos : JSON.stringify(r.photos || [])
            }));
        },
        getChiffresByRange: async (_: any, { startDate, endDate }: { startDate: string, endDate: string }) => {
            const [res, avances, doublages, extras, primes, paidInvoicesRes, allPaidInvoicesRes] = await Promise.all([
                query('SELECT * FROM chiffres WHERE date::text >= $1 AND date::text <= $2 ORDER BY date::text ASC', [startDate, endDate]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM advances WHERE date::text >= $1 AND date::text <= $2 ORDER BY id DESC', [startDate, endDate]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM doublages WHERE date::text >= $1 AND date::text <= $2 ORDER BY id DESC', [startDate, endDate]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM extras WHERE date::text >= $1 AND date::text <= $2 ORDER BY id DESC', [startDate, endDate]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM primes WHERE date::text >= $1 AND date::text <= $2 ORDER BY id DESC', [startDate, endDate]),
                query(`SELECT * FROM invoices WHERE status = 'paid' AND paid_date::text >= $1 AND paid_date::text <= $2`, [startDate, endDate]),
                query(`SELECT paid_date FROM invoices WHERE status = 'paid' AND paid_date::text >= $1 AND paid_date::text <= $2`, [startDate, endDate])
            ]);

            let restesSalaires: any = { rows: [] };
            try {
                restesSalaires = await query('SELECT id, date, employee_name as username, montant, nb_jours, created_at FROM restes_salaires_daily WHERE date::text >= $1 AND date::text <= $2 ORDER BY id DESC', [startDate, endDate]);
            } catch (e) {
                // table may not exist yet
            }

            // Try to fetch details column separately (may not exist yet)
            let rangeDetailsMap: Record<string, Record<string, string>> = { advances: {}, doublages: {}, extras: {}, primes: {}, restes_salaires_daily: {} };
            try {
                const [advDet, doubDet, extDet, prmDet, rstDet] = await Promise.all([
                    query('SELECT id, details FROM advances WHERE date::text >= $1 AND date::text <= $2', [startDate, endDate]),
                    query('SELECT id, details FROM doublages WHERE date::text >= $1 AND date::text <= $2', [startDate, endDate]),
                    query('SELECT id, details FROM extras WHERE date::text >= $1 AND date::text <= $2', [startDate, endDate]),
                    query('SELECT id, details FROM primes WHERE date::text >= $1 AND date::text <= $2', [startDate, endDate]),
                    query('SELECT id, details FROM restes_salaires_daily WHERE date::text >= $1 AND date::text <= $2', [startDate, endDate])
                ]);
                advDet.rows.forEach((r: any) => { rangeDetailsMap.advances[r.id] = r.details || ''; });
                doubDet.rows.forEach((r: any) => { rangeDetailsMap.doublages[r.id] = r.details || ''; });
                extDet.rows.forEach((r: any) => { rangeDetailsMap.extras[r.id] = r.details || ''; });
                prmDet.rows.forEach((r: any) => { rangeDetailsMap.primes[r.id] = r.details || ''; });
                rstDet.rows.forEach((r: any) => { rangeDetailsMap.restes_salaires_daily[r.id] = r.details || ''; });
            } catch (e) {
                // details column doesn't exist yet - that's fine
            }

            const normalizeDate = (d: any) => {
                if (!d) return null;
                if (d instanceof Date) {
                    const y = d.getFullYear();
                    const mn = String(d.getMonth() + 1).padStart(2, '0');
                    const dy = String(d.getDate()).padStart(2, '0');
                    return `${y}-${mn}-${dy}`;
                }
                const str = d.toString().trim();
                // If it's YYYY-MM-DD or similar, just take the date part
                if (str.length >= 10) return str.substring(0, 10).replace(/\//g, '-');
                return str;
            };

            // Create a unique set of all dates that have any activity
            const allDatesSet = new Set<string>();

            res.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            avances.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            doublages.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            extras.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            primes.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            restesSalaires.rows.forEach((r: any) => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            allPaidInvoicesRes.rows.forEach(r => { const d = normalizeDate(r.paid_date); if (d) allDatesSet.add(d); });

            const sortedDates = Array.from(allDatesSet).sort();

            const paidInvoicesByDate: Record<string, any[]> = {};
            paidInvoicesRes.rows.forEach(inv => {
                const d = normalizeDate(inv.paid_date);
                if (d) {
                    if (!paidInvoicesByDate[d]) paidInvoicesByDate[d] = [];

                    let photos = [];
                    try {
                        photos = typeof inv.photos === 'string' ? JSON.parse(inv.photos) : (Array.isArray(inv.photos) ? inv.photos : []);
                    } catch (e) { photos = []; }

                    if (inv.photo_url && !photos.includes(inv.photo_url)) {
                        photos = [inv.photo_url, ...photos];
                    }

                    paidInvoicesByDate[d].push({
                        id: inv.id,
                        supplier: inv.supplier_name,
                        supplier_name: inv.supplier_name,
                        designation: inv.supplier_name,
                        amount: inv.amount,
                        paymentMethod: inv.payment_method,
                        payer: inv.payer,
                        invoices: photos,
                        photo_cheque: inv.photo_cheque_url,
                        photo_verso: inv.photo_verso_url,
                        isFromFacturation: true,
                        invoiceId: inv.id,
                        invoiceDate: inv.date,
                        invoiceOrigin: inv.origin,
                        doc_type: inv.doc_type,
                        doc_number: inv.doc_number,
                        category: inv.category,
                        details: inv.details || '',
                        hasRetenue: inv.has_retenue || false,
                        originalAmount: inv.original_amount || inv.amount,
                        origin: inv.origin,
                        status: inv.status,
                        doc_date: inv.date,
                        paid_date: inv.paid_date,
                        line_number: inv.line_number ?? null
                    });
                }
            });

            return sortedDates.map(dayStr => {
                const row = res.rows.find(r => normalizeDate(r.date) === dayStr) || {
                    date: dayStr,
                    recette_de_caisse: '0',
                    total_diponce: '0',
                    diponce: '[]',
                    recette_net: '0',
                    tpe: '0',
                    tpe2: '0',
                    cheque_bancaire: '0',
                    espaces: '0',
                    tickets_restaurant: '0',
                    extra: '0',
                    primes: '0',
                    offres: '0',
                    diponce_divers: '[]',
                    diponce_admin: '[]'
                };

                const dayAvances = avances.rows.filter(r => normalizeDate(r.date) === dayStr);
                const dayDoublages = doublages.rows.filter(r => normalizeDate(r.date) === dayStr);
                const dayExtras = extras.rows.filter(r => normalizeDate(r.date) === dayStr);
                const dayPrimes = primes.rows.filter(r => normalizeDate(r.date) === dayStr);
                const dayRestesSalaires = restesSalaires.rows.filter((r: any) => normalizeDate(r.date) === dayStr);
                const dayPaidInvoices = paidInvoicesByDate[dayStr] || [];
                const dayPaidSuppliers = dayPaidInvoices.filter((inv: any) => {
                    const c = (inv.category || '').toLowerCase();
                    return inv.payer !== 'riadh' && (!c || c === 'fournisseur');
                });
                const dayPaidDivers = dayPaidInvoices.filter((inv: any) => {
                    const c = (inv.category || '').toLowerCase();
                    return inv.payer !== 'riadh' && c === 'divers';
                });
                const dayPaidAdmin = dayPaidInvoices.filter((inv: any) => {
                    const c = (inv.category || '').toLowerCase();
                    return inv.payer !== 'riadh' && c === 'administratif';
                });
                const dayPaidExtras = dayPaidInvoices.filter((inv: any) => {
                    const c = (inv.category || '').toLowerCase();
                    return inv.payer !== 'riadh' && c === 'extra';
                });
                const dayPaidPrimes = dayPaidInvoices.filter((inv: any) => {
                    const c = (inv.category || '').toLowerCase();
                    return inv.payer !== 'riadh' && c === 'prime';
                });

                let diponceList: any[] = [];
                try {
                    diponceList = typeof row.diponce === 'string' ? JSON.parse(row.diponce) : (row.diponce || []);
                } catch (e) {
                    diponceList = [];
                }

                let diversList: any[] = [];
                let adminList: any[] = [];
                try { diversList = typeof row.diponce_divers === 'string' ? JSON.parse(row.diponce_divers) : (row.diponce_divers || []); } catch (e) { }
                try { adminList = typeof row.diponce_admin === 'string' ? JSON.parse(row.diponce_admin) : (row.diponce_admin || []); } catch (e) { }

                // Combine with paid invoices from facturation, sorted by line_number
                const combinedDiponce = [...diponceList, ...dayPaidSuppliers];
                combinedDiponce.sort((a: any, b: any) => (a.line_number || 0) - (b.line_number || 0));
                const combinedDivers = [...diversList, ...dayPaidDivers];
                combinedDivers.sort((a: any, b: any) => (a.line_number || 0) - (b.line_number || 0));
                const combinedAdmin = [...adminList, ...dayPaidAdmin];

                const dayAvancesFinal = dayAvances.map(r => {
                    const d = normalizeDate(r.date);
                    return {
                        id: `adv_${r.id}`,
                        username: r.username,
                        montant: parseAmount(r.montant || '0'),
                        details: rangeDetailsMap.advances[r.id] || '',
                        date: d,
                        doc_date: d,
                        paid_date: d,
                        created_at: r.created_at
                    };
                });
                const dayDoublagesFinal = dayDoublages.map(r => {
                    const d = normalizeDate(r.date);
                    return {
                        id: `doub_${r.id}`,
                        username: r.username,
                        montant: parseAmount(r.montant || '0'),
                        details: rangeDetailsMap.doublages[r.id] || '',
                        date: d,
                        doc_date: d,
                        paid_date: d,
                        created_at: r.created_at
                    };
                });
                const dayExtrasFinal = [
                    ...dayExtras.map(r => {
                        const d = normalizeDate(r.date);
                        return {
                            id: `ext_${r.id}`,
                            username: r.username,
                            montant: parseAmount(r.montant || '0'),
                            details: rangeDetailsMap.extras[r.id] || '',
                            date: d,
                            doc_date: d,
                            paid_date: d,
                            created_at: r.created_at
                        };
                    }),
                    ...dayPaidExtras.map(inv => ({
                        id: inv.id,
                        username: inv.supplier_name,
                        montant: parseAmount(inv.amount),
                        details: inv.details || '',
                        date: dayStr,
                        doc_date: inv.doc_date,
                        paid_date: inv.paid_date,
                        isFromFacturation: true
                    }))
                ];
                const dayPrimesFinal = [
                    ...dayPrimes.map(r => {
                        const d = normalizeDate(r.date);
                        return {
                            id: `prm_${r.id}`,
                            username: r.username,
                            montant: parseAmount(r.montant || '0'),
                            details: rangeDetailsMap.primes[r.id] || '',
                            date: d,
                            doc_date: d,
                            paid_date: d,
                            created_at: r.created_at
                        };
                    }),
                    ...dayPaidPrimes.map(inv => ({
                        id: inv.id,
                        username: inv.supplier_name,
                        montant: parseAmount(inv.amount),
                        details: inv.details || '',
                        date: dayStr,
                        doc_date: inv.doc_date,
                        paid_date: inv.paid_date,
                        isFromFacturation: true
                    }))
                ];
                const dayRestesSalairesFinal = dayRestesSalaires.map((r: any) => {
                    const d = normalizeDate(r.date);
                    return {
                        id: `rem_${r.id}`,
                        username: r.username,
                        montant: parseAmount(r.montant || '0'),
                        nb_jours: r.nb_jours ? parseAmount(r.nb_jours) : 0,
                        details: rangeDetailsMap.restes_salaires_daily[r.id] || '',
                        date: d,
                        doc_date: d,
                        paid_date: d,
                        created_at: r.created_at
                    };
                });

                const sumDiponce = combinedDiponce.reduce((s: number, i: any) => s + (parseAmount(i.amount) || 0), 0);
                const sumDivers = combinedDivers.reduce((s: number, i: any) => s + (parseAmount(i.amount) || 0), 0);
                const sumAdmin = combinedAdmin.reduce((s: number, i: any) => s + (parseAmount(i.amount) || 0), 0);
                const sumEx = dayExtrasFinal.reduce((s, r) => s + (r.montant || 0), 0);

                const totalDiponce = sumDiponce + sumDivers + sumAdmin +
                    dayAvancesFinal.reduce((s, r) => s + (r.montant || 0), 0) +
                    dayDoublagesFinal.reduce((s, r) => s + (r.montant || 0), 0) +
                    sumEx +
                    dayPrimesFinal.reduce((s, r) => s + (r.montant || 0), 0) +
                    dayRestesSalairesFinal.reduce((s: any, r: any) => s + (r.montant || 0), 0);
                const recetteCaisse = parseAmount(row.recette_de_caisse) || 0;
                const recetteNet = recetteCaisse - totalDiponce;

                return {
                    ...row,
                    is_locked: !!row.is_locked,
                    total_diponce: totalDiponce.toFixed(3),
                    recette_net: recetteNet.toFixed(3),
                    diponce: JSON.stringify(combinedDiponce),
                    diponce_divers: JSON.stringify(combinedDivers),
                    diponce_admin: JSON.stringify(combinedAdmin),
                    avances_details: dayAvancesFinal,
                    doublages_details: dayDoublagesFinal,
                    extras_details: dayExtrasFinal,
                    primes_details: dayPrimesFinal,
                    restes_salaires_details: dayRestesSalairesFinal
                };
            });
        },
        getSuppliers: async () => {
            const res = await query('SELECT * FROM suppliers ORDER BY name ASC');
            return res.rows;
        },
        getDesignations: async () => {
            const res = await query('SELECT * FROM designations ORDER BY name ASC');
            return res.rows;
        },
        getMonthlySalaries: async (_: any, { startDate, endDate }: { startDate: string, endDate: string }) => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const results = [];

            let current = new Date(start.getFullYear(), start.getMonth(), 1);
            while (current <= end) {
                const year = current.getFullYear();
                const month = String(current.getMonth() + 1).padStart(2, '0');
                const tableName = `paiecurrent_${year}_${month}`;

                try {
                    // Check if table exists
                    const tableCheck = await beyQuery(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
                        [tableName]
                    );

                    if (tableCheck.rows[0].exists) {
                        const salaryRes = await beyQuery(`SELECT SUM(salaire_net) as total FROM ${tableName} WHERE paid = true`);
                        results.push({
                            month: current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                            total: parseFloat(salaryRes.rows[0].total) || 0
                        });
                    }
                } catch (e) {
                    console.error(`Error querying ${tableName}:`, e);
                }

                current.setMonth(current.getMonth() + 1);
            }
            return results;
        },
        getPaidUsers: async (_: any, { month, startDate, endDate }: { month?: string, startDate?: string, endDate?: string }) => {
            const monthsToQuery = [];

            if (month) {
                monthsToQuery.push(month.replace('-', '_'));
            } else if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                while (current <= end) {
                    monthsToQuery.push(`${current.getFullYear()}_${String(current.getMonth() + 1).padStart(2, '0')}`);
                    current.setMonth(current.getMonth() + 1);
                }
            } else {
                return [];
            }

            const results: any[] = [];
            const processedUsers: Record<string, number> = {};

            for (const formattedMonth of monthsToQuery) {
                const tableName = `paiecurrent_${formattedMonth}`;
                try {
                    const tableCheck = await beyQuery(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
                        [tableName]
                    );

                    if (tableCheck.rows[0].exists) {
                        let sql = `SELECT username, SUM(salaire_net) as amount FROM ${tableName} WHERE paid = true`;
                        const params = [];

                        if (startDate && endDate) {
                            params.push(startDate, endDate);
                            sql += ` AND date >= $1 AND date <= $2`;
                        }

                        sql += ` GROUP BY username`;
                        const res = await beyQuery(sql, params);

                        res.rows.forEach((r: any) => {
                            processedUsers[r.username] = (processedUsers[r.username] || 0) + (parseFloat(r.amount) || 0);
                        });
                    }
                } catch (e) {
                    console.error(`Error fetching paid users for ${tableName}:`, e);
                }
            }

            return Object.entries(processedUsers).map(([username, amount]) => ({
                username,
                amount
            })).sort((a, b) => b.amount - a.amount);
        },
        getPaymentStats: async (_: any, { month, startDate, endDate, filterBy }: { month?: string, startDate?: string, endDate?: string, filterBy?: string }) => {
            const params: string[] = [];
            let dateFilter = '';

            if (month) {
                params.push(`${month}-%`);
                dateFilter = "LIKE $1";
            } else if (startDate && endDate) {
                params.push(startDate, endDate);
                dateFilter = ">= $1 AND date::text <= $2"; // Ensure both parts cast correctly
            } else {
                return { totalRecetteNette: 0, totalFacturesPayees: 0, totalTPE: 0, totalCheque: 0, totalCash: 0, totalBankDeposits: 0 };
            }

            const paidDateFilter = (filterBy === 'date') ? dateFilter : dateFilter.replace(/date/g, 'paid_date');
            const cleanNum = (col: string) => `CAST(COALESCE(NULLIF(REGEXP_REPLACE(REPLACE(${col}, ',', '.'), '\\s+', '', 'g'), ''), '0') AS NUMERIC)`;

            const [
                netRes, invoicesRes, unpaidInvoicesRes, tpeRes, chequeRes, cashRes, bankRes, caisseRes, ticketRes, riadhRes,
                advancesRes, doublagesRes, extrasRes, primesRes, dailyRemaindersRes, currentSalaryRemaindersRes, offresRes, cashExpRes, ticketExpRes
            ] = await Promise.all([
                query(`SELECT SUM(${cleanNum('recette_net')}) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('amount')}) as total FROM invoices WHERE status = 'paid' AND (payer IS NULL OR payer != 'riadh') AND ${filterBy === 'date' ? 'date' : 'paid_date'}::text ${paidDateFilter}`, params),
                query(`SELECT SUM(${cleanNum('amount')}) as total FROM invoices WHERE status = 'unpaid' AND date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('tpe')} + COALESCE(${cleanNum('tpe2')}, 0)) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('cheque_bancaire')}) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('espaces')}) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('amount')}) as total FROM bank_deposits WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('recette_de_caisse')}) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('tickets_restaurant')}) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('amount')}) as total FROM invoices WHERE status = 'paid' AND payer = 'riadh' AND ${filterBy === 'date' ? 'date' : 'paid_date'}::text ${paidDateFilter}`, params),
                // Independent Expense Tables
                query(`SELECT SUM(montant) as total FROM advances WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(montant) as total FROM doublages WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(montant) as total FROM extras WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(montant) as total FROM primes WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(montant) as total FROM restes_salaires_daily WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(amount) as total FROM salary_remainders ${month ? "WHERE month = $1" : ""}`, month ? [month] : []),
                query(`SELECT SUM(${cleanNum('offres')}) as total FROM chiffres WHERE date::text ${dateFilter}`, params),
                query(`SELECT SUM(${cleanNum('amount')}) as total FROM invoices WHERE status = 'paid' AND payment_method = 'Espèces' AND origin != 'daily_sheet' AND (payer IS NULL OR payer != 'riadh') AND ${filterBy === 'date' ? 'date' : 'paid_date'}::text ${paidDateFilter}`, params),
                query(`SELECT SUM(${cleanNum('amount')}) as total FROM invoices WHERE status = 'paid' AND payment_method = 'Ticket Restaurant' AND origin != 'daily_sheet' AND (payer IS NULL OR payer != 'riadh') AND ${filterBy === 'date' ? 'date' : 'paid_date'}::text ${paidDateFilter}`, params)
            ]);

            const tBankDeposits = parseFloat(bankRes.rows[0]?.total || '0');
            const sumSuppliers = parseFloat(invoicesRes.rows[0]?.total || '0');
            const sumRiadh = parseFloat(riadhRes.rows[0]?.total || '0');
            const sumAdvances = parseFloat(advancesRes.rows[0]?.total || '0');
            const sumDoublage = parseFloat(doublagesRes.rows[0]?.total || '0');
            const sumExtras = parseFloat(extrasRes.rows[0]?.total || '0');
            const sumPrimes = parseFloat(primesRes.rows[0]?.total || '0');
            const sumRemainders = parseFloat(dailyRemaindersRes.rows[0]?.total || '0');

            const totalPersonnel = sumAdvances + sumDoublage + sumExtras + sumPrimes + sumRemainders;
            const tExpenses = sumSuppliers + totalPersonnel + sumRiadh;

            return {
                totalRecetteNette: parseFloat(netRes.rows[0]?.total || '0'),
                totalFacturesPayees: sumSuppliers,
                totalUnpaidInvoices: parseFloat(unpaidInvoicesRes.rows[0]?.total || '0'),
                totalTPE: parseFloat(tpeRes.rows[0]?.total || '0'),
                totalCheque: parseFloat(chequeRes.rows[0]?.total || '0'),
                totalCash: parseFloat(cashRes.rows[0]?.total || '0'),
                totalBankDeposits: tBankDeposits,
                totalRecetteCaisse: parseFloat(caisseRes.rows[0]?.total || '0'),
                totalExpenses: tExpenses,
                totalTicketsRestaurant: parseFloat(ticketRes.rows[0]?.total || '0'),
                totalRiadhExpenses: sumRiadh,
                totalRestesSalaires: sumRemainders,
                totalOffres: parseFloat(offresRes.rows[0]?.total || '0'),
                totalSalaryRemainders: parseFloat(currentSalaryRemaindersRes.rows[0]?.total || '0')
            };
        },
        getBankDeposits: async (_: any, { month, startDate, endDate }: { month?: string, startDate?: string, endDate?: string }) => {
            const params: string[] = [];
            let dateFilter = '';

            if (month) {
                params.push(`${month}-%`);
                dateFilter = "WHERE date LIKE $1";
            } else if (startDate && endDate) {
                params.push(startDate, endDate);
                dateFilter = "WHERE date >= $1 AND date <= $2";
            } else {
                return [];
            }

            const res = await query(`SELECT * FROM bank_deposits ${dateFilter} ORDER BY date DESC, id DESC`, params);
            return res.rows;
        },
        getEmployees: async () => {
            const res = await query('SELECT * FROM employees ORDER BY name ASC');
            return res.rows;
        },
        getLockedDates: async () => {
            const res = await query('SELECT date FROM chiffres WHERE is_locked = true');
            return res.rows.map(r => r.date);
        },
        getSalaryRemainders: async (_: any, { month }: { month?: string }) => {
            let sql = 'SELECT * FROM salary_remainders';
            const params = [];
            if (month) {
                params.push(month);
                sql += ' WHERE month = $1';
            }
            sql += ' ORDER BY id DESC';
            const res = await query(sql, params);
            return res.rows.map(r => ({
                ...r,
                amount: parseFloat(r.amount || '0')
            }));
        },
        getConnectedDevices: async () => {
            // In a real scenario, this would check real hardware status.
            // For now, we fetch from the devices table and possibly mock "online" status based on last_seen.
            const res = await query('SELECT * FROM devices ORDER BY status DESC, last_seen DESC');
            return res.rows.map(r => ({
                ...r,
                last_seen: r.last_seen ? new Date(r.last_seen).toISOString() : null
            }));
        },
        getSystemStatus: async () => {
            const res = await query("SELECT value FROM settings WHERE key = 'is_blocked'");
            return {
                is_blocked: res.rows[0]?.value === 'true'
            };
        },
        getUsers: async () => {
            const res = await query(`
                SELECT id, username, password, role, full_name, last_active, device_info, ip_address, is_blocked_user, face_data, has_face_id,
                (last_active IS NOT NULL AND last_active > (CURRENT_TIMESTAMP - INTERVAL '3 minutes'))::boolean as is_online
                FROM logins 
                ORDER BY username ASC
            `);
            return res.rows.map(r => ({
                ...r,
                last_active: r.last_active ? new Date(r.last_active).toISOString() : null
            }));
        },
        getConnectionLogs: async () => {
            const res = await query('SELECT * FROM connection_logs ORDER BY connected_at DESC LIMIT 100');
            return res.rows.map(r => ({
                ...r,
                connected_at: r.connected_at ? new Date(r.connected_at).toISOString() : null
            }));
        },
        getDailyExpenses: async (_: any, { month, startDate, endDate }: { month?: string, startDate?: string, endDate?: string }) => {
            let start = startDate;
            let end = endDate;

            if (month) {
                start = `${month}-01`;
                const [y, m] = month.split('-');
                const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                end = `${month}-${String(lastDay).padStart(2, '0')}`;
            }

            if (!start || !end) return [];

            const [res, avances, doublages, extras, primes, restesSalaires, paidInvoicesRes] = await Promise.all([
                query('SELECT * FROM chiffres WHERE date >= $1 AND date <= $2 ORDER BY date ASC', [start, end]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM advances WHERE date >= $1 AND date <= $2 ORDER BY id DESC', [start, end]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM doublages WHERE date >= $1 AND date <= $2 ORDER BY id DESC', [start, end]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM extras WHERE date >= $1 AND date <= $2 ORDER BY id DESC', [start, end]),
                query('SELECT id, date, employee_name as username, montant, created_at FROM primes WHERE date >= $1 AND date <= $2 ORDER BY id DESC', [start, end]),
                query('SELECT id, date, employee_name as username, montant, nb_jours, created_at FROM restes_salaires_daily WHERE date >= $1 AND date <= $2 ORDER BY id DESC', [start, end]),
                query(`SELECT * FROM invoices WHERE status = 'paid' AND paid_date >= $1 AND paid_date <= $2 AND (payer IS NULL OR payer != 'riadh')`, [start, end])
            ]);

            const normalizeDate = (d: any) => {
                if (!d) return null;
                try {
                    const dateObj = new Date(d);
                    if (isNaN(dateObj.getTime())) return null;
                    const y = dateObj.getFullYear();
                    const mn = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dy = String(dateObj.getDate()).padStart(2, '0');
                    return `${y}-${mn}-${dy}`;
                } catch (e) {
                    return null;
                }
            };

            const allDatesSet = new Set<string>();
            res.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            avances.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            doublages.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            extras.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            primes.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            restesSalaires.rows.forEach(r => { const d = normalizeDate(r.date); if (d) allDatesSet.add(d); });
            paidInvoicesRes.rows.forEach(inv => { const d = normalizeDate(inv.paid_date); if (d) allDatesSet.add(d); });

            const sortedDates = Array.from(allDatesSet).sort();

            const avancesByDate: Record<string, any[]> = {};
            avances.rows.forEach(r => {
                const d = normalizeDate(r.date);
                if (d) {
                    if (!avancesByDate[d]) avancesByDate[d] = [];
                    avancesByDate[d].push({ ...r, montant: parseFloat(r.montant || '0') });
                }
            });
            const doublagesByDate: Record<string, any[]> = {};
            doublages.rows.forEach(r => {
                const d = normalizeDate(r.date);
                if (d) {
                    if (!doublagesByDate[d]) doublagesByDate[d] = [];
                    doublagesByDate[d].push({ ...r, montant: parseFloat(r.montant || '0') });
                }
            });
            const extrasByDate: Record<string, any[]> = {};
            extras.rows.forEach(r => {
                const d = normalizeDate(r.date);
                if (d) {
                    if (!extrasByDate[d]) extrasByDate[d] = [];
                    extrasByDate[d].push({ ...r, montant: parseFloat(r.montant || '0') });
                }
            });
            const primesByDate: Record<string, any[]> = {};
            primes.rows.forEach(r => {
                const d = normalizeDate(r.date);
                if (d) {
                    if (!primesByDate[d]) primesByDate[d] = [];
                    primesByDate[d].push({ ...r, montant: parseFloat(r.montant || '0') });
                }
            });
            const restesSalairesByDate: Record<string, any[]> = {};
            restesSalaires.rows.forEach(r => {
                const d = normalizeDate(r.date);
                if (d) {
                    if (!restesSalairesByDate[d]) restesSalairesByDate[d] = [];
                    restesSalairesByDate[d].push({ ...r, montant: parseFloat(r.montant || '0'), nb_jours: parseFloat(r.nb_jours || '0') });
                }
            });

            const paidSuppliersByDate: Record<string, any[]> = {};
            const paidDiversByDate: Record<string, any[]> = {};

            paidInvoicesRes.rows.forEach(inv => {
                const d = normalizeDate(inv.paid_date);
                if (d) {
                    let photos = [];
                    try {
                        photos = typeof inv.photos === 'string' ? JSON.parse(inv.photos) : (Array.isArray(inv.photos) ? inv.photos : []);
                    } catch (e) { photos = []; }

                    if (inv.photo_url && !photos.includes(inv.photo_url)) {
                        photos = [inv.photo_url, ...photos];
                    }

                    const item = {
                        supplier: inv.supplier_name,
                        designation: inv.supplier_name,
                        amount: inv.amount,
                        paymentMethod: inv.payment_method,
                        invoices: photos,
                        photo_cheque: inv.photo_cheque_url,
                        photo_verso: inv.photo_verso_url,
                        isFromFacturation: true,
                        invoiceId: inv.id,
                        invoiceDate: inv.date,
                        invoiceOrigin: inv.origin,
                        doc_type: inv.doc_type,
                        doc_number: inv.doc_number,
                        details: inv.details || '',
                        hasRetenue: inv.has_retenue || false,
                        originalAmount: inv.original_amount || inv.amount
                    };

                    if (inv.category === 'divers') {
                        if (!paidDiversByDate[d]) paidDiversByDate[d] = [];
                        paidDiversByDate[d].push(item);
                    } else {
                        if (!paidSuppliersByDate[d]) paidSuppliersByDate[d] = [];
                        paidSuppliersByDate[d].push(item);
                    }
                }
            });

            const chiffresByDate: Record<string, any> = {};
            res.rows.forEach(r => {
                const d = normalizeDate(r.date);
                if (d) chiffresByDate[d] = r;
            });

            return sortedDates.map(d => {
                const c = chiffresByDate[d] || { date: d };

                let diponceList = [];
                try {
                    diponceList = typeof c.diponce === 'string' ? JSON.parse(c.diponce) : (Array.isArray(c.diponce) ? c.diponce : []);
                } catch (e) { diponceList = []; }

                let diversList = [];
                try {
                    diversList = typeof c.diponce_divers === 'string' ? JSON.parse(c.diponce_divers) : (Array.isArray(c.diponce_divers) ? c.diponce_divers : []);
                } catch (e) { diversList = []; }

                const finalDiponce = [...diponceList, ...(paidSuppliersByDate[d] || [])];
                const finalDivers = [...diversList, ...(paidDiversByDate[d] || [])];

                return {
                    ...c,
                    diponce: JSON.stringify(finalDiponce),
                    diponce_divers: JSON.stringify(finalDivers),
                    diponce_admin: typeof c.diponce_admin === 'object' ? JSON.stringify(c.diponce_admin) : c.diponce_admin,
                    avances_details: avancesByDate[d] || [],
                    doublages_details: doublagesByDate[d] || [],
                    extras_details: extrasByDate[d] || [],
                    primes_details: primesByDate[d] || [],
                    restes_salaires_details: restesSalairesByDate[d] || []
                };
            });
        },
        getJournalierPhotos: async (_: any, { date }: { date: string }) => {
            const res = await query('SELECT * FROM photo_journalier WHERE date = $1', [date]);
            return res.rows.map(r => ({
                ...r,
                photos: typeof r.photos === 'string' ? r.photos : JSON.stringify(r.photos || [])
            }));
        },
        getArticleFamilies: async () => {
            const res = await query('SELECT * FROM article_families ORDER BY name ASC');
            return res.rows.map(r => ({
                ...r,
                rows: typeof r.rows === 'string' ? r.rows : JSON.stringify(r.rows || []),
                suppliers: typeof r.suppliers === 'string' ? r.suppliers : JSON.stringify(r.suppliers || [])
            }));
        }
    },
    Mutation: {
        saveChiffre: async (_: any, args: any) => {
            const {
                date,
                recette_de_caisse,
                total_diponce,
                diponce,
                recette_net,
                tpe,
                tpe2,
                cheque_bancaire,
                espaces,
                tickets_restaurant,
                extra,
                primes,
                offres,
                offres_data,
                caisse_photo,
                diponce_divers,
                diponce_admin,
            } = args;

            const payerRole = args.payer || 'caissier';

            // Before processing, fetch temp photos and existing invoice/chiffre photos
            const [tempPhotosRes, existingInvRes, existingChiffreRes] = await Promise.all([
                query('SELECT * FROM photo_journalier WHERE date = $1', [date]),
                query('SELECT id, photos, photo_cheque_url, photo_verso_url FROM invoices WHERE paid_date = $1', [date]),
                query('SELECT offres_data FROM chiffres WHERE date = $1', [date])
            ]);

            const tempPhotosMap: Record<string, string[]> = {};
            tempPhotosRes.rows.forEach(r => {
                const key = `${r.category}_${r.item_index}`;
                tempPhotosMap[key] = typeof r.photos === 'string' ? JSON.parse(r.photos) : (Array.isArray(r.photos) ? r.photos : []);
            });

            const dbInvoicesPhotos: Record<number, { photos: string[], recto: string | null, verso: string | null }> = {};
            existingInvRes.rows.forEach(r => {
                dbInvoicesPhotos[r.id] = {
                    photos: typeof r.photos === 'string' ? JSON.parse(r.photos) : (Array.isArray(r.photos) ? r.photos : []),
                    recto: r.photo_cheque_url,
                    verso: r.photo_verso_url
                };
            });

            const dbOffresPhotos: Record<number, string[]> = {};
            if (existingChiffreRes.rows.length > 0) {
                try {
                    const oldOffres = JSON.parse(existingChiffreRes.rows[0].offres_data || '[]');
                    oldOffres.forEach((o: any, i: number) => {
                        if (o.invoices) dbOffresPhotos[i] = o.invoices;
                    });
                } catch (e) { }
            }

            // Delete old daily_sheet invoices before re-inserting to prevent duplicates
            // This runs AFTER fetching existing photos so we preserve them for fallback
            await query("DELETE FROM invoices WHERE origin = 'daily_sheet' AND (paid_date = $1 OR date = $1)", [date]);

            // Sync Fournisseur expenses to Invoices (batched for performance)
            // Uses stable line_number for photo matching instead of sequential index
            let diponceList = [];
            const invoiceQueries: Promise<any>[] = [];
            try {
                const fullDiponceList = JSON.parse(diponce);
                // Assign line_number to items that don't have one (backward compat for old data)
                let maxExpenseLn = 0;
                fullDiponceList.forEach((d: any) => { if (d.line_number > maxExpenseLn) maxExpenseLn = d.line_number; });
                for (const d of fullDiponceList) {
                    if (d.line_number == null) d.line_number = ++maxExpenseLn;
                }

                for (let i = 0; i < fullDiponceList.length; i++) {
                    const d = fullDiponceList[i];

                    const isDailySheetOrigin = d.invoiceOrigin === 'daily_sheet';
                    const isTrueFacturation = d.isFromFacturation && !isDailySheetOrigin;

                    const dbData = d.invoiceId ? dbInvoicesPhotos[d.invoiceId] : null;

                    if (!isTrueFacturation) {
                        // Match temp photos by stable line_number
                        const temp = tempPhotosMap[`expenses_${d.line_number}`];
                        if (temp !== undefined) {
                            d.invoices = temp;
                        } else if (dbData && (!d.invoices || d.invoices.length === 0)) {
                            d.invoices = dbData.photos;
                            if (!d.photo_cheque && dbData.recto) d.photo_cheque = dbData.recto;
                            if (!d.photo_verso && dbData.verso) d.photo_verso = dbData.verso;
                        }
                    } else if (isTrueFacturation && dbData && (!d.invoices || d.invoices.length === 0)) {
                        d.invoices = dbData.photos;
                    }

                    if (isTrueFacturation && dbData) {
                        if (!d.photo_cheque && dbData.recto) d.photo_cheque = dbData.recto;
                        if (!d.photo_verso && dbData.verso) d.photo_verso = dbData.verso;
                    }

                    const supplierName = d.supplier || '';
                    const hasAmount = parseFloat(d.amount) > 0;

                    if (isTrueFacturation && d.invoiceId) {
                        invoiceQueries.push(query(
                            `UPDATE invoices SET photos = $1::jsonb, details = $2, supplier_name = $3, amount = $4, doc_type = $5, has_retenue = $6, original_amount = $7, photo_cheque_url = $8, photo_verso_url = $9, line_number = $10 WHERE id = $11`,
                            [JSON.stringify(d.invoices || []), d.details || '', d.supplier, d.amount, d.doc_type, d.hasRetenue || false, d.originalAmount || d.amount, d.photo_cheque || null, d.photo_verso || null, d.line_number, d.invoiceId]
                        ));
                    } else if (supplierName && hasAmount) {
                        invoiceQueries.push(query(
                            `INSERT INTO invoices (supplier_name, amount, date, photo_url, photos, photo_cheque_url, photo_verso_url, status, payment_method, paid_date, payer, category, doc_type, doc_number, origin, details, has_retenue, original_amount, line_number)
                             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'paid', $8, $9, $10, 'fournisseur', $11, $12, 'daily_sheet', $13, $14, $15, $16)`,
                            [d.supplier, d.amount, date, d.photo_url || null, JSON.stringify(d.invoices || []), d.photo_cheque || null, d.photo_verso || null, d.paymentMethod || 'Espèces', date, payerRole, d.doc_type || 'BL', d.doc_number || null, d.details || '', d.hasRetenue || false, d.originalAmount || d.amount, d.line_number]
                        ));
                    } else if (!isTrueFacturation) {
                        diponceList.push(d);
                    }
                }
            } catch (e) { console.error(e); }

            // Sync Divers expenses to Invoices (batched for performance)
            // Uses stable line_number for photo matching instead of sequential index
            let diponceDiversList = [];
            try {
                const fullDiversList = JSON.parse(diponce_divers);
                // Assign line_number to items that don't have one (backward compat for old data)
                let maxDiversLn = 0;
                fullDiversList.forEach((d: any) => { if (d.line_number > maxDiversLn) maxDiversLn = d.line_number; });
                for (const d of fullDiversList) {
                    if (d.line_number == null) d.line_number = ++maxDiversLn;
                }

                for (let i = 0; i < fullDiversList.length; i++) {
                    const d = fullDiversList[i];

                    const isDailySheetOrigin = d.invoiceOrigin === 'daily_sheet';
                    const isTrueFacturation = d.isFromFacturation && !isDailySheetOrigin;

                    const dbData = d.invoiceId ? dbInvoicesPhotos[d.invoiceId] : null;

                    if (!isTrueFacturation) {
                        // Match temp photos by stable line_number
                        const temp = tempPhotosMap[`expensesDivers_${d.line_number}`];
                        if (temp !== undefined) {
                            d.invoices = temp;
                        } else if (dbData && (!d.invoices || d.invoices.length === 0)) {
                            d.invoices = dbData.photos;
                        }
                    } else if (isTrueFacturation && dbData && (!d.invoices || d.invoices.length === 0)) {
                        d.invoices = dbData.photos;
                    }

                    const designationName = d.designation || '';
                    const hasAmount = parseFloat(d.amount) > 0;

                    if (isTrueFacturation && d.invoiceId) {
                        invoiceQueries.push(query(
                            `UPDATE invoices SET photos = $1::jsonb, details = $2, supplier_name = $3, amount = $4, doc_type = $5, has_retenue = $6, original_amount = $7, line_number = $8 WHERE id = $9`,
                            [JSON.stringify(d.invoices || []), d.details || '', d.designation, d.amount, d.doc_type, d.hasRetenue || false, d.originalAmount || d.amount, d.line_number, d.invoiceId]
                        ));
                    } else if (designationName && hasAmount) {
                        invoiceQueries.push(query(
                            `INSERT INTO invoices (supplier_name, amount, date, photos, status, payment_method, paid_date, payer, category, doc_type, origin, details, has_retenue, original_amount, line_number)
                             VALUES ($1, $2, $3, $4::jsonb, 'paid', $5, $6, $7, 'divers', $8, 'daily_sheet', $9, $10, $11, $12)`,
                            [d.designation, d.amount, date, JSON.stringify(d.invoices || []), d.paymentMethod || 'Espèces', date, payerRole, d.doc_type || 'BL', d.details || '', d.hasRetenue || false, d.originalAmount || d.amount, d.line_number]
                        ));
                    } else if (!isTrueFacturation) {
                        diponceDiversList.push(d);
                    }
                }
            } catch (e) { console.error(e); }

            // Execute all invoice INSERT/UPDATE queries in parallel for performance
            if (invoiceQueries.length > 0) {
                await Promise.all(invoiceQueries);
            }

            // Sync Offres photos
            let offresList = [];
            try {
                const fullOffresList = JSON.parse(offres_data || '[]');
                for (let i = 0; i < fullOffresList.length; i++) {
                    const o = fullOffresList[i];

                    // Priority: Temp > Existing DB > Frontend Array
                    const temp = tempPhotosMap[`offres_${i}`];
                    if (temp !== undefined) {
                        o.invoices = temp;
                    } else if (!o.invoices || o.invoices.length === 0) {
                        o.invoices = dbOffresPhotos[i] || [];
                    }

                    offresList.push(o);
                }
            } catch (e) {
                try { offresList = JSON.parse(offres_data || '[]'); } catch (ee) { offresList = []; }
            }

            // Sync Administratif expenses (handle photos)
            let diponceAdminList = [];
            try {
                const fullAdminList = JSON.parse(diponce_admin || '[]');
                for (let i = 0; i < fullAdminList.length; i++) {
                    const a = fullAdminList[i];
                    const temp = tempPhotosMap[`expensesAdmin_${i}`];
                    if (temp !== undefined) {
                        a.invoices = temp;
                    }
                    diponceAdminList.push(a);
                }
            } catch (e) {
                try { diponceAdminList = JSON.parse(diponce_admin || '[]'); } catch (ee) { diponceAdminList = []; }
            }

            const diponceToSave = JSON.stringify(diponceList);
            const diponceDiversToSave = JSON.stringify(diponceDiversList);
            const diponceAdminToSave = JSON.stringify(diponceAdminList);
            const offresDataToSave = JSON.stringify(offresList);

            // Check if it exists
            const existing = await query('SELECT id, is_locked FROM chiffres WHERE date = $1', [date]);

            let res;
            if (existing.rows.length > 0) {
                if (existing.rows[0].is_locked) {
                    // Normally we should check role here, but we'll enforce it on frontend.
                    // If we want hard enforcement, we'd need context with user info.
                }

                // Update
                res = await query(
                    `UPDATE chiffres SET 
            recette_de_caisse = $1, 
            total_diponce = $2, 
            diponce = $3::jsonb, 
            recette_net = $4, 
            tpe = $5, 
            tpe2 = $6,
            cheque_bancaire = $7, 
            espaces = $8,
            tickets_restaurant = $9,
            extra = $10,
            primes = $11,
            diponce_divers = $12::jsonb, 
            diponce_admin = $13::jsonb,
            offres = $14,
            offres_data = $15::jsonb,
            caisse_photo = $16,
            is_locked = true
          WHERE date = $17 RETURNING *`,
                    [recette_de_caisse, total_diponce, diponceToSave, recette_net, tpe, tpe2, cheque_bancaire, espaces, tickets_restaurant, extra, primes, diponceDiversToSave, diponceAdminToSave, offres || '0', offresDataToSave, caisse_photo || null, date]
                );
            } else {
                // Insert
                res = await query(
                    `INSERT INTO chiffres (date, recette_de_caisse, total_diponce, diponce, recette_net, tpe, tpe2, cheque_bancaire, espaces, tickets_restaurant, extra, primes, diponce_divers, diponce_admin, offres, offres_data, caisse_photo, is_locked)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16::jsonb, $17, true) RETURNING *`,
                    [date, recette_de_caisse, total_diponce, diponceToSave, recette_net, tpe, tpe2, cheque_bancaire, espaces, tickets_restaurant, extra, primes, diponceDiversToSave, diponceAdminToSave, offres || '0', offresDataToSave, caisse_photo || null]
                );
            }

            // After successful move/save, clear the temp photo table for this date
            await query('DELETE FROM photo_journalier WHERE date = $1', [date]);

            const row = res.rows[0];

            // After saving, return it with the paid invoices again for the UI
            const paidInvoicesRes = await query("SELECT * FROM invoices WHERE status = 'paid' AND paid_date = $1 AND (payer IS NULL OR payer != 'riadh')", [date]);
            const paidSuppliers: any[] = [];
            const paidDivers: any[] = [];

            paidInvoicesRes.rows.forEach(inv => {
                let photos = [];
                try {
                    photos = typeof inv.photos === 'string' ? JSON.parse(inv.photos) : (Array.isArray(inv.photos) ? inv.photos : []);
                } catch (e) { photos = []; }
                if (inv.photo_url && !photos.includes(inv.photo_url)) {
                    photos = [inv.photo_url, ...photos];
                }

                const item = {
                    supplier: inv.supplier_name,
                    designation: inv.supplier_name,
                    amount: inv.amount,
                    paymentMethod: inv.payment_method,
                    invoices: photos,
                    photo_cheque: inv.photo_cheque_url,
                    photo_verso: inv.photo_verso_url,
                    isFromFacturation: true,
                    invoiceId: inv.id,
                    invoiceDate: inv.date,
                    invoiceOrigin: inv.origin,
                    doc_type: inv.doc_type,
                    doc_number: inv.doc_number,
                    line_number: inv.line_number ?? null
                };

                if ((inv.category || '').toLowerCase() === 'divers') {
                    paidDivers.push(item);
                } else {
                    paidSuppliers.push(item);
                }
            });

            // Combine and sort by line_number to preserve original order
            const finalDiponce = [...diponceList, ...paidSuppliers];
            finalDiponce.sort((a: any, b: any) => (a.line_number || 0) - (b.line_number || 0));
            const finalDivers = [...diponceDiversList, ...paidDivers];
            finalDivers.sort((a: any, b: any) => (a.line_number || 0) - (b.line_number || 0));

            return {
                ...row,
                diponce: JSON.stringify(finalDiponce),
                diponce_divers: JSON.stringify(finalDivers),
                diponce_admin: typeof row.diponce_admin === 'string' ? row.diponce_admin : JSON.stringify(row.diponce_admin || []),
                offres_data: offresDataToSave,
                caisse_photo: row.caisse_photo || null
            };
        },
        addInvoice: async (_: any, { supplier_name, amount, date, photo_url, photos, doc_type, doc_number, category, details }: any) => {
            const res = await query(
                'INSERT INTO invoices (supplier_name, amount, date, photo_url, photos, doc_type, doc_number, category, details) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9) RETURNING *',
                [supplier_name, amount, date, photo_url, photos || '[]', doc_type || 'Facture', doc_number, category || 'fournisseur', details || '']
            );
            const row = res.rows[0];
            return {
                ...row,
                photos: JSON.stringify(row.photos || [])
            };
        },
        payInvoice: async (_: any, { id, payment_method, paid_date, photo_cheque_url, photo_verso_url, payer }: any) => {
            // Assign a line_number: find max line_number for this date across invoices and chiffres
            let maxLn = 0;
            const [existingInvoices, existingChiffre] = await Promise.all([
                query('SELECT line_number FROM invoices WHERE paid_date = $1 AND line_number IS NOT NULL', [paid_date]),
                query('SELECT diponce, diponce_divers FROM chiffres WHERE date = $1', [paid_date])
            ]);
            existingInvoices.rows.forEach((r: any) => { if (r.line_number > maxLn) maxLn = r.line_number; });
            if (existingChiffre.rows.length > 0) {
                try {
                    const items = typeof existingChiffre.rows[0].diponce === 'string' ? JSON.parse(existingChiffre.rows[0].diponce) : (existingChiffre.rows[0].diponce || []);
                    items.forEach((item: any) => { if (item.line_number > maxLn) maxLn = item.line_number; });
                } catch (e) { }
                try {
                    const items = typeof existingChiffre.rows[0].diponce_divers === 'string' ? JSON.parse(existingChiffre.rows[0].diponce_divers) : (existingChiffre.rows[0].diponce_divers || []);
                    items.forEach((item: any) => { if (item.line_number > maxLn) maxLn = item.line_number; });
                } catch (e) { }
            }
            const newLineNumber = maxLn + 1;

            const res = await query(
                "UPDATE invoices SET status = 'paid', payment_method = $1, paid_date = $2, photo_cheque_url = $3, photo_verso_url = $4, payer = $5, line_number = $6, coutachat = true, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *",
                [payment_method, paid_date, photo_cheque_url, photo_verso_url, payer, newLineNumber, id]
            );
            const row = res.rows[0];
            return {
                ...row,
                photos: JSON.stringify(row.photos || [])
            };
        },
        deleteInvoice: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM invoices WHERE id = $1', [id]);
            return true;
        },
        unpayInvoice: async (_: any, { id }: { id: number }) => {
            const res = await query(
                "UPDATE invoices SET status = 'unpaid', payment_method = NULL, paid_date = NULL, photo_cheque_url = NULL, photo_verso_url = NULL, payer = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
                [id]
            );
            const row = res.rows[0];
            if (!row) return null;
            return {
                ...row,
                photos: typeof row.photos === 'string' ? row.photos : JSON.stringify(row.photos || [])
            };
        },
        updateInvoice: async (_: any, { id, supplier_name, amount, date, photo_url, photos, doc_type, doc_number, payment_method, paid_date, category, details, coutachat }: any) => {
            const fields = [];
            const params = [];
            if (supplier_name !== undefined) { params.push(supplier_name); fields.push(`supplier_name = $${params.length}`); }
            if (amount !== undefined) { params.push(amount); fields.push(`amount = $${params.length}`); }
            if (date !== undefined) { params.push(date); fields.push(`date = $${params.length}`); }
            if (photo_url !== undefined) { params.push(photo_url); fields.push(`photo_url = $${params.length}`); }
            if (photos !== undefined) { params.push(photos); fields.push(`photos = $${params.length}::jsonb`); }
            if (doc_type !== undefined) { params.push(doc_type); fields.push(`doc_type = $${params.length}`); }
            if (doc_number !== undefined) { params.push(doc_number); fields.push(`doc_number = $${params.length}`); }
            if (payment_method !== undefined) { params.push(payment_method); fields.push(`payment_method = $${params.length}`); }
            if (paid_date !== undefined) { params.push(paid_date); fields.push(`paid_date = $${params.length}`); }
            if (category !== undefined) { params.push(category); fields.push(`category = $${params.length}`); }
            if (details !== undefined) { params.push(details); fields.push(`details = $${params.length}`); }
            if (coutachat !== undefined) { params.push(coutachat); fields.push(`coutachat = $${params.length}`); }

            if (fields.length === 0) {
                const r = await query('SELECT * FROM invoices WHERE id = $1', [id]);
                return { ...r.rows[0], photos: typeof r.rows[0].photos === 'string' ? r.rows[0].photos : JSON.stringify(r.rows[0].photos || []) };
            }

            params.push(id);
            const res = await query(
                `UPDATE invoices SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING *`,
                params
            );
            const row = res.rows[0];
            return {
                ...row,
                photos: typeof row.photos === 'string' ? row.photos : JSON.stringify(row.photos || [])
            };
        },
        upsertSupplier: async (_: any, { name }: { name: string }) => {
            // Normalize name (trim and title case or lowercase for comparison)
            const normalized = name.trim();
            const existing = await query('SELECT * FROM suppliers WHERE LOWER(name) = LOWER($1)', [normalized]);
            if (existing.rows.length > 0) return existing.rows[0];

            const res = await query('INSERT INTO suppliers (name) VALUES ($1) RETURNING *', [normalized]);
            return res.rows[0];
        },
        updateSupplier: async (_: any, { id, name }: { id: number, name: string }) => {
            const res = await query('UPDATE suppliers SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), id]);
            return res.rows[0];
        },
        deleteSupplier: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM suppliers WHERE id = $1', [id]);
            return true;
        },
        upsertDesignation: async (_: any, { name, type }: { name: string, type?: string }) => {
            const normalized = name.trim();
            const existing = await query('SELECT * FROM designations WHERE LOWER(name) = LOWER($1)', [normalized]);
            if (existing.rows.length > 0) {
                if (type && existing.rows[0].type !== type) {
                    const res = await query('UPDATE designations SET type = $1 WHERE id = $2 RETURNING *', [type, existing.rows[0].id]);
                    return res.rows[0];
                }
                return existing.rows[0];
            }

            const res = await query('INSERT INTO designations (name, type) VALUES ($1, $2) RETURNING *', [normalized, type || 'divers']);
            return res.rows[0];
        },
        updateDesignation: async (_: any, { id, name, type }: { id: number, name: string, type?: string }) => {
            let sql = 'UPDATE designations SET name = $1';
            const params: any[] = [name.trim()];
            if (type) {
                params.push(type);
                sql += `, type = $${params.length}`;
            }
            params.push(id);
            sql += ` WHERE id = $${params.length} RETURNING *`;
            const res = await query(sql, params);
            return res.rows[0];
        },
        deleteDesignation: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM designations WHERE id = $1', [id]);
            return true;
        },
        addBankDeposit: async (_: any, { amount, date, type }: { amount: string, date: string, type?: string }) => {
            const res = await query(
                'INSERT INTO bank_deposits (amount, date, type) VALUES ($1, $2, $3) RETURNING *',
                [amount, date, type || 'deposit']
            );
            return res.rows[0];
        },
        updateBankDeposit: async (_: any, { id, amount, date, type }: { id: number, amount: string, date: string, type?: string }) => {
            const res = await query(
                'UPDATE bank_deposits SET amount = $1, date = $2, type = $3 WHERE id = $4 RETURNING *',
                [amount, date, type || 'deposit', id]
            );
            return res.rows[0];
        },
        deleteBankDeposit: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM bank_deposits WHERE id = $1', [id]);
            return true;
        },
        addPaidInvoice: async (_: any, args: any) => {
            const { supplier_name, amount, date, photo_url, photos, photo_cheque_url, photo_verso_url, payment_method, paid_date, doc_type, doc_number, payer, category, details, coutachat } = args;
            const res = await query(
                "INSERT INTO invoices (supplier_name, amount, date, photo_url, photos, photo_cheque_url, photo_verso_url, status, payment_method, paid_date, doc_type, doc_number, payer, origin, category, details, coutachat, updated_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'paid', $8, $9, $10, $11, $12, 'direct_expense', $13, $14, $15, CURRENT_TIMESTAMP) RETURNING *",
                [supplier_name, amount, date, photo_url, photos || '[]', photo_cheque_url, photo_verso_url, payment_method, paid_date, doc_type || 'Facture', doc_number, payer, category, details, coutachat]
            );
            const row = res.rows[0];
            return {
                ...row,
                photos: JSON.stringify(row.photos || [])
            };
        },
        unlockChiffre: async (_: any, { date }: { date: string }) => {
            const res = await query('UPDATE chiffres SET is_locked = false WHERE date = $1 RETURNING *', [date]);
            return res.rows[0];
        },
        upsertEmployee: async (_: any, { name, department }: { name: string, department?: string }) => {
            const normalized = name.trim();
            const existing = await query('SELECT * FROM employees WHERE LOWER(name) = LOWER($1)', [normalized]);
            if (existing.rows.length > 0) {
                if (department && existing.rows[0].department !== department) {
                    const updated = await query('UPDATE employees SET department = $1 WHERE id = $2 RETURNING *', [department, existing.rows[0].id]);
                    return updated.rows[0];
                }
                return existing.rows[0];
            }
            const res = await query('INSERT INTO employees (name, department) VALUES ($1, $2) RETURNING *', [normalized, department || null]);
            return res.rows[0];
        },
        updateEmployee: async (_: any, { id, name, department }: { id: number, name: string, department?: string }) => {
            const res = await query('UPDATE employees SET name = $1, department = $2 WHERE id = $3 RETURNING *', [name.trim(), department || null, id]);
            return res.rows[0];
        },
        deleteEmployee: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM employees WHERE id = $1', [id]);
            return true;
        },
        addAvance: async (_: any, { username, amount, date, details }: any) => {
            await query("ALTER TABLE advances ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';").catch(() => { });
            const res = await query('INSERT INTO advances (employee_name, montant, date, details) VALUES ($1, $2, $3, $4) RETURNING id, employee_name as username, montant, details, created_at', [username, amount, date, details || '']);
            const row = res.rows[0];
            return { ...row, montant: parseFloat(row.montant) };
        },
        deleteAvance: async (_: any, { id }: any) => {
            const realId = id.toString().includes('_') ? id.split('_')[1] : id;
            await query('DELETE FROM advances WHERE id = $1', [realId]);
            return true;
        },
        addDoublage: async (_: any, { username, amount, date, details }: any) => {
            await query("ALTER TABLE doublages ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';").catch(() => { });
            const res = await query('INSERT INTO doublages (employee_name, montant, date, details) VALUES ($1, $2, $3, $4) RETURNING id, employee_name as username, montant, details, created_at', [username, amount, date, details || '']);
            const row = res.rows[0];
            return { ...row, montant: parseFloat(row.montant) };
        },
        deleteDoublage: async (_: any, { id }: any) => {
            const realId = id.toString().includes('_') ? id.split('_')[1] : id;
            await query('DELETE FROM doublages WHERE id = $1', [realId]);
            return true;
        },
        addExtra: async (_: any, { username, amount, date, details }: any) => {
            await query("ALTER TABLE extras ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';").catch(() => { });
            const res = await query('INSERT INTO extras (employee_name, montant, date, details) VALUES ($1, $2, $3, $4) RETURNING id, employee_name as username, montant, details, created_at', [username, amount, date, details || '']);
            const row = res.rows[0];
            return { ...row, montant: parseFloat(row.montant) };
        },
        deleteExtra: async (_: any, { id }: any) => {
            const realId = id.toString().includes('_') ? id.split('_')[1] : id;
            await query('DELETE FROM extras WHERE id = $1', [realId]);
            return true;
        },
        addPrime: async (_: any, { username, amount, date, details }: any) => {
            await query("ALTER TABLE primes ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';").catch(() => { });
            const res = await query('INSERT INTO primes (employee_name, montant, date, details) VALUES ($1, $2, $3, $4) RETURNING id, employee_name as username, montant, details, created_at', [username, amount, date, details || '']);
            const row = res.rows[0];
            return { ...row, montant: parseFloat(row.montant) };
        },
        deletePrime: async (_: any, { id }: any) => {
            const realId = id.toString().includes('_') ? id.split('_')[1] : id;
            await query('DELETE FROM primes WHERE id = $1', [realId]);
            return true;
        },
        addRestesSalaires: async (_: any, { username, amount, nb_jours, date, details }: any) => {
            await query(`
                CREATE TABLE IF NOT EXISTS restes_salaires_daily (
                    id SERIAL PRIMARY KEY,
                    employee_name TEXT NOT NULL,
                    montant DECIMAL(10,3) NOT NULL,
                    nb_jours DECIMAL(10,2),
                    details TEXT DEFAULT '',
                    date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await query("ALTER TABLE restes_salaires_daily ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';").catch(() => { });
            const res = await query('INSERT INTO restes_salaires_daily (employee_name, montant, nb_jours, date, details) VALUES ($1, $2, $3, $4, $5) RETURNING id, employee_name as username, montant, nb_jours, details, date, created_at', [username, amount, nb_jours || 0, date, details || '']);
            return { ...res.rows[0], montant: parseFloat(res.rows[0].montant), nb_jours: parseFloat(res.rows[0].nb_jours), created_at: res.rows[0].created_at };
        },
        deleteRestesSalaires: async (_: any, { id }: any) => {
            const realId = id.toString().includes('_') ? id.split('_')[1] : id;
            await query('DELETE FROM restes_salaires_daily WHERE id = $1', [realId]);
            return true;
        },
        upsertSalaryRemainder: async (_: any, { employee_name, amount, month, status }: any) => {
            // If it's the global "Restes Salaires", we allow multiple entries, so always INSERT.
            if (employee_name === 'Restes Salaires') {
                const res = await query(
                    'INSERT INTO salary_remainders (employee_name, amount, month, status, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
                    [employee_name, amount, month, status || 'confirmed']
                );
                const row = res.rows[0];
                return { ...row, updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null };
            }

            // For specific employees, we enforce one record per month (Update if exists)
            const existing = await query('SELECT id FROM salary_remainders WHERE employee_name = $1 AND month = $2', [employee_name, month]);
            if (existing.rows.length > 0) {
                const res = await query(
                    'UPDATE salary_remainders SET amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE employee_name = $3 AND month = $4 RETURNING *',
                    [amount, status || 'confirmed', employee_name, month]
                );
                const row = res.rows[0];
                return { ...row, updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null };
            } else {
                const res = await query(
                    'INSERT INTO salary_remainders (employee_name, amount, month, status, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
                    [employee_name, amount, month, status || 'confirmed']
                );
                const row = res.rows[0];
                return { ...row, updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null };
            }
        },
        deleteSalaryRemainder: async (_: any, { id }: any) => {
            await query('DELETE FROM salary_remainders WHERE id = $1', [id]);
            return true;
        },
        updatePassword: async (_: any, { username, newPassword }: any) => {
            await query('UPDATE public.logins SET password = $1 WHERE username = $2', [newPassword, username]);
            return true;
        },
        toggleSystemBlock: async (_: any, { isBlocked }: { isBlocked: boolean }) => {
            await query("UPDATE public.settings SET value = $1 WHERE key = 'is_blocked'", [isBlocked.toString()]);
            // If blocking the platform, disconnect ALL users (including admin) immediately
            if (isBlocked) {
                await query("UPDATE public.logins SET last_active = NULL");
            }
            return true;
        },
        upsertUser: async (_: any, { username, password, role, full_name, face_data }: any) => {
            const existing = await query('SELECT id FROM logins WHERE username = $1', [username]);
            let res;
            if (existing.rows.length > 0) {
                const fields = ['role = $1', 'full_name = $2'];
                const params = [role, full_name];

                if (password && password.trim() !== '') {
                    params.push(password);
                    fields.push(`password = $${params.length}`);
                }

                if (face_data) {
                    params.push(face_data);
                    fields.push(`face_data = $${params.length}`);
                    fields.push('has_face_id = true');
                }

                params.push(username);
                res = await query(
                    `UPDATE logins SET ${fields.join(', ')} WHERE username = $${params.length} RETURNING id, username, role, full_name, face_data, has_face_id`,
                    params
                );
            } else {
                res = await query(
                    'INSERT INTO logins (username, password, role, full_name, face_data, has_face_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, full_name, face_data, has_face_id',
                    [username, password, role, full_name, face_data, !!face_data]
                );
            }
            return res.rows[0];
        },
        deleteUser: async (_: any, { id }: any) => {
            await query('DELETE FROM logins WHERE id = $1', [id]);
            return true;
        },
        upsertDevice: async (_: any, { ip, name, type }: any) => {
            const existing = await query('SELECT id FROM devices WHERE ip = $1', [ip]);
            let res;
            if (existing.rows.length > 0) {
                res = await query(
                    'UPDATE devices SET name = $1, type = $2 WHERE ip = $3 RETURNING *',
                    [name, type, ip]
                );
            } else {
                res = await query(
                    'INSERT INTO devices (ip, name, type, status) VALUES ($1, $2, $3, \'offline\') RETURNING *',
                    [ip, name, type]
                );
            }
            return res.rows[0];
        },
        deleteDevice: async (_: any, { id }: any) => {
            await query('DELETE FROM devices WHERE id = $1', [id]);
            return true;
        },
        heartbeat: async (_: any, { username, deviceInfo, ipAddress }: any) => {
            const res = await query(`
                UPDATE logins 
                SET last_active = CURRENT_TIMESTAMP,
                    device_info = $2,
                    ip_address = $3
                WHERE LOWER(username) = LOWER($1)
                AND last_active IS NOT NULL
                RETURNING id
            `, [username, deviceInfo, ipAddress]);

            if (res.rowCount === 0) {
                console.log(`Heartbeat failed: session for ${username} was likely terminated by admin.`);
                return false;
            }

            return true;
        },
        recordConnection: async (_: any, { username, ipAddress, deviceInfo, browser }: any) => {
            // Record in logs
            await query(`
                INSERT INTO connection_logs (username, ip_address, device_info, browser)
                VALUES ($1, $2, $3, $4)
            `, [username, ipAddress, deviceInfo, browser]);

            // Also update main login status immediately
            await query(`
                UPDATE logins 
                SET last_active = CURRENT_TIMESTAMP,
                    ip_address = $2,
                    device_info = $3
                WHERE LOWER(username) = LOWER($1)
            `, [username, ipAddress, deviceInfo]);

            return true;
        },
        clearConnectionLogs: async () => {
            await query('TRUNCATE TABLE connection_logs');
            return true;
        },
        disconnectUser: async (_: any, { username }: any) => {
            await query('UPDATE logins SET last_active = NULL WHERE LOWER(username) = LOWER($1)', [username]);
            return true;
        },
        toggleUserBlock: async (_: any, { username, isBlocked }: any) => {
            await query('UPDATE logins SET is_blocked_user = $1 WHERE LOWER(username) = LOWER($2)', [isBlocked, username]);
            return true;
        },

        uploadJournalierPhotos: async (_: any, { date, category, item_index, photos }: any) => {
            const existing = await query(
                'SELECT id FROM photo_journalier WHERE date = $1 AND category = $2 AND item_index = $3',
                [date, category, item_index]
            );

            let res;
            if (existing.rows.length > 0) {
                res = await query(
                    'UPDATE photo_journalier SET photos = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                    [photos, existing.rows[0].id]
                );
            } else {
                res = await query(
                    'INSERT INTO photo_journalier (date, category, item_index, photos) VALUES ($1, $2, $3, $4::jsonb) RETURNING *',
                    [date, category, item_index, photos]
                );
            }
            const row = res.rows[0];
            return {
                ...row,
                photos: typeof row.photos === 'string' ? row.photos : JSON.stringify(row.photos || [])
            };
        },
        deleteJournalierPhoto: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM photo_journalier WHERE id = $1', [id]);
            return true;
        },
        clearChiffreData: async (_: any, { date }: { date: string }) => {
            // Delete from all associated tables for this date
            await query('DELETE FROM chiffres WHERE date = $1', [date]);
            await query('DELETE FROM advances WHERE date = $1', [date]);
            await query('DELETE FROM doublages WHERE date = $1', [date]);
            await query('DELETE FROM extras WHERE date = $1', [date]);
            await query('DELETE FROM primes WHERE date = $1', [date]);
            await query('DELETE FROM restes_salaires_daily WHERE date = $1', [date]);
            await query('DELETE FROM photo_journalier WHERE date = $1', [date]);

            // Handle invoices:
            // 1. Delete invoices created directly in/for the daily sheet
            await query("DELETE FROM invoices WHERE origin = 'daily_sheet' AND (paid_date = $1 OR date = $1)", [date]);
            // 2. Unpay ANY other invoices paid on that date that might show up in journalier
            await query("UPDATE invoices SET status = 'unpaid', paid_date = NULL, payment_method = NULL WHERE status = 'paid' AND paid_date = $1 AND (payer IS NULL OR payer != 'riadh')", [date]);

            return true;
        },
        replaceChiffreDate: async (_: any, { oldDate, newDate }: { oldDate: string, newDate: string }) => {
            // Update all associated tables
            await query('UPDATE chiffres SET date = $1 WHERE date = $2', [newDate, oldDate]);
            await query('UPDATE advances SET date = $1 WHERE date = $2', [newDate, oldDate]);
            await query('UPDATE doublages SET date = $1 WHERE date = $2', [newDate, oldDate]);
            await query('UPDATE extras SET date = $1 WHERE date = $2', [newDate, oldDate]);
            await query('UPDATE primes SET date = $1 WHERE date = $2', [newDate, oldDate]);
            await query('UPDATE restes_salaires_daily SET date = $1 WHERE date = $2', [newDate, oldDate]);
            await query('UPDATE photo_journalier SET date = $1 WHERE date = $2', [newDate, oldDate]);

            // Handle invoices:
            // Update paid_date for all invoices paid on that date (that are visible in journalier)
            await query("UPDATE invoices SET paid_date = $1 WHERE paid_date = $2 AND (payer IS NULL OR payer != 'riadh')", [newDate, oldDate]);
            // Also update the creation date for invoices created in/for the daily sheet
            await query("UPDATE invoices SET date = $1 WHERE date = $2 AND origin = 'daily_sheet'", [newDate, oldDate]);

            return true;
        },

        addArticleFamily: async (_: any, { name }: { name: string }) => {
            const res = await query(
                'INSERT INTO article_families (name, rows, suppliers) VALUES ($1, $2, $3) RETURNING *',
                [name, '[]', '[]']
            );
            const r = res.rows[0];
            return {
                ...r,
                rows: typeof r.rows === 'string' ? r.rows : JSON.stringify(r.rows || []),
                suppliers: typeof r.suppliers === 'string' ? r.suppliers : JSON.stringify(r.suppliers || [])
            };
        },
        updateArticleFamily: async (_: any, { id, name, rows, suppliers }: { id: number, name?: string, rows?: string, suppliers?: string }) => {
            const updates = [];
            const values = [];
            let i = 1;

            if (name !== undefined) {
                updates.push(`name = $${i++}`);
                values.push(name);
            }
            if (rows !== undefined) {
                updates.push(`rows = $${i++}::jsonb`);
                values.push(rows);
            }
            if (suppliers !== undefined) {
                updates.push(`suppliers = $${i++}::jsonb`);
                values.push(suppliers);
            }

            if (updates.length === 0) return null;

            values.push(id);
            const res = await query(
                `UPDATE article_families SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
                values
            );
            const r = res.rows[0];
            if (!r) return null;
            return {
                ...r,
                rows: typeof r.rows === 'string' ? r.rows : JSON.stringify(r.rows || []),
                suppliers: typeof r.suppliers === 'string' ? r.suppliers : JSON.stringify(r.suppliers || [])
            };
        },
        deleteArticleFamily: async (_: any, { id }: { id: number }) => {
            await query('DELETE FROM article_families WHERE id = $1', [id]);
            return true;
        },
    },
};
