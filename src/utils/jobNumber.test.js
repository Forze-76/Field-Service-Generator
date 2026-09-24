import { describe, it, expect } from 'vitest';
import { serialFromJob } from './jobNumber.js';
import { exportHeader } from './exportData.js';
describe('job and serial binding', () => {
  it('uses the job numeric value even when saved serial fields disagree', () => {
    const report = { jobNo: 'J#21460', serialNumber: '99999', sharedSite: { serialNumberText: '88888' } };
    expect(exportHeader(report).serial).toBe('21460');
    expect(exportHeader({ ...report, jobNo: 'J21461' }).serial).toBe('21461');
    expect(exportHeader({ ...report, jobNo: '21462' }).serial).toBe('21462');
  });
  it('preserves leading zeroes and rejects incomplete or malformed jobs', () => {
    expect(serialFromJob('J#00123')).toBe('00123');
    expect(serialFromJob('J#')).toBe('');
    expect(serialFromJob('M-21460')).toBe('');
  });
});
