import { jsPDF } from 'jspdf';
import { LiveFinalist } from '../types';

const ORG_NAME = 'Mezzo House Ltd.';
const PROGRAM_NAME = 'MEZZOPEDIA NATIONAL MATHEMATICS CONTEST 2026';
const ADDRESS = 'P. O. Box GP 21686, Accra. Old Ashongman.';
const EMAIL = 'info@mezzomaths.org';
const WEBSITES = 'www.mezzomaths.org / mezzopedia.mezzomaths.org';
const SIGNATORY = 'Mr. Kingsley Evans Hayford';
const SIGNATORY_TITLE = 'Administrative Manager / Mezzopedia Contest Manager';
const VENUE_TEXT = 'Official Live Finals video recording venue to be communicated by Mezzo Maths through the registered contacts.';
const REPORTING_TIME = 'Reporting time to be communicated by Mezzo Maths through the registered contacts.';

export async function downloadSchoolInvitationLetter(finalist: LiveFinalist, logoUrl: string) {
  await downloadInvitationLetter(finalist, logoUrl, 'school');
}

export async function downloadGuardianInvitationLetter(finalist: LiveFinalist, logoUrl: string) {
  await downloadInvitationLetter(finalist, logoUrl, 'guardian');
}

async function downloadInvitationLetter(finalist: LiveFinalist, logoUrl: string, type: 'school' | 'guardian') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const marginX = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  await drawLetterhead(doc, logoUrl);
  y = 48;

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(formatToday(), marginX, y);
  y += 12;

  if (type === 'school') {
    y = drawLines(doc, [
      'The Headteacher / Principal',
      finalist.school_name || 'The School Head',
      finalist.school_location || finalist.region || ''
    ], marginX, y, 5);
    y += 6;
  } else {
    y = drawLines(doc, [
      'The Parent / Guardian',
      `Parent / Guardian of ${finalist.full_name}`
    ], marginX, y, 5);
    y += 6;
  }

  const subject = type === 'school'
    ? 'INVITATION TO PARTICIPATE IN THE MEZZOPEDIA NATIONAL MATHEMATICS CONTEST LIVE FINALS VIDEO RECORDING'
    : 'INVITATION FOR YOUR CHILD / WARD TO PARTICIPATE IN THE MEZZOPEDIA NATIONAL MATHEMATICS CONTEST LIVE FINALS VIDEO RECORDING';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 28, 76);
  y = drawWrapped(doc, subject, marginX, y, pageWidth - marginX * 2, 5);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10.5);
  y = drawWrapped(doc, type === 'school' ? 'Dear Sir/Madam,' : 'Dear Parent/Guardian,', marginX, y, pageWidth - marginX * 2, 5);
  y += 4;

  const intro = type === 'school'
    ? `We are pleased to officially inform you that ${finalist.full_name}, a finalist from ${finalist.school_name || 'your school'}, has qualified to participate in the Live Finals Video Recording of the Mezzopedia National Mathematics Contest 2026.`
    : `We are pleased to officially inform you that your child/ward, ${finalist.full_name}, has qualified to participate in the Live Finals Video Recording of the Mezzopedia National Mathematics Contest 2026.`;
  y = drawParagraph(doc, intro, marginX, y);

  const pride = type === 'school'
    ? 'This achievement reflects positively on the learner, the school, and the commitment of your teachers toward mathematics excellence. We therefore respectfully request your support and permission for the contestant to participate in the scheduled Live Finals video recording.'
    : 'This is a commendable achievement and we congratulate the contestant and the family. We respectfully request your support to ensure that the contestant attends the scheduled Live Finals video recording with an appropriate accompanying adult where necessary.';
  y = drawParagraph(doc, pride, marginX, y);

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 28, 76);
  doc.text('Contestant Details', marginX, y);
  y += 5;
  y = drawDetailTable(doc, finalist, marginX, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  if (type === 'school') {
    y = drawParagraph(doc, 'The school may nominate a teacher or representative to accompany the contestant, or may liaise with the parent/guardian to ensure the contestant arrives safely and on time.', marginX, y);
  } else {
    y = drawParagraph(doc, 'Please ensure that the contestant arrives on time, appears neatly dressed, and comes with the contest user code or any official identification requested by Mezzo Maths. For primary and junior contestants, a responsible adult should accompany the child.', marginX, y);
  }

  y = drawParagraph(doc, 'Further venue, reporting-time and coordination information will be communicated through the registered contact numbers and official Mezzo Maths channels.', marginX, y);
  y = drawParagraph(doc, 'We appreciate your cooperation and look forward to a successful Live Finals recording.', marginX, y);

  if (y > pageHeight - 55) {
    doc.addPage();
    await drawLetterhead(doc, logoUrl);
    y = 50;
  }

  y += 2;
  doc.text('Yours faithfully,', marginX, y);
  y += 16;
  doc.setDrawColor(17, 24, 39);
  doc.line(marginX, y, marginX + 64, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(SIGNATORY, marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(SIGNATORY_TITLE, marginX, y);

  drawFooter(doc);
  const label = type === 'school' ? 'school-invitation' : 'parent-guardian-invitation';
  savePdf(doc, `${safeFilePart(finalist.full_name)}-${label}.pdf`);
}

async function drawLetterhead(doc: jsPDF, logoUrl: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(16, 28, 76);
  doc.rect(0, 0, pageWidth, 34, 'F');

  const logoDataUrl = await getLogoDataUrl(logoUrl);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), 16, 6, 22, 22);
    } catch {
      // Continue without logo if the browser cannot decode the image.
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(PROGRAM_NAME, 44, 12, { maxWidth: pageWidth - 58 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${ORG_NAME} | ${ADDRESS}`, 44, 20, { maxWidth: pageWidth - 58 });
  doc.text(`${EMAIL} | ${WEBSITES}`, 44, 26, { maxWidth: pageWidth - 58 });

  doc.setDrawColor(255, 199, 44);
  doc.setLineWidth(1.2);
  doc.line(0, 34, pageWidth, 34);
}

function drawDetailTable(doc: jsPDF, finalist: LiveFinalist, x: number, y: number) {
  const rows: [string, string][] = [
    ['Contestant Name', finalist.full_name],
    ['Class / Category', finalist.class_name],
    ['School', finalist.school_name || 'Not provided'],
    ['School Location', finalist.school_location || 'Not provided'],
    ['Region', finalist.region || 'Not provided'],
    ['Live Finals Recording Date', formatDateOnly(finalist.reporting_date)],
    ['Venue', VENUE_TEXT],
    ['Reporting Time', REPORTING_TIME],
    ['Registered Contact', finalist.phone || finalist.whatsapp || 'Not provided'],
    ['Email', finalist.email || 'Not provided'],
    ['Travelling From', finalist.travel_from || finalist.school_location || 'Not provided'],
    ['Accompanying Person', finalist.companion_name || 'To be confirmed'],
    ['Accommodation Request', finalist.accommodation_required ? `Yes${finalist.accommodation_note ? ` — ${finalist.accommodation_note}` : ''}` : 'No request submitted']
  ];

  const labelW = 48;
  const valueW = 126;
  const rowH = 8;
  doc.setFontSize(8.6);

  rows.forEach(([label, value], index) => {
    const isEven = index % 2 === 0;
    const h = value.length > 76 ? 12 : rowH;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, y, labelW + valueW, h, 'FD');
    doc.line(x + labelW, y, x + labelW, y + h);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, x + 3, y + 5.3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(doc.splitTextToSize(value || '—', valueW - 6).slice(0, 2), x + labelW + 3, y + 5.3);
    y += h;
  });

  return y;
}

function drawParagraph(doc: jsPDF, text: string, x: number, y: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  y = drawWrapped(doc, text, x, y, pageWidth - x * 2, 5.2);
  return y + 4;
}

function drawWrapped(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight: number) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawLines(doc: jsPDF, lines: string[], x: number, y: number, lineHeight: number) {
  lines.filter(Boolean).forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(18, pageHeight - 16, pageWidth - 18, pageHeight - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${ORG_NAME} | ${EMAIL} | ${WEBSITES}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
}

function formatToday() {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

function formatDateOnly(value: string) {
  if (!value) return 'To be communicated';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function safeFilePart(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'finalist';
}

function savePdf(doc: jsPDF, filename: string) {
  const pdfBuffer = doc.output('arraybuffer') as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.type = 'application/pdf';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function getLogoDataUrl(logoUrl: string) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:image')) return logoUrl;

  try {
    const response = await fetch(logoUrl, { cache: 'force-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function getImageFormat(dataUrl: string) {
  const lower = dataUrl.slice(0, 40).toLowerCase();
  if (lower.includes('png')) return 'PNG';
  if (lower.includes('webp')) return 'WEBP';
  return 'JPEG';
}
