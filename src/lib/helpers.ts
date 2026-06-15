import { jsPDF } from 'jspdf';
import { Category, PaymentStatus, Registrant } from '../types';

export const APP_TITLE = 'MEZZOPEDIA NATIONAL MATHEMATICS CONTEST 2026';

export function normalizeStatus(value: unknown): PaymentStatus {
  const text = String(value ?? '').trim().toLowerCase();
  if (['paid', 'pay', 'complete', 'completed', 'yes', 'true', '1'].includes(text)) return 'paid';
  if (['pending', 'processing', 'waiting'].includes(text)) return 'pending';
  return 'unpaid';
}

export function normalizeCategory(value: unknown, fallback: Category): Category {
  const text = String(value ?? '').trim().toLowerCase();
  if (['adult', 'adults'].includes(text)) return 'adult';
  if (['student', 'students'].includes(text)) return 'student';
  return fallback;
}

export function generateCode(category: Category) {
  const prefix = category === 'student' ? 'MZP-STU' : 'MZP-ADT';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

export function statusLabel(status: PaymentStatus) {
  if (status === 'paid') return 'Paid';
  if (status === 'pending') return 'Pending';
  return 'Unpaid';
}

export function statusClass(status: PaymentStatus) {
  if (status === 'paid') return 'status paid';
  if (status === 'pending') return 'status pending';
  return 'status unpaid';
}

export function safeFilePart(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'file';
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function downloadRegistrationCard(registrant: Registrant, logoUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardX = 18;
  const cardY = 18;
  const cardW = pageWidth - 36;

  // Background
  doc.setFillColor(245, 247, 252);
  doc.rect(0, 0, pageWidth, 297, 'F');

  // Main card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, cardY, cardW, 214, 8, 8, 'FD');

  // Header
  doc.setFillColor(16, 28, 76);
  doc.roundedRect(cardX, cardY, cardW, 58, 8, 8, 'F');
  doc.setFillColor(16, 28, 76);
  doc.rect(cardX, cardY + 50, cardW, 8, 'F');

  const logoDataUrl = await getLogoDataUrl(logoUrl);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), pageWidth / 2 - 15, cardY + 8, 30, 30);
    } catch {
      // Continue without logo if the browser cannot decode the image format.
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(APP_TITLE, pageWidth / 2, cardY + 45, { align: 'center', maxWidth: cardW - 20 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Registration Confirmation Card', pageWidth / 2, cardY + 52, { align: 'center' });

  let y = cardY + 76;
  drawLabel(doc, cardX + 14, y, 'Full Name');
  drawValue(doc, cardX + 14, y + 8, registrant.full_name, 16, cardW - 28);

  y += 30;
  doc.setFillColor(16, 28, 76);
  doc.roundedRect(cardX + 14, y, cardW - 28, 34, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('UNIQUE REGISTRATION CODE', pageWidth / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(registrant.unique_code, pageWidth / 2, y + 24, { align: 'center' });

  y += 50;
  const leftX = cardX + 14;
  const rightX = cardX + cardW / 2 + 4;
  const boxW = cardW / 2 - 22;
  drawInfoBox(doc, leftX, y, boxW, 'Category', registrant.category === 'student' ? 'Student' : 'Adult');
  drawInfoBox(doc, rightX, y, boxW, 'Payment Status', statusLabel(registrant.payment_status).toUpperCase());

  y += 32;
  drawInfoBox(doc, leftX, y, boxW, 'Phone', registrant.phone || '—');
  drawInfoBox(doc, rightX, y, boxW, 'Email', registrant.email || '—');

  y += 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX + 14, y, cardW - 28, 22, 5, 5, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const generated = `Generated: ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date())}`;
  doc.text(`Keep this card safely. ${generated}`, pageWidth / 2, y + 13, { align: 'center' });

  doc.save(`${safeFilePart(registrant.full_name)}-${registrant.unique_code}.pdf`);
}

function drawLabel(doc: jsPDF, x: number, y: number, label: string) {
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(label.toUpperCase(), x, y);
}

function drawValue(doc: jsPDF, x: number, y: number, value: string, size = 12, maxWidth = 70) {
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.text(doc.splitTextToSize(value || '—', maxWidth), x, y);
}

function drawInfoBox(doc: jsPDF, x: number, y: number, width: number, label: string, value: string) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 24, 5, 5, 'FD');
  drawLabel(doc, x + 5, y + 8, label);
  drawValue(doc, x + 5, y + 17, value, 10, width - 10);
}

async function getLogoDataUrl(logoUrl: string) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:image')) return logoUrl;

  try {
    const response = await fetch(logoUrl, { cache: 'force-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
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

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
