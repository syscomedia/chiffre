
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');

        await client.query('BEGIN');

        // 1. Advances
        console.log('Migrating advances...');
        await client.query(`
      ALTER TABLE advances 
      ALTER COLUMN montant TYPE NUMERIC(10, 3) 
      USING (REPLACE(montant::TEXT, ',', '.')::NUMERIC);
    `);

        // 2. Doublages
        console.log('Migrating doublages...');
        await client.query(`
      ALTER TABLE doublages 
      ALTER COLUMN montant TYPE NUMERIC(10, 3) 
      USING (REPLACE(montant::TEXT, ',', '.')::NUMERIC);
    `);

        // 3. Extras
        console.log('Migrating extras...');
        await client.query(`
      ALTER TABLE extras 
      ALTER COLUMN montant TYPE NUMERIC(10, 3) 
      USING (REPLACE(montant::TEXT, ',', '.')::NUMERIC);
    `);

        // 4. Primes
        console.log('Migrating primes...');
        await client.query(`
      ALTER TABLE primes 
      ALTER COLUMN montant TYPE NUMERIC(10, 3) 
      USING (REPLACE(montant::TEXT, ',', '.')::NUMERIC);
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
