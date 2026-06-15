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
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(registrant.full_name)} - Registration Card</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;background:#f3f5fb;margin:0;padding:32px;color:#101827}
  .card{max-width:720px;margin:auto;background:#fff;border-radius:26px;box-shadow:0 18px 50px rgba(16,28,76,.18);overflow:hidden;border:1px solid #e6e8f2}
  .top{background:#101c4c;color:white;padding:32px;text-align:center}
  .logo{width:95px;height:95px;border-radius:22px;object-fit:cover;margin-bottom:14px;border:3px solid rgba(255,255,255,.4)}
  h1{font-size:22px;margin:0 0 6px}.sub{opacity:.8;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
  .body{padding:32px}.code{background:#101c4c;color:white;border-radius:18px;padding:24px;text-align:center;font-size:34px;letter-spacing:.08em;font-weight:800;margin:20px 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.item{background:#f8f9fd;border:1px solid #e6e8f2;border-radius:16px;padding:14px}
  .label{font-size:12px;color:#69738a;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.value{font-size:18px;font-weight:700}.status{display:inline-block;border-radius:999px;padding:8px 12px;font-weight:800;text-transform:uppercase;font-size:13px}.paid{background:#dcfce7;color:#166534}.unpaid{background:#fee2e2;color:#991b1b}.pending{background:#fef3c7;color:#92400e}
  .footer{padding:20px 32px;background:#f8f9fd;color:#64748b;font-size:13px;text-align:center}
  @media print{body{background:white;padding:0}.card{box-shadow:none}}
</style>
</head>
<body>
  <section class="card">
    <div class="top">
      <img class="logo" src="${logoUrl}" alt="MEZZOPEDIA Logo" />
      <h1>MEZZOPEDIA NATIONAL MATHEMATICS CONTEST 2026</h1>
      <div class="sub">Registration Confirmation Card</div>
    </div>
    <div class="body">
      <div class="item"><div class="label">Full Name</div><div class="value">${escapeHtml(registrant.full_name)}</div></div>
      <div class="code">${escapeHtml(registrant.unique_code)}</div>
      <div class="grid">
        <div class="item"><div class="label">Category</div><div class="value">${registrant.category === 'student' ? 'Student' : 'Adult'}</div></div>
        <div class="item"><div class="label">Payment Status</div><span class="status ${registrant.payment_status}">${statusLabel(registrant.payment_status)}</span></div>
        <div class="item"><div class="label">Phone</div><div class="value">${escapeHtml(registrant.phone || '—')}</div></div>
        <div class="item"><div class="label">Email</div><div class="value">${escapeHtml(registrant.email || '—')}</div></div>
      </div>
      ${registrant.proof_url ? `<p><strong>Proof uploaded:</strong> ${escapeHtml(registrant.proof_filename || 'Payment proof')} on ${formatDate(registrant.proof_uploaded_at)}</p>` : ''}
    </div>
    <div class="footer">Keep this card safely. You may print it or save it as PDF from your browser.</div>
  </section>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilePart(registrant.full_name)}-${registrant.unique_code}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
