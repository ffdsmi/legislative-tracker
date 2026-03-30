const BASE_URL = 'https://api.regulations.gov/v4';
async function test() {
  const agency = 'NCUA';
  const url = `${BASE_URL}/dockets?filter[agencyId]=${agency}&sort=-lastModifiedDate&page[size]=25`;
  try {
    console.log('Fetching:', url);
    const response = await fetch(url, { headers: { 'X-Api-Key': 'DEMO_KEY' } });
    console.log(response.status);
    const data = await response.json();
    console.log(data);
  } catch(e) {
    console.error(e);
  }
}
test();
