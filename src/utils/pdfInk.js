import { PDFDocument } from 'pdf-lib';

export function inkTargets(form, templateId) {
  const rect = name => form.getFieldMaybe(name)?.acroField.getWidgets()[0]?.getRectangle();
  if (templateId === 'service-summary') {
    const targets = [
      { key: 'supervisorInk', label: 'Supervisor signature', rect: rect('Signature1') },
      { key: 'managerInk', label: 'Manager signature', rect: rect('Signature2') },
    ];
    for (let index = 0; index < 7; index++) {
      const suffix = index ? `_${index + 1}` : '';
      const date = rect(`Date${suffix}`);
      const travel = rect(`Travel time${suffix}`);
      if (date && travel) targets.push({ key: `timeLog:${index}`, label: `Day ${index + 1} signature`, rect: {
        x: travel.x + travel.width + 3, y: date.y, width: Math.max(1, 583 - travel.x - travel.width - 3), height: date.height,
      } });
    }
    return targets;
  }
  if (templateId === 'acceptance-certification') {
    const name = rect('Customer Name and Phone');
    const date = rect('Acceptance Date');
    return name && date ? [{ key: 'acceptedByInk', label: 'Customer signature', rect: {
      x: name.x, y: date.y, width: name.width, height: date.height,
    } }] : [];
  }
  return [];
}

export function inkForTarget(data, key) {
  return key.startsWith('timeLog:') ? data?.timeLogs?.[Number(key.split(':')[1])]?.signatureInk : data?.[key];
}

export function patchInk(data, key, ink) {
  if (!key.startsWith('timeLog:')) return { ...data, [key]: ink };
  const index = Number(key.split(':')[1]);
  const timeLogs = [...(data.timeLogs || [])];
  if (!timeLogs[index]) throw new Error('Add this day to the time log before signing.');
  timeLogs[index] = { ...timeLogs[index], signatureInk: ink };
  return { ...data, timeLogs };
}

export async function drawDocumentInk(pdf, templateId, data) {
  const targets = inkTargets(pdf.getForm(), templateId);
  for (const target of targets) {
    const value = inkForTarget(data, target.key);
    if (!value) continue;
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value) || value.length > 750000) throw new Error('The saved signature image is invalid. Please sign again.');
    const image = await pdf.embedPng(value);
    const { x, y, width, height } = target.rect;
    const bounds = image.scaleToFit(width - 3, height - 2);
    pdf.getPages()[0].drawImage(image, { x: x + (width - bounds.width) / 2, y: y + (height - bounds.height) / 2, ...bounds });
  }
}

export async function readInkTargets(blob, templateId) {
  const pdf = await PDFDocument.load(await blob.arrayBuffer());
  return inkTargets(pdf.getForm(), templateId);
}
