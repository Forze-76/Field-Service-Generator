import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { exportHeader, exportFsrData, entryText, partsLaborRows, text } from './exportData.js';
import { FSR_ENTRY_TYPE_META } from './fsr.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml = (source) => {
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('The Word template contains invalid XML.');
  return doc;
};
const serialize = (doc) => new XMLSerializer().serializeToString(doc);
const nodes = (node, name) => [...node.getElementsByTagNameNS(W, name)];
const content = (node) => nodes(node, 't').map((n) => n.textContent).join('').trim();
const element = (doc, name, attrs = {}) => {
  const node = doc.createElementNS(W, `w:${name}`);
  Object.entries(attrs).forEach(([key, value]) => node.setAttributeNS(W, `w:${key}`, String(value)));
  return node;
};
const paragraph = (doc, value, { bold = false, keep = false, size = 22 } = {}) => {
  const p = element(doc, 'p');
  const props = element(doc, 'pPr');
  props.append(element(doc, 'spacing', { after: 100, line: 260, lineRule: 'auto' }));
  if (keep) props.append(element(doc, 'keepNext'));
  p.append(props);
  const run = element(doc, 'r');
  const rp = element(doc, 'rPr');
  rp.append(element(doc, 'rFonts', { ascii: 'Arial', hAnsi: 'Arial' }), element(doc, 'sz', { val: size }), element(doc, 'color', { val: '000000' }));
  if (bold) rp.append(element(doc, 'b'));
  run.append(rp);
  String(value ?? '').split('\n').forEach((line, i) => {
    if (i) run.append(element(doc, 'br'));
    const t = element(doc, 't'); t.setAttribute('xml:space', 'preserve'); t.textContent = line; run.append(t);
  });
  p.append(run); return p;
};
const cell = (doc, width, paragraphs) => {
  const tc = element(doc, 'tc'); const pr = element(doc, 'tcPr');
  pr.append(element(doc, 'tcW', { w: width, type: 'dxa' })); tc.append(pr, ...paragraphs); return tc;
};
const table = (doc, widths, rows, bordered = true) => {
  const tbl = element(doc, 'tbl'); const props = element(doc, 'tblPr');
  props.append(element(doc, 'tblW', { w: widths.reduce((a,b) => a+b,0), type: 'dxa' }));
  const borders = element(doc, 'tblBorders');
  for (const name of ['top','left','bottom','right','insideH','insideV']) borders.append(element(doc, name, { val: bordered ? 'single' : 'nil', sz: 4, color: 'D9D9D9' }));
  props.append(borders);
  const margins = element(doc, 'tblCellMar');
  for (const side of ['top','left','bottom','right']) margins.append(element(doc, side, { w: 80, type: 'dxa' }));
  props.append(margins); tbl.append(props);
  const grid = element(doc, 'tblGrid'); widths.forEach(w => grid.append(element(doc, 'gridCol', { w }))); tbl.append(grid);
  rows.forEach((row,i) => {
    const tr = element(doc, 'tr');
    if (bordered && i === 0) { const pr = element(doc,'trPr'); pr.append(element(doc,'tblHeader')); tr.append(pr); }
    row.forEach((value,j) => tr.append(cell(doc,widths[j],Array.isArray(value) ? value : [paragraph(doc,value,{bold:bordered && i===0,size:20})])));
    tbl.append(tr);
  });
  return tbl;
};

