import { ensureFsrDocData, docRequestLabel } from './fsr.js';

export const text = (value) => String(value ?? '').trim();
export const findExportDoc = (report, name) => (report?.documents || []).find((doc) => text(doc.name).toLowerCase() === name.toLowerCase());
export const dateDisplay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text(value));
  return match ? `${match[2]}/${match[3]}/${match[1]}` : text(value);
};
export const exportHeader = (report, user) => {
  const site = report?.sharedSite || {};
  const rawSerial = text(site.serialNumberText || report?.serialNumber);
  // Never turn an unrecognized identifier into a different, apparently valid serial.
  const serial = rawSerial && /^\d+(?:[\s,;/&-]+\d+)*$/.test(rawSerial) ? rawSerial : '';
  return { ...site, serial, jobNo: text(report?.jobNo), model: text(report?.model), date: dateDisplay(report?.startAt), technician: text(user?.name) };
};
export const exportFsrData = (report, internal = false) => {
  const raw = findExportDoc(report, 'Field Service Report')?.data;
  const data = ensureFsrDocData(raw ? { ...raw, entries: raw.entries?.map(entry => ({ ...entry, type: entry.type || 'issue' })) } : raw);
  return { ...data, entries: data.entries.filter((entry) => internal || entry.type !== 'internal') };
};
export const entryText = (entry) => {
  if (entry.type === 'docRequest') return [docRequestLabel(entry.docKind), entry.docNotes].filter(Boolean).join(': ');
  if (entry.type === 'followUp') return [entry.followUp?.title, entry.followUp?.details].filter(Boolean).join(': ');
  if (entry.type === 'orderParts') return [entry.note, ...(entry.parts || []).map((p) => [p.partNo, p.desc, p.qty ? `Qty ${p.qty}` : ''].filter(Boolean).join(' - '))].filter(Boolean).join('\n');
  return text(entry.note);
};
export const partsLaborRows = (report, internal = false) => {
  const data = exportFsrData(report, internal);
  return [
    ...data.details.partsInstalled.map((part) => ({ partNo: '', description: text(part.text), action: 'Installed' })),
    ...data.details.partsNeeded.map((part) => ({ partNo: part.partNo, description: part.desc || part.text, action: ['Required', part.qty ? `Qty ${part.qty}` : ''].filter(Boolean).join(' - ') })),
    ...data.entries.filter((entry) => entry.type === 'correction' && text(entry.note)).map((entry) => ({ partNo: '', description: text(entry.note), action: 'Labor performed' })),
  ].filter((row) => text(row.description) || text(row.partNo));
};
export const templateIdentifier = (record) => record.templateId || text(record.id).split(':').pop();
