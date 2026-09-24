const formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function reportStartDay(startAt) {
  if (!startAt) return '';
  // A date-only value is already a calendar day, not a UTC timestamp.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(startAt) ? `${startAt}T12:00:00` : startAt);
  return Number.isNaN(date.getTime()) ? '' : formatDate(date);
}

export function followingDay(day) {
  if (!day) return '';
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

export function fillTimeLogDates(rows = [], startAt) {
  let next = reportStartDay(startAt);
  return rows.map(row => {
    const result = row.date || !next ? row : { ...row, date: next };
    next = followingDay(result.date);
    return result;
  });
}

// Populate the trip's calendar days without replacing existing work or signatures.
export function populateTripTimeLogs(rows = [], startAt, endAt, makeId) {
  const start = reportStartDay(startAt);
  if (!start) return rows;
  const end = reportStartDay(endAt) || start;
  if (end < start) return rows;
  const result = fillTimeLogDates(rows, startAt);
  const dates = new Set(result.map(row => row.date));
  for (let day = start; day <= end && result.length < 7; day = followingDay(day)) {
    if (dates.has(day)) continue;
    result.push({ id: makeId(), date: day, timeIn: '', timeOut: '', travelTime: '', signature: '' });
    dates.add(day);
  }
  return result;
}
