import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { buildNativeDocument, fillDocxTemplate, fillPdfTemplate, outputFilename } from './nativeTemplates.js';
import { missingFieldsForTemplate } from './nativeTemplateReadiness.js';

const bytes = blob => new Promise((resolve,reject) => { const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsArrayBuffer(blob); });
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const p=t=>`<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
async function template(){
 const z=new JSZip();
 z.file('word/document.xml',`<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${['OLD TECHNICIAN','Business:','OLD CUSTOMER','Trip Purpose:','OLD PURPOSE','Report Details','OLD NOTES','Summary of Schematic and/or Program Revisions','NO ☒','Summary of Parts and/or Labor','OLD PARTS'].map(p).join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:left="1440" w:right="1440"/></w:sectPr></w:body></w:document>`);
 z.file('word/_rels/document.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="oldPhoto" Type="${R}/image" Target="media/old.png"/></Relationships>`);
 z.file('word/media/old.png','OLD PRIVATE PHOTO');
 z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
 return z.generateAsync({type:'blob'});
}
const report=()=>({jobNo:'J#12345',serialNumber:'12345',model:'M',startAt:'2026-09-22T08:00',tripType:'Start Up',sharedSite:{jobName:'New Plant',siteStreetAddress:'New Address'},photos:[{imageUrl:png,caption:'Vault last'}],documents:[{name:'Field Service Report',data:{entries:[{id:'1',type:'internal',note:'PRIVATE'},{id:'2',type:'issue',note:'Gate issue',photos:[{imageUrl:png}]},{id:'3',type:'docRequest',docKind:'spares',docNotes:'Send parts list'},{id:'4',type:'followUp',followUp:{title:'Call site',details:'Check delivery'}},{id:'5',type:'orderParts',parts:[{partNo:'P123',desc:'Bracket',qty:'2'}]},{id:'6',type:'correction',note:'Adjusted switch'}],details:{partsInstalled:[{text:'Replaced switch'}]}}}]});
const bodyText=source=>new DOMParser().parseFromString(source,'application/xml').documentElement.textContent;
describe('complete native exports',()=>{
 it('removes previous customer content and embedded media, separates internal notes, and preserves all entry types and photo order',async()=>{
  const output=await fillDocxTemplate(await template(),report(),{name:'New Tech'});
  const z=await JSZip.loadAsync(await bytes(output)); const source=await z.file('word/document.xml').async('text');const t=bodyText(source);
  expect(t).toContain('New Plant');expect(t).toContain('New Tech');expect(t).toContain('Serial Number: 12345');expect(t).toContain('Model Type: M');
  expect(t).not.toContain('OLD');expect(t).not.toContain('PRIVATE');expect(t).not.toContain('☒');expect(z.file('word/media/old.png')).toBeNull();
  expect(t).toContain('Send parts list');expect(t).toContain('Call site: Check delivery');expect(t).toContain('P123');expect(t).toContain('Qty 2');expect(t).toContain('Replaced switch');expect(t).toContain('Labor performed');
  expect(source.indexOf('Photo 1. Issue')).toBeLessThan(source.indexOf('Photo 2. Vault last'));
  expect(Object.keys(z.files).filter(n=>n.includes('export-photo-'))).toHaveLength(2);
  expect(source).toContain('tblHeader');
 });
 it('routes a trip-scoped internal template to the internal exporter',async()=>{
  const output=await buildNativeDocument({id:'start up:internal-field-service-report',format:'docx',blob:await template()},report(),{name:'New Tech'});
  const z=await JSZip.loadAsync(await bytes(output));expect(bodyText(await z.file('word/document.xml').async('text'))).toContain('PRIVATE');
 });
 it('does not treat internal-only notes as customer report readiness',()=>{
  const r=report();r.documents[0].data.entries=[{id:'1',type:'internal',note:'PRIVATE'}];
  expect(missingFieldsForTemplate('field-service-report',r,{name:'Tech'})).toContain('Report details');
  expect(missingFieldsForTemplate('internal-field-service-report',r,{name:'Tech'})).not.toContain('Report details');
 });
 it('rejects unsupported Word templates instead of leaking old content',async()=>{
  const z=new JSZip();z.file('word/document.xml',`<w:document xmlns:w="${W}"><w:body>${p('PRIVATE OLD REPORT')}</w:body></w:document>`);
  await expect(fillDocxTemplate(await z.generateAsync({type:'blob'}),report(),{})).rejects.toThrow('supported PFlow');
 });
 it('routes synced PDF records and clears stale template values',async()=>{
  const pdf=await PDFDocument.create();const page=pdf.addPage();
  for(const name of ['Job Name','PFlow Serial Number','Tech 1','Tech 2']){const f=pdf.getForm().createTextField(name);f.addToPage(page,{x:10,y:50,width:250,height:20});f.setText('OLD VALUE');}
  const result=await buildNativeDocument({id:'start up:service-summary',format:'pdf',blob:new Blob([await pdf.save()])},report(),{name:'Tech'});
  const output=await PDFDocument.load(await bytes(result));
  expect(output.getForm().getTextField('Job Name').getText()).toBe('New Plant');expect(output.getForm().getTextField('PFlow Serial Number').getText()).toBe('12345');expect(output.getForm().getTextField('Tech 2').getText()).toBeUndefined();
 });
 it('keeps overflow and more than seven time rows on continuation pages',async()=>{
  const pdf=await PDFDocument.create();const page=pdf.addPage();const f=pdf.getForm().createTextField('Service performed');f.addToPage(page,{x:10,y:50,width:100,height:20});
  const r=report();r.documents.push({name:'Service Summary',data:{servicePerformed:'Inspection completed. '.repeat(400),timeLogs:Array.from({length:9},()=>({date:'2026-09-22',timeIn:'08:00',timeOut:'17:00',signature:'FM'}))}});
  const result=await fillPdfTemplate(new Blob([await pdf.save()]),'service-summary',r,{name:'Tech'});const out=await PDFDocument.load(await bytes(result));
  expect(out.getPageCount()).toBeGreaterThan(2);expect(out.getForm().getTextField('Service performed').getText()).toBe('See continuation');
 });
 it('does not invent a technician or transform a malformed serial into a number',async()=>{
  const r=report();r.serialNumber='J#12345';expect(missingFieldsForTemplate('field-service-report',r,{})).toEqual(expect.arrayContaining(['Technician','Serial number']));
  const output=await fillDocxTemplate(await template(),r,{});const z=await JSZip.loadAsync(await bytes(output));const t=bodyText(await z.file('word/document.xml').async('text'));expect(t).not.toContain('F. Madera');expect(t).not.toContain('Serial Number: J#');
 });
 it('uses a report technician override and clearly labels draft filenames',async()=>{
  const r=report();r.technicianName='Override Tech';
  const output=await fillDocxTemplate(await template(),r,{name:'Account Tech'});const z=await JSZip.loadAsync(await bytes(output));const t=bodyText(await z.file('word/document.xml').async('text'));
  expect(t).toContain('Override Tech');expect(t).not.toContain('Account Tech');
  expect(outputFilename({label:'Field Service Report',format:'docx'},r,{draft:true})).toMatch(/^DRAFT /);
 });
 it('fits the actual small percentage field and uses Other Model for unsupported checkboxes',async()=>{
  const pdf=await PDFDocument.create();const page=pdf.addPage();const form=pdf.getForm();
  form.createTextField('Percentage').addToPage(page,{x:20,y:50,width:20.52,height:10.8,borderWidth:0});
  form.createTextField('Other Model').addToPage(page,{x:20,y:100,width:100,height:20});
  const r=report();r.model='MQ';r.documents.push({name:'Acceptance Certificate',data:{loadTest:{yes:true,percent:'100'}}});
  const result=await fillPdfTemplate(new Blob([await pdf.save()]),'acceptance-certification',r,{name:'Tech'});const out=await PDFDocument.load(await bytes(result));
  expect(out.getForm().getTextField('Percentage').getText()).toBe('100');
  expect(out.getForm().getTextField('Other Model').getText()).toBe('MQ');
 });
 it('rejects an unknown PDF identifier instead of returning an unfilled form',async()=>{
  await expect(fillPdfTemplate(new Blob(), 'wrong-id', report(), {})).rejects.toThrow('Unsupported PDF template');
 });

});
