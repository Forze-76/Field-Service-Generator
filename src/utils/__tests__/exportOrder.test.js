import { describe, it, expect } from 'vitest';
import { buildReportHtml, MOTOR_TEST_DOC_NAME, ACCEPTANCE_CERT_DOC_NAME } from '../../utils/fsr';

describe('export order respects documents array order', () => {
  it('renders document names in the order of the documents array', () => {
    const report = {
      jobNo: 'J#123', tripType: 'Service', model: 'X', startAt: new Date().toISOString(), endAt: new Date().toISOString(),
      serialTagImageUrl: '', serialTagMissing: false,
      documents: [
        { id: '1', name: 'Startup Checklist', done: false, data: {} },
        { id: '2', name: 'Service Summary', done: true, data: {} },
        { id: '3', name: ACCEPTANCE_CERT_DOC_NAME, done: false, data: {} },
        { id: '4', name: MOTOR_TEST_DOC_NAME, done: false, data: {} },
      ],
      photos: [], sharedSite: {}
    };
    const html = buildReportHtml(report, { name: 'T', email: 't@example.com' });
    const idxStartup = html.indexOf('Startup Checklist');
    const idxSummary = html.indexOf('Service Summary');
    const idxAcceptance = html.indexOf(ACCEPTANCE_CERT_DOC_NAME);
    const idxMotor = html.indexOf(MOTOR_TEST_DOC_NAME);
    expect(idxStartup).toBeGreaterThan(-1);
    expect(idxSummary).toBeGreaterThan(idxStartup);
    expect(idxAcceptance).toBeGreaterThan(idxSummary);
    expect(idxMotor).toBeGreaterThan(idxAcceptance);
  });
});

