import { getCalendar } from './lib/legiscan.js';
(async () => {
  try {
    const res = await getCalendar('US');
    console.log(res);
  } catch (err) {
    console.error(err);
  }
})();
