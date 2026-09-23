import { describe,it,expect } from 'vitest';
import { setupMissing,documentStatus,orderNewDocuments } from './fieldWorkflow';
const user={name:'Test Technician'};
const base={jobNo:'J#12345',model:'M',tripType:'Start Up',startAt:'2026-09-23T08:00',endAt:'2026-09-24T17:00',sharedSite:{serialNumberText:'12345',jobName:'Test Site',siteStreetAddress:'1 Test St'},documents:[{name:'Field Service Report',data:{}},{name:'Motor Test Data',data:{}},{name:'Service Summary',data:{}}]};
describe('field workflow requirements',()=>{
 it('requires headers without gating on work results, motor readings or time logs',()=>expect(setupMissing(base,user)).toEqual([]));
 it('requires customer contact only when acceptance is selected, never signatures',()=>expect(setupMissing({...base,documents:[...base.documents,{name:'Acceptance Certificate',data:{}}]},user).map(i=>i.label)).toEqual(['Customer contact']));
 it('rejects invalid serials, placeholder jobs and reversed dates',()=>expect(setupMissing({...base,jobNo:'J#',endAt:'2026-09-22',sharedSite:{...base.sharedSite,serialNumberText:'unknown'}},user).map(i=>i.label)).toEqual(expect.arrayContaining(['Serial number','Job number','Valid end date'])));
 it('does not call header-only documents complete',()=>expect(documentStatus(base.documents[0],base,user)).toBe('Needs attention'));
 it('keeps unavailable forms and acceptance explicit',()=>{expect(documentStatus({name:'Inspection Sheet',done:true},base,user)).toBe('Form unavailable');expect(documentStatus({name:'Acceptance Certificate'},base,user)).toBe('Pending acceptance');});
 it('orders inspection first without mutating source',()=>{const docs=[{name:'Field Service Report'},{name:'Inspection Sheet'},{name:'Service Summary'}];expect(orderNewDocuments(docs,'Inspection')[0].name).toBe('Inspection Sheet');expect(docs[0].name).toBe('Field Service Report');});
});
