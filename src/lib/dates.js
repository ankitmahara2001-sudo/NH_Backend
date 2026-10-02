// Calendar-date helpers. Travel dates are plain "YYYY-MM-DD" strings in India time (IST),
// so "today" is computed in Asia/Kolkata regardless of the server's timezone.

const IST_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in India as YYYY-MM-DD. */
export function todayIst(now = new Date()) {
  return IST_FORMAT.format(now);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** First and last day of a YYYY-MM month. */
export function monthRange(month) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return { start, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/** Later of two YYYY-MM-DD dates (string comparison works for this format). */
export function maxDate(a, b) {
  return a > b ? a : b;
}
