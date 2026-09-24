import { parseTripInvite } from "./inviteParser.js";
import { describe, it, expect } from 'vitest';
import { fillTimeLogDates, followingDay, populateTripTimeLogs } from './timeLogDates.js';
describe('daily log dates', () => {
  it('starts on the report date and advances across month and year boundaries', () => {
    expect(fillTimeLogDates([{}, {}, {}], '2026-12-31T09:00').map(row => row.date)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
    expect(followingDay('2028-02-28')).toBe('2028-02-29');
  });
  it('keeps entered dates, times and signatures and fills subsequent blank rows', () => {
    const saved = { date: '2026-09-25', timeIn: '08:00', signatureInk: 'saved' };
    const result = fillTimeLogDates([{}, saved, {}], '2026-09-23');
    expect(result.map(row => row.date)).toEqual(['2026-09-23', '2026-09-25', '2026-09-26']);
    expect(result[1]).toBe(saved);
  });
  it('leaves dates blank without a valid report start date', () => {
    expect(fillTimeLogDates([{}], '')).toEqual([{}]);
    expect(fillTimeLogDates([{}], 'invalid')).toEqual([{}]);
  });
});

 describe('trip date range', () => {
  it('creates every trip day even when no rows exist, leaving work hours blank', () => {
    const rows = populateTripTimeLogs([], '2026-09-21T08:00', '2026-09-24T17:00', () => crypto.randomUUID());
    expect(rows.map(row => row.date)).toEqual(['2026-09-21','2026-09-22','2026-09-23','2026-09-24']);
    expect(rows.every(row => !row.timeIn && !row.timeOut && !row.travelTime)).toBe(true);
    expect(new Set(rows.map(row => row.id)).size).toBe(4);
  });
  it('preserves saved work and respects the seven-row limit', () => {
    const saved = {id:'saved',date:'2026-09-22',timeIn:'09:15',signatureInk:'ink'};
    const rows = populateTripTimeLogs([saved], '2026-09-21', '2026-09-30', () => crypto.randomUUID());
    expect(rows[0]).toBe(saved);
    expect(rows).toHaveLength(7);
    expect(rows.filter(row=>row.date==='2026-09-22')).toHaveLength(1);
  });
 });

it('uses an imported all-day invite without adding its exclusive end day', () => {
  const invite = parseTripInvite('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:trip-log-test\r\nSUMMARY:J21460 Start Up\r\nDTSTART;VALUE=DATE:20260921\r\nDTEND;VALUE=DATE:20260925\r\nEND:VEVENT\r\nEND:VCALENDAR');
  const rows = populateTripTimeLogs([{id:'first',date:''}], invite.startAt, invite.endAt, () => crypto.randomUUID());
  expect(rows.map(row=>row.date)).toEqual(['2026-09-21','2026-09-22','2026-09-23','2026-09-24']);
});
