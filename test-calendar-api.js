(async () => {
  console.log("Syncing calendar via API...");
  try {
    const res = await fetch('http://localhost:3000/api/calendar', { method: 'POST' });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
    
    console.log("Fetching calendar...");
    const res2 = await fetch('http://localhost:3000/api/calendar');
    const data = await res2.json();
    console.log("Events:", data.events?.length);
  } catch (err) {
    console.error(err);
  }
})();
