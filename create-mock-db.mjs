import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

console.log('Starting Intelligent Mock DB Creation...');

const sourcePath = path.resolve('dev.db');
const destPath = path.resolve('mock.db');

if (fs.existsSync(destPath)) {
  fs.unlinkSync(destPath);
  console.log('Removed old mock.db');
}

fs.copyFileSync(sourcePath, destPath);
console.log('Copied dev.db to mock.db. Performing cleanup...');

const db = new Database(destPath);

console.log('Identifying critical bills tied to mock data...');
// Identify all bills that the user has interacted with
const queries = [
  `SELECT billId AS id FROM Watchlist WHERE billId IS NOT NULL`,
  `SELECT billId AS id FROM BillCollection WHERE billId IS NOT NULL`,
  `SELECT billId AS id FROM Testimony WHERE billId IS NOT NULL`,
  `SELECT billId AS id FROM Markup WHERE billId IS NOT NULL`,
  `SELECT billId AS id FROM Annotation WHERE billId IS NOT NULL`
];

let criticalBills = new Set();
for (const q of queries) {
  try {
    const rows = db.prepare(q).all();
    rows.forEach(r => criticalBills.add(r.id));
  } catch (e) {
    console.error('Skipping a query due to table misname:', e.message);
  }
}

console.log(`Found ${criticalBills.size} critical bills actively used by mock data.`);

// Keep additional 150 most recently updated bills for the general directory
const recentBillsQuery = `
  SELECT id FROM Bill 
  ORDER BY lastActionDate DESC 
  LIMIT 150
`;
const recentBills = db.prepare(recentBillsQuery).all().map(r => r.id);

const billsToKeep = new Set([...criticalBills, ...recentBills]);
const keepIds = Array.from(billsToKeep).map(id => `'${id}'`).join(',');

console.log(`Keeping a total of ${billsToKeep.size} bills. Deleting the rest to save deployment size...`);

if (keepIds) {
  db.prepare(`DELETE FROM Bill WHERE id NOT IN (${keepIds})`).run();
}

console.log('Cleaning up orphaned records...');
// Clean up orphaned relations
db.prepare(`DELETE FROM LegislatorBill WHERE billId NOT IN (SELECT id FROM Bill)`).run();
db.prepare(`DELETE FROM BillText WHERE billId NOT IN (SELECT id FROM Bill)`).run();

// Clean up massive BillText payloads except the first 20 associated with kept bills
db.prepare(`
  DELETE FROM BillText 
  WHERE id NOT IN (
    SELECT id FROM BillText WHERE billId IN (${keepIds || "'dummy'"}) LIMIT 20
  )
`).run();

// Optimize DB and reclaim space
db.prepare(`VACUUM`).run();
db.close();

// Check final size
const stats = fs.statSync(destPath);
const mb = stats.size / (1024 * 1024);
console.log(`Success! mock.db is now ${mb.toFixed(2)} MB.`);
