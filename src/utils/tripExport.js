import JSZip from 'jszip';
import { templatesForTrip, normalizeTripType } from './templateStore';
import { templateForDocument } from './fieldWorkflow';
import { templateReadiness } from './nativeTemplateReadiness';
import { buildNativeDocument, outputFilename } from './nativeTemplates';
import { serialFromJob } from './jobNumber';

export function tripExportRows(reports, stored, user) {
  return reports.flatMap(report => templatesForTrip(report.tripType).filter(def => report.documents.some(doc => templateForDocument[doc.name] === (def.id === 'internal-field-service-report' ? 'field-service-report' : def.id))).map(definition => {
    const matching = stored.filter(item => (item.templateId || item.id) === definition.id);
    const record = matching.find(item => normalizeTripType(item.tripType) === normalizeTripType(report.tripType)) || matching.find(item => !item.tripType);
    return { report, definition, record, readiness: templateReadiness(definition, record, report, user) };
  }));
}
export async function buildTripArchive(rows, user) {
  const zip = new JSZip();
  const manifest = ['Trip export — unfinished documents are labeled DRAFT.', 'INTERNAL folders contain internal-only content. Review before sharing.', 'Inspection workbooks contain headers only; inspection answers are not supported yet.', ''];
  for (const row of rows) {
    const { report, definition, record, readiness } = row;
    if (!record) { manifest.push(`${report.jobNo}: ${definition.label} — OMITTED: template not installed`); continue; }
    const blob = await buildNativeDocument(record, report, user);
    const folder = `${serialFromJob(report.jobNo) || 'unit'}-${report.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const filename = outputFilename(record, report, { draft: readiness.status !== 'completed' });
    zip.file(`${folder}/${definition.id.startsWith('internal-') ? 'INTERNAL/' : ''}${filename}`, await blob.arrayBuffer());
    manifest.push(`${report.jobNo}: ${definition.label} — ${readiness.status === 'completed' ? 'completed' : 'DRAFT'}`);
  }
  const reports = [...new Map(rows.map(row => [row.report.id, row.report])).values()];
  for (const report of reports) {
    const folder = `${serialFromJob(report.jobNo) || 'unit'}-${report.id.replace(/[^a-zA-Z0-9_-]/g, '')}/Field-photos`;
    const captions = [];
    for (const [index, photo] of (report.photos || []).entries()) {
      const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/s.exec(photo.imageUrl || '');
      if (!match) { manifest.push(`${report.jobNo}: field photo ${index + 1} — OMITTED: unsupported image`); continue; }
      const filename = `Photo-${index + 1}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
      zip.file(`${folder}/${filename}`, match[2], { base64: true });
      captions.push(`${filename}: ${photo.caption || ''}`);
    }
    if (captions.length) zip.file(`${folder}/Captions.txt`, captions.join('\n'));
  }
  zip.file('Export-summary.txt', manifest.join('\n'));
  return zip.generateAsync({ type: 'blob' });
}
