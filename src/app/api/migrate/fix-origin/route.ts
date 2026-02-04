import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Fix for invoices that were added as direct expenses but got the default 'unpaid_creation'
        // We assume that if status is 'paid' and payer is 'riadh' and no photos are attached, 
        // it's likely a direct expense added via the "Ajouter une dépense" form.
        // Also specifically targeting ID 22 mentioned in logs.
        const res = await query(`
            UPDATE invoices 
            SET origin = 'direct_expense' 
            WHERE (origin = 'unpaid_creation' OR origin IS NULL) 
            AND status = 'paid' 
            AND payer = 'riadh'
            AND (photo_url IS NULL OR photo_url = '')
            AND (photo_cheque_url IS NULL OR photo_cheque_url = '')
        `);

        return NextResponse.json({ message: 'Migration successful', rowsAffected: res.rowCount });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
