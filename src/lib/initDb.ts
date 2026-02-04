import { query } from './db';

const initDb = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.logins (
        id serial NOT NULL,
        username character varying(255) COLLATE pg_catalog."default" NOT NULL,
        password character varying(255) COLLATE pg_catalog."default" NOT NULL,
        role character varying(50) COLLATE pg_catalog."default" NOT NULL,
        full_name character varying(100) COLLATE pg_catalog."default",
        last_active timestamptz DEFAULT NULL,
        CONSTRAINT logins_pkey PRIMARY KEY (id),
        CONSTRAINT logins_username_key UNIQUE (username)
      );
    `);

    // Ensure necessary columns exist for activity and security tracking
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logins' AND column_name='last_active') THEN
          ALTER TABLE public.logins ADD COLUMN last_active timestamptz DEFAULT NULL;
        ELSE
          ALTER TABLE public.logins ALTER COLUMN last_active TYPE timestamptz;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logins' AND column_name='device_info') THEN
          ALTER TABLE public.logins ADD COLUMN device_info text;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logins' AND column_name='ip_address') THEN
          ALTER TABLE public.logins ADD COLUMN ip_address character varying(50);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logins' AND column_name='is_blocked_user') THEN
          ALTER TABLE public.logins ADD COLUMN is_blocked_user boolean DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logins' AND column_name='face_data') THEN
          ALTER TABLE public.logins ADD COLUMN face_data text;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logins' AND column_name='has_face_id') THEN
          ALTER TABLE public.logins ADD COLUMN has_face_id boolean DEFAULT false;
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.chiffres (
        id serial NOT NULL,
        date character varying(255) COLLATE pg_catalog."default" NOT NULL,
        recette_de_caisse character varying(255) COLLATE pg_catalog."default" NOT NULL,
        total_diponce character varying(255) COLLATE pg_catalog."default" NOT NULL,
        diponce jsonb,
        diponce_divers jsonb,
        recette_net character varying(255) COLLATE pg_catalog."default" NOT NULL,
        tpe character varying(255) COLLATE pg_catalog."default" NOT NULL,
        cheque_bancaire character varying(255) COLLATE pg_catalog."default" NOT NULL,
        espaces character varying(255) COLLATE pg_catalog."default" NOT NULL,
        tickets_restaurant character varying(255) DEFAULT '0',
        extra character varying(255) DEFAULT '0',
        primes character varying(255) DEFAULT '0',
        CONSTRAINT chiffres_pkey PRIMARY KEY (id)
      );
    `);

    // Ensure columns exist if table was already created
    const columns = [
      { name: 'tickets_restaurant', type: 'character varying(255)', default: "'0'" },
      { name: 'extra', type: 'character varying(255)', default: "'0'" },
      { name: 'primes', type: 'character varying(255)', default: "'0'" },
      { name: 'diponce_divers', type: 'jsonb', default: null },
      { name: 'diponce_admin', type: 'jsonb', default: null },
      { name: 'is_locked', type: 'boolean', default: 'false' }
    ];

    for (const col of columns) {
      await query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chiffres' AND column_name='${col.name}') THEN
            ALTER TABLE public.chiffres ADD COLUMN ${col.name} ${col.type} ${col.default ? 'DEFAULT ' + col.default : ''};
          END IF;
        END $$;
      `);
    }

    await query(`
      CREATE TABLE IF NOT EXISTS public.suppliers (
        id serial NOT NULL,
        name character varying(255) NOT NULL,
        CONSTRAINT suppliers_pkey PRIMARY KEY (id),
        CONSTRAINT suppliers_name_key UNIQUE (name)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.employees (
        id serial NOT NULL,
        name character varying(255) NOT NULL,
        department character varying(100),
        CONSTRAINT employees_pkey PRIMARY KEY (id),
        CONSTRAINT employees_name_key UNIQUE (name)
      );
    `);

    // Ensure department column exists for employees
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='department') THEN
          ALTER TABLE public.employees ADD COLUMN department character varying(100);
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.invoices (
        id serial NOT NULL,
        supplier_name character varying(255) NOT NULL,
        amount character varying(255) NOT NULL,
        date character varying(255) NOT NULL,
        photo_url text,
        photos jsonb DEFAULT '[]',
        status character varying(50) DEFAULT 'unpaid',
        payment_method character varying(50),
        paid_date character varying(255),
        photo_cheque_url text,
        photo_verso_url text,
        category character varying(50),
        doc_type character varying(50),
        doc_number character varying(255),
        origin character varying(50),
        payer character varying(50),
        details text,
        coutachat boolean DEFAULT NULL,
        CONSTRAINT invoices_pkey PRIMARY KEY (id)
      );
    `);

    // Ensure missing columns exist for invoices
    const invoiceCols = [
      { name: 'category', type: 'character varying(50)' },
      { name: 'doc_type', type: 'character varying(50)' },
      { name: 'doc_number', type: 'character varying(255)' },
      { name: 'origin', type: 'character varying(50)' },
      { name: 'payer', type: 'character varying(50)' },
      { name: 'details', type: 'text' },
      { name: 'has_retenue', type: 'boolean', default: 'false' },
      { name: 'original_amount', type: 'character varying(255)' },
      { name: 'line_number', type: 'integer' },
      { name: 'coutachat', type: 'boolean', default: 'NULL' }
    ];

    for (const col of invoiceCols) {
      await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='${col.name}') THEN
                    ALTER TABLE public.invoices ADD COLUMN ${col.name} ${col.type} ${col.default ? 'DEFAULT ' + col.default : ''};
                END IF;
            END $$;
        `);
    }

    // Ensure photos column exists
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='photos') THEN
          ALTER TABLE public.invoices ADD COLUMN photos jsonb DEFAULT '[]';
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.designations (
        id serial NOT NULL,
        name character varying(255) NOT NULL,
        type character varying(50) DEFAULT 'divers',
        CONSTRAINT designations_pkey PRIMARY KEY (id),
        CONSTRAINT designations_name_key UNIQUE (name)
      );
    `);

    // Ensure type column exists if table was already created
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='designations' AND column_name='type') THEN
          ALTER TABLE public.designations ADD COLUMN type character varying(50) DEFAULT 'divers';
        END IF;
      END $$;
    `);

    // Seed default designations if empty - REMOVED AS REQUESTED BY USER
    /*
    const ds = await query('SELECT count(*) FROM public.designations');
    if (parseInt(ds.rows[0].count) === 0) {
      const journalier = ["Fruits", "khodhra", "Transport", "Petit déjeuner"];
      const divers = ["Entretien", "Outils", "Divers"];

      for (const d of journalier) {
        await query('INSERT INTO public.designations (name, type) VALUES ($1, $2)', [d, 'divers']);
      }
      for (const d of divers) {
        await query('INSERT INTO public.designations (name, type) VALUES ($1, $2)', [d, 'divers']);
      }
    }
    */

    // Migrate any leftover 'journalier' types to 'divers'
    await query("UPDATE public.designations SET type = 'divers' WHERE type = 'journalier'");

    // Create tables for details if they don't exist
    const detailTables = ['advances', 'doublages', 'extras', 'primes'];
    for (const table of detailTables) {
      await query(`
        CREATE TABLE IF NOT EXISTS public.${table} (
          id serial NOT NULL,
          employee_name character varying(255) NOT NULL,
          montant character varying(255) NOT NULL,
          details text DEFAULT '',
          date character varying(255) NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT ${table}_pkey PRIMARY KEY (id)
        );
      `);
    }

    // Add details column to existing personnel tables if missing
    const allPersonnelTables = ['advances', 'doublages', 'extras', 'primes', 'restes_salaires_daily'];
    for (const table of allPersonnelTables) {
      await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';`).catch(() => { });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS public.settings (
        key character varying(255) PRIMARY KEY,
        value text
      );
    `);

    // Initialize block status if not exists
    await query("INSERT INTO public.settings (key, value) VALUES ('is_blocked', 'false') ON CONFLICT (key) DO NOTHING");

    await query(`
      CREATE TABLE IF NOT EXISTS public.devices (
        id serial PRIMARY KEY,
        ip character varying(50) NOT NULL UNIQUE,
        name character varying(255),
        type character varying(50),
        status character varying(50) DEFAULT 'offline',
        last_seen timestamp
      );
    `);

    // Seed default users if empty
    const logCheck = await query('SELECT count(*) FROM public.logins');
    if (parseInt(logCheck.rows[0].count) === 0) {
      await query("INSERT INTO public.logins (username, password, role, full_name) VALUES ('admin', 'admin', 'admin', 'Administrateur')");
      await query("INSERT INTO public.logins (username, password, role, full_name) VALUES ('caissier', 'caissier', 'caissier', 'Caissier Principal')");
    }

    await query(`
      CREATE TABLE IF NOT EXISTS public.connection_logs (
        id serial PRIMARY KEY,
        username character varying(255) NOT NULL,
        ip_address character varying(50),
        device_info text,
        browser text,
        connected_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.bank_deposits (
        id serial PRIMARY KEY,
        amount character varying(255) NOT NULL,
        date character varying(255) NOT NULL,
        type character varying(50) DEFAULT 'deposit',
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure type column exists for bank_deposits
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_deposits' AND column_name='type') THEN
          ALTER TABLE public.bank_deposits ADD COLUMN type character varying(50) DEFAULT 'deposit';
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.photo_journalier (
        id serial PRIMARY KEY,
        date character varying(255) NOT NULL,
        category character varying(255) NOT NULL,
        item_index integer NOT NULL,
        photos jsonb DEFAULT '[]',
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS public.article_families (
        id serial PRIMARY KEY,
        name character varying(255) NOT NULL UNIQUE,
        rows jsonb DEFAULT '[]',
        suppliers jsonb DEFAULT '[]',
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

export default initDb;
