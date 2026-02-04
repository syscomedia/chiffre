import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('Running migration via API...');
        await query("ALTER TABLE chiffres ADD COLUMN IF NOT EXISTS extra TEXT DEFAULT '0';");
        await query("ALTER TABLE chiffres ADD COLUMN IF NOT EXISTS primes TEXT DEFAULT '0';");

        // Add missing invoice columns
        await query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS photo_cheque_url TEXT;");
        await query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS photo_verso_url TEXT;");
        await query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'Facture';");

        await query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_number TEXT;");
        await query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payer VARCHAR(255);");

        // Add details column to personnel tables
        const personnelTables = ['advances', 'doublages', 'extras', 'primes', 'restes_salaires_daily'];
        for (const table of personnelTables) {
            await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';`).catch(() => {});
        }

        return NextResponse.json({ success: true, message: 'Migration successful: Extra columns added' });
    } catch (err: any) {
        console.error('Migration failed:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST() {
    return GET();
}
