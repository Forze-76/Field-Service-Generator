import { missingItemsForTemplate } from './nativeTemplateReadiness';
export const templateForDocument = {'Field Service Report':'field-service-report','Service Summary':'service-summary','Motor Test Data':'motor-test','Acceptance Certificate':'acceptance-certification','Inspection Sheet':'inspection-workbook'};
const headers = new Set(['Job number','Serial number','Model','Report date','Technician','Company name','Site address','Location','Customer contact']);
export function setupMissing(report,user) {
 const items=(report.documents||[]).flatMap(doc=>templateForDocument[doc.name] ? missingItemsForTemplate(templateForDocument[doc.name],report,user).filter(item=>headers.has(item.label)) : []);
 if(!/^J#?\d{2,5}$/i.test(report.jobNo || '')) items.push({label:'Job number',target:{selector:'#report-job-number'}});
 if(!Number.isFinite(Date.parse(report.startAt))) items.push({label:'Report date',target:{selector:'#report-start-date'}});
 if(!report.tripType) items.push({label:'Trip type',target:{selector:'#setup-trip-type'}});
 if(!report.endAt || !Number.isFinite(Date.parse(report.endAt)) || Date.parse(report.endAt)<Date.parse(report.startAt)) items.push({label:'Valid end date',target:{selector:'#report-end-date'}});
 return [...new Map(items.map(item=>[item.label,item])).values()];
}
export function documentStatus(doc,report,user) {
 const template=templateForDocument[doc.name];
 if(!template || doc.name==='Inspection Sheet') return 'Form unavailable';
 const missing=missingItemsForTemplate(template,report,user);
 if(doc.done && !missing.length) return 'Completed';
 if(doc.name==='Acceptance Certificate' && missing.length) return 'Pending acceptance';
 return missing.length ? 'Needs attention' : 'Ready to mark complete';
}
export function orderNewDocuments(docs,type) {
 const order=type==='Inspection' ? ['Inspection Sheet','Field Service Report','Service Summary'] : ['Field Service Report','Startup Checklist','Motor Test Data','Service Summary','Acceptance Certificate'];
 return [...docs].sort((a,b)=>(order.indexOf(a.name)<0?99:order.indexOf(a.name))-(order.indexOf(b.name)<0?99:order.indexOf(b.name)));
}
