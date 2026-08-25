import { jsPDF } from 'jspdf';
import { LiveFinalistAdmin } from '../types';
import { listLiveFinalistsForAdmin } from './finalists';

const APP_TITLE = 'MEZZOPEDIA NATIONAL MATHEMATICS CONTEST 2026';

interface SummaryRow {
  label: string;
  count: number;
}

export async function downloadLiveFinalistsSummaryPdf() {
  const finalists = await listLiveFinalistsForAdmin();
  if (!finalists.length) throw new Error('No live finalists found to export.');

  const sorted = [...finalists].sort((a, b) => {
    const dateCompare = String(a.reporting_date).localeCompare(String(b.reporting_date));
    if (dateCompare) return dateCompare;
    const classCompare = classOrder(a.class_name) - classOrder(b.class_name);
    if (classCompare) return classCompare;
    return a.full_name.localeCompare(b.full_name);
  });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = 16;

  drawHeader(doc, 'Live Finalists Summary with Contacts');
  y = 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(83, 94, 113);
  doc.text(`Generated: ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`, 14, y);
  y += 8;

  const total = sorted.length;
  const confirmed = sorted.filter((item) => item.confirmation_status === 'confirmed').length;
  const pending = total - confirmed;
  const accommodationNeeded = sorted.filter((item) => item.accommodation_required).length;
  const male = sorted.filter((item) => estimateGender(item.full_name) === 'Male').length;
  const female = sorted.filter((item) => estimateGender(item.full_name) === 'Female').length;
  const unknownGender = total - male - female;

  drawStatCards(doc, [
    ['Total finalists', String(total)],
    ['Confirmed', String(confirmed)],
    ['Pending', String(pending)],
    ['Accommodation', String(accommodationNeeded)],
    ['Male / Female', `${male} / ${female}${unknownGender ? ` / ${unknownGender} unknown` : ''}`]
  ], y);
  y += 32;

  y = drawSummarySection(doc, 'Regional Summary', toRows(groupBy(sorted, (item) => item.region || 'Unknown')), 14, y);
  drawSummarySection(doc, 'Class Summary', toRows(groupBy(sorted, (item) => item.class_name || 'Unknown'), classOrder), 105, 78);
  drawSummarySection(doc, 'Accommodation Summary', [
    { label: 'Accommodation requested', count: accommodationNeeded },
    { label: 'No accommodation requested', count: total - accommodationNeeded }
  ], 198, 78);
  drawSummarySection(doc, 'Recording Date Summary', toRows(groupBy(sorted, (item) => formatDateOnly(item.reporting_date))), 198, 112);

  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'Main Location Summary');
  drawSimpleTable(doc, ['Location', 'Finalists'], toRows(groupBy(sorted, (item) => item.travel_from || item.school_location || 'Unknown')).map((row) => [row.label, String(row.count)]), 14, 38, [170, 35]);

  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'Accommodation Requests');
  const accommodationRows = sorted.filter((row) => row.accommodation_required);
  drawSimpleTable(
    doc,
    ['Name', 'Class', 'Region / Location', 'Contact', 'Coming with', 'Accommodation note'],
    (accommodationRows.length ? accommodationRows : sorted.filter(() => false)).map((row) => [
      row.full_name,
      row.class_name,
      [row.region, row.travel_from || row.school_location].filter(Boolean).join(' / ') || '—',
      [row.phone, row.whatsapp && row.whatsapp !== row.phone ? `WA: ${row.whatsapp}` : '', row.email].filter(Boolean).join('\n') || '—',
      [row.companion_name, row.companion_relationship, row.companion_phone].filter(Boolean).join('\n') || '—',
      row.accommodation_note || 'Accommodation requested'
    ]),
    10,
    38,
    [43, 22, 48, 48, 52, 70],
    7
  );
  if (!accommodationRows.length) {
    doc.setTextColor(83, 94, 113);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No finalist has requested accommodation yet.', 14, 48);
  }

  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'Finalist Contact List');
  drawContactPages(doc, sorted);

  savePdf(doc, `mezzopedia-live-finalists-summary-contacts-${dateStamp()}.pdf`);
}

function drawHeader(doc: jsPDF, title: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(16, 28, 76);
  doc.rect(0, 0, width, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(APP_TITLE, 14, 10);
  doc.setFontSize(12);
  doc.text(title, 14, 19);
}

function drawStatCards(doc: jsPDF, cards: [string, string][], y: number) {
  const widths = [52, 43, 43, 52, 60];
  let x = 14;
  cards.forEach(([label, value], index) => {
    const w = widths[index] || 50;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(223, 228, 240);
    doc.roundedRect(x, y, w, 22, 4, 4, 'FD');
    doc.setTextColor(101, 112, 133);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), x + 4, y + 7);
    doc.setTextColor(16, 28, 76);
    doc.setFontSize(14);
    doc.text(value, x + 4, y + 17);
    x += w + 6;
  });
}

function drawSummarySection(doc: jsPDF, title: string, rows: SummaryRow[], x: number, y: number) {
  doc.setTextColor(16, 28, 76);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, x, y);
  drawSimpleTable(doc, ['Item', 'Count'], rows.map((row) => [row.label, String(row.count)]), x, y + 5, [70, 18], 9);
  return y + 12 + rows.length * 7;
}

