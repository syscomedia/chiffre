import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

// Handling __dirname in ESM if needed, or just assume standard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const WRONG_DATE = '2026-01-23';
const CORRECT_DATE = '2026-01-22';

// Create pool directly to avoid module loading issues and potential parsing bugs
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const query = (text: string, params?: any[]) => pool.query(text, params);

async function fixDate() {
    console.log(`Starting migration from ${WRONG_DATE} to ${CORRECT_DATE}...`);

    try {
        // 1. Chiffres
        const checkChiffre = await query('SELECT id FROM chiffres WHERE date = $1', [CORRECT_DATE]);
        if (checkChiffre.rows.length > 0) {
            console.log(`WARNING: Chiffre for ${CORRECT_DATE} already exists (ID: ${checkChiffre.rows[0].id}). Deleting it to allow migration.`);
            await query('DELETE FROM chiffres WHERE date = $1', [CORRECT_DATE]);
        }

        const updateChiffre = await query('UPDATE chiffres SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateChiffre.rowCount || 0} rows in 'chiffres'.`);

        // 2. Invoices (Expenses)
        const updateInvoicesPaid = await query(`UPDATE invoices SET paid_date = $1 WHERE paid_date = $2`, [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateInvoicesPaid.rowCount || 0} rows in 'invoices' (paid_date).`);

        const updateInvoicesDate = await query(`UPDATE invoices SET date = $1 WHERE date = $2`, [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateInvoicesDate.rowCount || 0} rows in 'invoices' (date).`);

        // 3. Advances
        const updateAdvances = await query('UPDATE advances SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateAdvances.rowCount || 0} rows in 'advances'.`);

        // 4. Doublages
        const updateDoublages = await query('UPDATE doublages SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateDoublages.rowCount || 0} rows in 'doublages'.`);

        // 5. Extras
        const updateExtras = await query('UPDATE extras SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateExtras.rowCount || 0} rows in 'extras'.`);

        // 6. Primes
        const updatePrimes = await query('UPDATE primes SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updatePrimes.rowCount || 0} rows in 'primes'.`);

        // 7. Restes Salaires Daily
        try {
            // Check if table exists first to avoid error if it doesn't
            const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restes_salaires_daily')");
            if (checkTable.rows[0].exists) {
                const updateRestes = await query('UPDATE restes_salaires_daily SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
                console.log(`Updated ${updateRestes.rowCount || 0} rows in 'restes_salaires_daily'.`);
            } else {
                console.log("Table 'restes_salaires_daily' does not exist, skipping.");
            }
        } catch (e: any) {
            console.log("Error updating 'restes_salaires_daily':", e.message);
        }

        // 8. Bank Deposits
        const updateBank = await query('UPDATE bank_deposits SET date = $1 WHERE date = $2', [CORRECT_DATE, WRONG_DATE]);
        console.log(`Updated ${updateBank.rowCount || 0} rows in 'bank_deposits'.`);

        console.log("Migration completed successfully.");

    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

fixDate();