// Only known PFlow section boundaries are accepted. Unknown templates fail closed
// rather than accidentally exporting a previous customer's report.
export async function createDocxExport(bytes, report, user, { internal = false } = {}) {
  const zip = await JSZip.loadAsync(bytes);
  const doc = xml(await zip.file('word/document.xml').async('text'));
  const body = doc.getElementsByTagNameNS(W,'body')[0];
  const children = [...body.children];
  const headings = ['Trip Purpose:', 'Report Details', 'Summary of Schematic and/or Program Revisions', 'Summary of Parts and/or Labor'];
  const anchors = headings.map(title => children.find(n => content(n).replace(/\s+/g,' ').trim() === title));
  if (anchors.some(n => !n) || !children.some(n => content(n) === 'Business:')) throw new Error('This Word template is not a supported PFlow report. Use the approved Field Service Report template.');
  const section = children.find(n => n.localName === 'sectPr')?.cloneNode(true);
  if (!section) throw new Error('The Word template is missing its page layout.');
  const h = exportHeader(report,user); const data = exportFsrData(report,internal);
  const widths = nodes(section,'pgSz')[0]; const margins = nodes(section,'pgMar')[0];
  const pageWidth = Number(widths?.getAttributeNS(W,'w') || 12240);
  const usable = pageWidth - Number(margins?.getAttributeNS(W,'left') || 1440) - Number(margins?.getAttributeNS(W,'right') || 1440);
  const company = report.inviteMeta?.installContact || {};
  const maintenance = text(h.maintenanceCompany) || [company.company,company.name,company.phone,company.email].filter(Boolean).join(' | ');
  // All old body content, including floating shapes and embedded sample photos, goes.
  body.replaceChildren();
  const left = [paragraph(doc,h.date),paragraph(doc,'Business:',{bold:true}),paragraph(doc,[h.jobName,h.siteStreetAddress,[h.siteCity,h.siteState,h.siteZip].filter(Boolean).join(', '),h.customerContact].filter(Boolean).join('\n'))];
  const right = [paragraph(doc,internal ? 'Service Report — Internal Only' : 'Service Report',{bold:true,size:28}),paragraph(doc,'Field Service Technician'),paragraph(doc,h.technician,{bold:true}),paragraph(doc,`Serial Number: ${h.serial}\nModel Type: ${h.model}`)];
  body.append(table(doc,[Math.round(usable*.60),usable-Math.round(usable*.60)],[[left,right]],false),paragraph(doc,'Maintenance Company:',{bold:true,keep:true}),paragraph(doc,maintenance));
  const appendHeading = (i) => {
    const heading = anchors[i].cloneNode(true);
    // Retain section rules and typography, but permit sensible page wrapping.
    for (const n of nodes(heading,'pageBreakBefore')) n.remove();
    let pr=nodes(heading,'pPr')[0]; if(!pr){pr=element(doc,'pPr');heading.prepend(pr)}
    pr.append(element(doc,'keepNext')); body.append(heading);
  };
  appendHeading(0); body.append(paragraph(doc,[report.tripType,h.jobNo].filter(Boolean).join(' ')));
  appendHeading(1);
  if(data.details.workSummary) body.append(paragraph(doc,data.details.workSummary));
  const relPath='word/_rels/document.xml.rels';
  const rels=xml(await zip.file(relPath).async('text'));
  const types=xml(await zip.file('[Content_Types].xml').async('text'));
  let photoId=1;
  const imageInspector=await PDFDocument.create();
  const addPhoto=async (photo,caption) => {
    const match=/^data:image\/(png|jpe?g);base64,([\s\S]+)$/i.exec(photo.imageUrl || '');
    if(!match) throw new Error('A report photo is not an embedded PNG or JPEG. Reattach it before exporting.');
    const extension=match[1].toLowerCase()==='png'?'png':'jpeg';
    const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
    const dimensions=extension==='png'?await imageInspector.embedPng(bytes):await imageInspector.embedJpg(bytes);
    const scale=Math.min(usable/1440*914400/dimensions.width,3.4*914400/dimensions.height);
    const cx=Math.round(dimensions.width*scale),cy=Math.round(dimensions.height*scale);
    const id=`rIdExportPhoto${photoId}`;const target=`media/export-photo-${photoId}.${extension}`;
    zip.file(`word/${target}`,bytes);
    const rel=rels.createElementNS(rels.documentElement.namespaceURI,'Relationship');rel.setAttribute('Id',id);rel.setAttribute('Type',`${R}/image`);rel.setAttribute('Target',target);rels.documentElement.append(rel);
    if(![...types.documentElement.children].some(n=>n.getAttribute('Extension')===extension)){
      const type=types.createElementNS(types.documentElement.namespaceURI,'Default');type.setAttribute('Extension',extension);type.setAttribute('ContentType',`image/${extension}`);types.documentElement.append(type);
    }
    const p=paragraph(doc,'',{keep:true});
    const drawing=xml(`<w:r xmlns:w="${W}" xmlns:r="${R}"><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${photoId}" name="Report photo ${photoId}"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${photoId}" name="Photo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`);
    p.append(doc.importNode(drawing.documentElement,true));body.append(p,paragraph(doc,`Photo ${photoId}. ${caption || ''}`,{size:20})); photoId++;
  };
  for(const [index,entry] of data.entries.entries()){
    body.append(paragraph(doc,`${index+1}. ${FSR_ENTRY_TYPE_META[entry.type]?.label || 'Entry'}: ${entryText(entry)}`));
    for(const photo of entry.photos || []) await addPhoto(photo,photo.caption || `${FSR_ENTRY_TYPE_META[entry.type]?.label || 'Entry'} ${index+1}`);
  }
  for(const photo of report.photos || []) await addPhoto(photo,photo.caption);
  appendHeading(2);
  // No revision controls exist in the app yet. Blank answers must not inherit
  // checked boxes from a previously completed reference document.
  body.append(paragraph(doc,'Redline ELEC Schematic:  YES ☐  NO ☐\nPLC Program:  NA ☐  YES ☐  NO ☐\nHMI File:  NA ☐  YES ☐  NO ☐\nVFD File:  NA ☐  YES ☐  NO ☐\nOther:  NA ☐  YES ☐  NO ☐'));
  appendHeading(3);
  const parts=partsLaborRows(report,internal);
  body.append(table(doc,[Math.round(usable*.08),Math.round(usable*.17),Math.round(usable*.47),usable-Math.round(usable*.08)-Math.round(usable*.17)-Math.round(usable*.47)], [['No.','P/N (if applicable)','Part Description / Labor','Recommended Action'],...parts.map((p,i)=>[String(i+1),p.partNo,p.description,p.action])]));
  body.append(paragraph(doc,''),section);
  zip.file('word/document.xml',serialize(doc));
  // Remove relationships to discarded sample pictures, links, comments and objects.
  const used=new Set([...doc.getElementsByTagName('*')].flatMap(n=>[...n.attributes].filter(a=>a.namespaceURI===R).map(a=>a.value)));
  for(const rel of [...rels.documentElement.children]){
    if(/\/(image|hyperlink|oleObject|package|comments|customXml)$/.test(rel.getAttribute('Type')) && !used.has(rel.getAttribute('Id'))) rel.remove();
  }
  zip.file(relPath,serialize(rels));
  // Reuse the original corporate logo, but put it and its contact block in
  // flow rather than retaining fixed-height text boxes that clip in Word/PDF.
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
  let brandedHeaderId;
  for (const relation of [...rels.documentElement.children].filter(n => (n.getAttribute('Type') || '').endsWith('/header'))) {
    const path = `word/${relation.getAttribute('Target')}`;
    const part = xml(await zip.file(path).async('text'));
    const graphic = [...part.getElementsByTagNameNS(A, 'graphic')].find(n => n.getElementsByTagNameNS(A, 'blip').length);
    if (!graphic) continue;
    brandedHeaderId ||= relation.getAttribute('Id');
    const cx = Math.round(usable * .62 / 1440 * 914400), cy = Math.round(cx * 450 / 967 * .5);
    const logo = graphic.cloneNode(true);
    for (const ext of [...logo.getElementsByTagNameNS(A,'ext')]) {ext.setAttribute('cx',cx);ext.setAttribute('cy',cy);}
    const fill = logo.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/picture','blipFill')[0];
    if (fill) {
      for (const crop of [...fill.getElementsByTagNameNS(A,'srcRect')]) crop.remove();
      const crop=part.createElementNS(A,'a:srcRect');crop.setAttribute('t','25000');crop.setAttribute('b','25000');fill.insertBefore(crop,fill.lastChild);
    }
    const inline=part.createElementNS(WP,'wp:inline');
    const extent=part.createElementNS(WP,'wp:extent');extent.setAttribute('cx',cx);extent.setAttribute('cy',cy);
    const props=part.createElementNS(WP,'wp:docPr');props.setAttribute('id','10000');props.setAttribute('name','PFlow letterhead');
    inline.append(extent,props,logo);
    const drawing=element(part,'drawing');drawing.append(inline);const run=element(part,'r');run.append(drawing);const logoP=paragraph(part,'');logoP.append(run);
    const contact=paragraph(part,'www.pflow.com\nP (414) 352 9000\nF (414) 352 9002\n6720 N. Teutonia Ave.\nMilwaukee, WI 53209',{size:16});
    part.documentElement.replaceChildren(table(part,[Math.round(usable*.72),usable-Math.round(usable*.72)],[[[logoP],[contact]]],false),paragraph(part,'',{size:2}));
    zip.file(path,serialize(part));
  }
  if (brandedHeaderId) {
    for(const ref of nodes(section,'headerReference')) ref.setAttributeNS(R,'r:id',brandedHeaderId);
    const margin=nodes(section,'pgMar')[0];
    if(margin){margin.setAttributeNS(W,'w:top','2100');margin.setAttributeNS(W,'w:header','300');}
    // section was appended by reference, so serialize again after header updates.
    zip.file('word/document.xml',serialize(doc));
  }
  for(const path of Object.keys(zip.files).filter(p=>/^word\/footer\d+\.xml$/.test(p))){
    const part=xml(await zip.file(path).async('text'));
    for(const t of nodes(part,'t')) t.textContent=t.textContent.replace(/Name#1 & Name#2/g,h.technician).replace(/XXXXX & XXXXX/g,h.serial).replace(/MM\/DD\/YY/g,h.date).replace(/J#XXXXX/g,h.jobNo);
    zip.file(path,serialize(part));
  }
  // Unreferenced media must be removed from the ZIP, not merely hidden on pages.
  const referenced=new Set();
  for(const path of Object.keys(zip.files).filter(p=>p.endsWith('.rels'))){
    const part=xml(await zip.file(path).async('text'));
    const base=path.slice(0,path.lastIndexOf('/_rels/')+1);
    for(const rel of [...part.documentElement.children]){
      const target=rel.getAttribute('Target')||'';
      if(target.includes('media/')) referenced.add(target.startsWith('/')?target.slice(1):new URL(target,`https://package/${base}`).pathname.slice(1));
    }
  }
  for(const path of Object.keys(zip.files)) if(/^word\/media\//.test(path) && !zip.files[path].dir && !referenced.has(path)) zip.remove(path);
  // Historical comments/preview thumbnails can also expose source report data.
  for(const path of Object.keys(zip.files)) if(/^word\/comments.*\.xml$/.test(path) || /^docProps\/thumbnail\./.test(path)) zip.remove(path);
  for(const node of [...types.documentElement.children]) if(/\/word\/comments|\/docProps\/thumbnail/.test(node.getAttribute('PartName')||'')) node.remove();
  if(zip.file('_rels/.rels')){
    const rootRels=xml(await zip.file('_rels/.rels').async('text'));
    for(const rel of [...rootRels.documentElement.children]) if((rel.getAttribute('Type')||'').endsWith('/metadata/thumbnail')) rel.remove();
    zip.file('_rels/.rels',serialize(rootRels));
  }
  if (zip.file('docProps/core.xml')) {
    const core = xml(await zip.file('docProps/core.xml').async('text'));
    for (const node of [...core.documentElement.children]) {
      if (['creator', 'lastModifiedBy'].includes(node.localName)) node.textContent = h.technician;
      else if (['title', 'subject', 'description', 'keywords', 'lastPrinted'].includes(node.localName)) node.remove();
    }
    zip.file('docProps/core.xml', serialize(core));
  }
  zip.file('[Content_Types].xml',serialize(types));
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
