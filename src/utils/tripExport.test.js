import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
vi.mock('./nativeTemplates', () => ({ buildNativeDocument: vi.fn(async (record, report) => ({arrayBuffer: async () => new TextEncoder().encode(report.jobNo).buffer})), outputFilename: (r, report, options) => `${options.draft ? 'DRAFT-' : ''}${r.templateId}.pdf` }));
import { tripExportRows, buildTripArchive } from './tripExport';
import { makeDocs } from './fsr';
describe('trip export', () => {
  it('selects templates per lift and records omissions with internal files separated', async () => {
    const reports = ['Start Up','Inspection'].map((tripType,i) => ({id:`unit${i}`,jobNo:`J#2146${i}`,tripType,documents:makeDocs(tripType)}));
    const stored = [{id:'one',templateId:'service-summary',tripType:'Start Up'}, {id:'two',templateId:'service-summary',tripType:'Inspection'}, {id:'internal',templateId:'internal-field-service-report'}];
    const rows = tripExportRows(reports,stored,{name:'Tech'});
    expect(rows.find(r=>r.report.id==='unit1' && r.definition.id==='service-summary').record.id).toBe('two');
    const blob = await buildTripArchive(rows,{name:'Tech'});
    const buffer = await new Promise(resolve => {const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsArrayBuffer(blob);});
    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files)).toContain('21460-unit0/DRAFT-service-summary.pdf');
    expect(Object.keys(zip.files)).toContain('21461-unit1/INTERNAL/DRAFT-internal-field-service-report.pdf');
    const manifest = await zip.file('Export-summary.txt').async('string');
    expect(manifest).toContain('OMITTED: template not installed');
    expect(manifest).toContain('Inspection workbooks contain headers only');
  });
});