function drawContactPages(doc: jsPDF, rows: LiveFinalistAdmin[]) {
  const headers = ['#', 'Name', 'Class', 'Region / Location', 'School', 'Contact', 'Coming with', 'Accom.', 'Date', 'Status'];
  const widths = [8, 38, 18, 38, 38, 36, 35, 18, 22, 20];
  let y = 36;
  const rowHeight = 18;
  const bottom = doc.internal.pageSize.getHeight() - 12;

  drawTableHeader(doc, headers, widths, 8, y);
  y += 8;

  rows.forEach((row, index) => {
    if (y + rowHeight > bottom) {
      doc.addPage('a4', 'landscape');
      drawHeader(doc, 'Finalist Contact List');
      y = 36;
      drawTableHeader(doc, headers, widths, 8, y);
      y += 8;
    }

    const contact = [row.phone, row.whatsapp && row.whatsapp !== row.phone ? `WA: ${row.whatsapp}` : '', row.email].filter(Boolean).join('\n');
    const location = [row.region, row.travel_from || row.school_location].filter(Boolean).join('\n');
    const companion = [row.companion_name, row.companion_relationship, row.companion_phone].filter(Boolean).join('\n');
    const accommodation = row.accommodation_required ? `Yes${row.accommodation_note ? `\n${row.accommodation_note}` : ''}` : 'No';
    const values = [
      String(index + 1), row.full_name, row.class_name, location || '—', row.school_name || 'N/A',
      contact || '—', companion || '—', accommodation, formatDateOnly(row.reporting_date), row.confirmation_status
    ];
    drawTableRow(doc, values, widths, 8, y, rowHeight, index % 2 === 0);
    y += rowHeight;
  });
}

function drawSimpleTable(doc: jsPDF, headers: string[], rows: string[][], x: number, y: number, widths: number[], fontSize = 8.5) {
  drawTableHeader(doc, headers, widths, x, y, fontSize);
  let rowY = y + 7;
  rows.forEach((row, index) => {
    if (rowY > doc.internal.pageSize.getHeight() - 14) {
      doc.addPage('a4', 'landscape');
      drawHeader(doc, headers[0]);
      rowY = 38;
      drawTableHeader(doc, headers, widths, x, rowY, fontSize);
      rowY += 7;
    }
    drawTableRow(doc, row, widths, x, rowY, 8, index % 2 === 0, fontSize);
    rowY += 8;
  });
}

function drawTableHeader(doc: jsPDF, headers: string[], widths: number[], x: number, y: number, fontSize = 7.5) {
  doc.setFillColor(16, 28, 76);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  let cursor = x;
  headers.forEach((header, index) => {
    doc.rect(cursor, y, widths[index], 7, 'F');
    doc.text(header, cursor + 2, y + 5);
    cursor += widths[index];
  });
}

function drawTableRow(doc: jsPDF, values: string[], widths: number[], x: number, y: number, height: number, shaded: boolean, fontSize = 7) {
  doc.setFillColor(shaded ? 248 : 255, shaded ? 250 : 255, shaded ? 252 : 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(x, y, widths.reduce((sum, width) => sum + width, 0), height, 'FD');
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  let cursor = x;
  values.forEach((value, index) => {
    const lines = doc.splitTextToSize(value || '—', widths[index] - 4).slice(0, Math.max(1, Math.floor((height - 2) / 3.5)));
    doc.text(lines, cursor + 2, y + 4);
    cursor += widths[index];
    if (index < values.length - 1) doc.line(cursor, y, cursor, y + height);
  });
}

function groupBy(rows: LiveFinalistAdmin[], picker: (row: LiveFinalistAdmin) => string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = picker(row).trim() || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toRows(groups: Record<string, number>, sorter?: (label: string) => number) {
  return Object.entries(groups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => sorter ? sorter(a.label) - sorter(b.label) : b.count - a.count || a.label.localeCompare(b.label));
}

function classOrder(label: string) {
  const order = ['Primary 5', 'Primary 6', 'JHS 1', 'JHS 2', 'JHS 3', 'SHS', 'Adults'];
  const index = order.indexOf(label);
  return index === -1 ? 99 : index;
}

function formatDateOnly(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
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

function estimateGender(name: string) {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const femaleNames = new Set(['kezia', 'selina', 'quinnella', 'yayra', 'precious', 'dinah', 'akosua', 'angela', 'prudence', 'sheena', 'adelayita', 'alisha', 'dagbe', 'grace', 'bediako', 'danielle', 'michelle', 'nazarena', 'joyce']);
  const maleNames = new Set(['albert', 'emmanuel', 'frimpong', 'godwin', 'solomon', 'hilton', 'jeremy', 'kobea', 'mohammed', 'abdul', 'haatim', 'jersey', 'barima', 'boadi', 'hakeem', 'joshua', 'nana', 'dakora', 'daniel', 'desmond', 'gad', 'jadon', 'joel', 'kelvin', 'madiba', 'muhammad', 'paul', 'theikos', 'amegah-awli', 'george', 'mensah', 'nzebah']);
  if (femaleNames.has(first)) return 'Female';
  if (maleNames.has(first)) return 'Male';
  return 'Unknown';
}
