import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'unpaid_creation';
        `);

        return NextResponse.json({ success: true, message: "Migration executed: Added origin column" });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
