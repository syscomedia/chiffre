import { Pool } from 'pg';

const beyPool = new Pool({
    connectionString: process.env.BEY_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bey',
});

export const beyQuery = (text: string, params?: any[]) => beyPool.query(text, params);

export default beyPool;
