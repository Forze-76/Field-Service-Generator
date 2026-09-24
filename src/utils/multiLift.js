import { makeDocs, uid, isAcceptanceCertDocName } from './fsr';
import { orderNewDocuments } from './fieldWorkflow';
import { serialFromJob } from './jobNumber';
import { fillTimeLogDates } from './timeLogDates';
import { prefillAcceptanceContact } from './acceptanceContact';

export const tripKey = report => report.tripId || report.id;
export const sharedKeys = ['sharedSite', 'inviteMeta', 'startAt', 'endAt', 'technicianName'];
export function sharedDetails(report) {
  return Object.fromEntries(sharedKeys.map(key => [key, report[key]]));
}
export function updateTripLift(reports, id, patch) {
  const source = reports.find(r => r.id === id);
  if (!source) return reports;
  const sharedPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => sharedKeys.includes(key) && !source.liftOverrides?.[key]));
  const baseline = { ...(source.tripShared || sharedDetails(source)), ...sharedPatch };
  return reports.map(report => {
    if (tripKey(report) !== tripKey(source)) return report;
    const inherited = Object.fromEntries(Object.entries(sharedPatch).filter(([key]) => !report.liftOverrides?.[key]));
    const next = { ...report, ...inherited, ...(report.id === id ? patch : {}), tripShared: baseline };
    next.sharedSite = { ...next.sharedSite, serialNumberText: serialFromJob(next.jobNo) };
    return next;
  });
}
export function toggleLiftOverride(reports, id, keys, enabled) {
  const source = reports.find(r => r.id === id);
  const baseline = source.tripShared || sharedDetails(source);
  return reports.map(report => report.id !== id ? report : {
    ...report,
    ...(!enabled ? Object.fromEntries(keys.map(key => [key, key === 'sharedSite' ? { ...baseline[key], serialNumberText: serialFromJob(report.jobNo) } : baseline[key]])) : {}),
    liftOverrides: { ...report.liftOverrides, ...Object.fromEntries(keys.map(key => [key, enabled])) },
  });
}
export function addTripLifts(reports, sourceId, lifts) {
  const source = reports.find(r => r.id === sourceId);
  const shared = source.tripShared || sharedDetails(source);
  const tripId = tripKey(source);
  const serials = lifts.map(lift => serialFromJob(lift.jobNo));
  if (!serials.length || serials.some(serial => !serial) || new Set(serials).size !== serials.length || reports.some(r => tripKey(r) === tripId && serials.includes(serialFromJob(r.jobNo)))) throw new Error('Each lift needs a unique valid job number within this trip.');
  const added = lifts.map(lift => {
    const documents = orderNewDocuments(makeDocs(lift.tripType), lift.tripType).map(doc => {
      if (doc.name === 'Service Summary') return { ...doc, data: { ...doc.data, timeLogs: fillTimeLogDates(doc.data.timeLogs, shared.startAt), pmContact: [shared.inviteMeta?.projectContact?.name, shared.inviteMeta?.projectContact?.email].filter(Boolean).join(' | '), customerContact: [shared.inviteMeta?.installContact?.name, shared.inviteMeta?.installContact?.phone].filter(Boolean).join(' | ') || shared.sharedSite?.customerContact || '' } };
      if (isAcceptanceCertDocName(doc.name)) return { ...doc, data: { ...prefillAcceptanceContact(doc.data, shared), startupDate: String(shared.startAt || '').slice(0, 10) } };
      return doc;
    });
    return { ...shared, ...lift, jobNo: `J#${serialFromJob(lift.jobNo)}`, id: uid(), tripId, tripShared: shared, createdAt: new Date().toISOString(), documents, photos: [], serialTagImageUrl: '', serialTagMissing: false, sharedSite: { ...shared.sharedSite, serialNumberText: serialFromJob(lift.jobNo) } };
  });
  return [...reports.map(r => tripKey(r) === tripId ? { ...r, tripId, tripShared: shared } : r), ...added];
}

const summary = report => report.documents.find(doc => doc.name === 'Service Summary');
const hoursOnly = rows => (rows || []).map(({ date, timeIn, timeOut, travelTime }) => ({ date, timeIn, timeOut, travelTime }));
function withHours(report, hours) {
  return { ...report, documents: report.documents.map(doc => {
    if (doc.name !== 'Service Summary') return doc;
    const timeLogs = hours.map((row, index) => {
      const existing = doc.data.timeLogs?.[index];
      const unchanged = existing && Object.entries(row).every(([key, value]) => existing[key] === value);
      return { ...row, id: existing?.id || uid(), signature: unchanged ? existing.signature || '' : '', signatureInk: unchanged ? existing.signatureInk || '' : '' };
    });
    return { ...doc, done: false, data: { ...doc.data, timeLogs } };
  }) };
}
export function setTripHours(reports, id, enabled) {
  const source = reports.find(r => r.id === id);
  const hours = source.tripHours || hoursOnly(summary(source)?.data.timeLogs);
  return reports.map(r => {
    if (tripKey(r) !== tripKey(source)) return r;
    const next = { ...r, tripHours: hours, ...(r.id === id ? { useTripHours: enabled } : {}) };
    return r.id === id && enabled ? withHours(next, hours) : next;
  });
}
export function updateLiftDocuments(reports, id, mutator) {
  const source = reports.find(r => r.id === id);
  const documents = typeof mutator === 'function' ? mutator(source.documents) : mutator;
  const next = { ...source, documents };
  const hours = hoursOnly(summary(next)?.data.timeLogs);
  const changed = source.useTripHours && JSON.stringify(hoursOnly(summary(source)?.data.timeLogs)) !== JSON.stringify(hours);
  return reports.map(r => {
    if (r.id === id) {
      if (!changed) return next;
      const cleared = summary(withHours(source, hours));
      return { ...next, tripHours: hours, documents: next.documents.map(doc => doc.name === 'Service Summary' ? { ...doc, done: false, data: { ...doc.data, timeLogs: cleared.data.timeLogs } } : doc) };
    }
    if (!changed || tripKey(r) !== tripKey(source)) return r;
    const updated = { ...r, tripHours: hours };
    return r.useTripHours ? withHours(updated, hours) : updated;
  });
}
