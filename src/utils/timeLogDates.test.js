import { describe, it, expect } from 'vitest';
import { fillTimeLogDates, followingDay } from './timeLogDates.js';
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
