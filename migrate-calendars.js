import { listBills } from './lib/store.js';
import { ingestBill } from './lib/ingest.js';
import { syncCalendar } from './lib/calendar.js';

(async () => {
  console.log("Retroactively re-ingesting all locally tracked bills to capture missing calendar payloads...");
  
  const bills = listBills();
  console.log(`Found ${bills.length} bills to re-hydrate.`);
  
  for (const bill of bills) {
    if (!bill.id) continue;
    console.log(`  -> Re-ingesting bill ${bill.id} ${bill.number}...`);
    try {
      await ingestBill(bill.id);
    } catch (err) {
      console.log(`     Error re-ingesting ${bill.id}:`, err.message);
    }
  }
  
  console.log("\nTriggering a new Bottom-Up Extractor Sync over the active jurisdictions: US, NE...");
  await syncCalendar("US");
  await syncCalendar("NE");
  await syncCalendar("IA");
  
  console.log("Migration complete!");
})();
