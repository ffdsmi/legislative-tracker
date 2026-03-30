import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const rawUri = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
const connectionString = rawUri ? rawUri.split('?')[0] : '';
const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);

// Instantiate Postgres via Prisma
const prisma = new PrismaClient({ adapter, log: ['error'] });

// Connect to the full 'dev.db' containing all the real API-pulled datasets
const sqliteDbPath = path.resolve('dev.db');
const sqlite = new Database(sqliteDbPath);

// Define order of tables based on relational dependencies
const tablesToSync = [
  'BillText'
];

async function sync() {
  console.log('Initiating database sync from SQLite (mock) to Supabase PostgreSQL...');

  try {
    for (const table of tablesToSync) {
      console.log(`Processing table: ${table}...`);
      
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length === 0) {
        console.log(`- Skipping ${table} (0 rows)`);
        continue;
      }

      console.log(`- Moving ${rows.length} rows into Supabase...`);
      const chunks = [];
      const CHUNK_SIZE = 50;

      // Slice rows into chunks of 50 for efficient bulk inserts
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunks.push(rows.slice(i, i + CHUNK_SIZE));
      }

      // Use lowerCase first letter for prisma model access
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      const prismaModel = prisma[modelName];

      for (const chunk of chunks) {
        // Many records have stringified dates inside SQLite but need real Date objects in Prisma Postgres
        const parsedChunk = chunk.map(row => {
          const newRow = { ...row };
          // Convert typical DateTime fields from SQLite String to native JS Date for Postgres
          if (newRow.createdAt) newRow.createdAt = new Date(newRow.createdAt);
          if (newRow.updatedAt) newRow.updatedAt = new Date(newRow.updatedAt);
          if (table === 'Alert' && newRow.read !== undefined) newRow.read = Boolean(newRow.read);
          return newRow;
        });

        try {
          await prismaModel.createMany({
            data: parsedChunk,
            skipDuplicates: true // Robust recovery
          });
        } catch (insertionError) {
          console.error(`Error inserting chunk in ${table}:`, insertionError.message);
        }
      }
      console.log(`- ${table} migration complete.`);
    }

    console.log('\\n✅ Supabase migration completed successfully!');
  } catch (error) {
    console.error('Fatal Migration Error:', error);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
  }
}

sync();
