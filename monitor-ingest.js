const Database = require('better-sqlite3');

function monitor() {
  const db = new Database('./dev.db', { readonly: true });
  
  try {
    const states = ['US', 'NE', 'IA'];
    console.log(`\n--- Ingestion Status (${new Date().toLocaleTimeString()}) ---`);
    
    // Count total bills
    const totalBills = db.prepare('SELECT COUNT(*) as count FROM Bill').get().count;
    console.log(`Total Bills in DB: ${totalBills}`);
    
    // Count bills by state
    const byState = db.prepare('SELECT state, COUNT(*) as count FROM Bill GROUP BY state').all();
    console.log('\nBills by State:');
    if (byState.length === 0) {
      console.log('No bills found.');
    } else {
      byState.forEach(row => {
        console.log(`- ${row.state}: ${row.count}`);
      });
    }
    
    // Recent activity (last 5 ingested/updated)
    const recent = db.prepare('SELECT state, number, title, updatedAt FROM Bill ORDER BY updatedAt DESC LIMIT 5').all();
    if (recent.length > 0) {
        console.log('\nMost Recently Ingested/Updated Bills:');
        recent.forEach(r => {
            console.log(`- [${r.state} ${r.number}] ${r.title ? r.title.substring(0, 50) + '...' : 'No title'}`);
        });
    }
  } catch (err) {
    if (err.message.includes('no such table')) {
      console.log('Ingestion has not yet created the tables or started saving data.');
    } else {
      console.error('Error reading database:', err.message);
    }
  } finally {
    db.close();
  }
}

// Run it once, then run it every 5 seconds for a few times
monitor();
let runs = 0;
const interval = setInterval(() => {
  runs++;
  monitor();
  if (runs >= 3) clearInterval(interval);
}, 5000);
