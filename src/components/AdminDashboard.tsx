import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Bell, Check, Download, FileSpreadsheet, FileUp, GraduationCap,
  ImagePlus, LogOut, Pencil, Plus, RefreshCw, Save, Search,
  Trash2, Upload, Users, X
} from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { StatusBadge } from './StatusBadge';
import {
  addRegistrant, changePaymentStatus, deleteNotification, deleteRegistrant,
  deleteRegistrantsByCategory, listNotifications, listRegistrants, markAllNotificationsRead,
  saveAppLogo, updateRegistrant, upsertRegistrants
} from '../lib/db';
import { fileToDataUrl, formatDate, generateCode, normalizeCategory, normalizeStatus } from '../lib/helpers';
import { Category, ExcelRowPreview, NotificationItem, PaymentStatus, Registrant, UpsertRegistrantInput } from '../types';

interface Props {
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
  onLogout: () => void;
}

const emptyForm: UpsertRegistrantInput = {
  full_name: '',
  phone: '',
  email: '',
  payment_status: 'unpaid',
  unique_code: '',
  category: 'student'
};

type AdminPanel = 'list' | 'add' | 'upload' | 'notifications' | 'settings';

export function AdminDashboard({ logo, onLogoChange, onLogout }: Props) {
  const [category, setCategory] = useState<Category>('student');
  const [rows, setRows] = useState<Registrant[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<UpsertRegistrantInput>(emptyForm);
  const [editing, setEditing] = useState<Registrant | null>(null);
  const [uploadPreview, setUploadPreview] = useState<ExcelRowPreview[]>([]);
  const [uploadMode, setUploadMode] = useState<'merge' | 'replace'>('merge');
  const [activePanel, setActivePanel] = useState<AdminPanel>('list');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const paidCount = rows.filter((row) => row.payment_status === 'paid').length;
  const unpaidCount = rows.filter((row) => row.payment_status !== 'paid').length;

  async function loadData(nextCategory = category, queryText = search) {
    setLoading(true);
    setError('');
    try {
      const [registrants, notes] = await Promise.all([
        listRegistrants(nextCategory, queryText),
        listNotifications()
      ]);
      setRows(registrants);
      setNotifications(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(category, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function showList() {
    setActivePanel('list');
    setEditing(null);
    setUploadPreview([]);
  }

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    setSearch('');
    setMessage('');
    setError('');
    setForm({ ...emptyForm, category: nextCategory, unique_code: generateCode(nextCategory) });
    showList();
    void loadData(nextCategory, '');
  }

  async function refreshList() {
    await loadData(category, search);
  }

  async function openNotifications() {
    setActivePanel('notifications');
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const notes = await listNotifications();
      setNotifications(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }

  async function searchList(e: FormEvent) {
    e.preventDefault();
    await loadData(category, search);
  }

  function startAdd() {
    setEditing(null);
    setForm({ ...emptyForm, category, unique_code: generateCode(category) });
    setActivePanel('add');
  }

  function startEdit(row: Registrant) {
    setEditing(row);
    setForm({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone || '',
      email: row.email || '',
      payment_status: row.payment_status,
      unique_code: row.unique_code,
      category: row.category
    });
    setActivePanel('add');
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (!form.full_name.trim()) throw new Error('Full name is required.');
      const { id: _id, ...payload } = {
        ...form,
        unique_code: form.unique_code.trim() || generateCode(form.category),
        full_name: form.full_name.trim()
      };

      if (editing) {
        await updateRegistrant(editing.id, payload);
        setMessage('Registration updated successfully.');
      } else {
        await addRegistrant(payload);
        setMessage('Registration added successfully.');
      }

      setEditing(null);
      setActivePanel('list');
      setCategory(payload.category);
      setForm({ ...emptyForm, category: payload.category, unique_code: generateCode(payload.category) });
      await loadData(payload.category, '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save registration.');
    } finally {
      setLoading(false);
    }
  }

  async function removeRow(row: Registrant) {
    if (!confirm(`Delete ${row.full_name}?`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteRegistrant(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      setMessage('Registration deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete registration.');
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(row: Registrant, status: PaymentStatus) {
    setLoading(true);
    setError('');
    try {
      const updated = await changePaymentStatus(row, status);
      setRows((current) => current.map((item) => item.id === row.id ? updated : item));
      setMessage(`${row.full_name}'s payment status changed to ${status}.`);
      const notes = await listNotifications();
      setNotifications(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change payment status.');
    } finally {
      setLoading(false);
    }
  }

  async function parseExcel(file: File) {
    setError('');
    setMessage('Reading file...');
    setUploadPreview([]);

    try {
      const data = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const parsed = raw
        .map((row, index) => parseExcelRow(row, index + 2, category))
        .filter((row) => row.full_name);

      if (!parsed.length) {
        throw new Error('No valid records were found. Please make sure the file has a name or full_name column.');
      }

      setUploadPreview(parsed);
      await saveExcelRows(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read or save Excel file.');
      setMessage('');
    }
  }

  async function saveExcelRows(rowsToSave = uploadPreview) {
    if (!rowsToSave.length) return;
    if (uploadMode === 'replace' && !confirm(`This will delete all ${category} records and replace them with the uploaded file. Continue?`)) return;
    setLoading(true);
    setError('');
    try {
      if (uploadMode === 'replace') await deleteRegistrantsByCategory(category);
      await upsertRegistrants(rowsToSave.map(({ rowNumber, ...row }) => row));
      setUploadPreview([]);
      setMessage(`${rowsToSave.length} record${rowsToSave.length === 1 ? '' : 's'} saved permanently to Supabase.`);
      setActivePanel('list');
      await loadData(category, '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import Excel rows.');
      setMessage('');
    } finally {
      setLoading(false);
    }
  }

  async function readLogo(file: File) {
    setError('');
    try {
      if (file.size > 2_000_000) throw new Error('Logo file is too large. Please use an image below 2MB.');
      const dataUrl = await fileToDataUrl(file);
      await saveAppLogo(dataUrl);
      onLogoChange(dataUrl);
      setMessage('Logo saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save logo.');
    }
  }

  async function clearLogo() {
    await saveAppLogo(null);
    onLogoChange(null);
    setMessage('Logo reset to default.');
  }

  async function readNotifications() {
    setLoading(true);
    setError('');
    try {
      await markAllNotificationsRead();
      const notes = await listNotifications();
      setNotifications(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update notifications.');
    } finally {
      setLoading(false);
    }
  }

  async function removeNotification(id: string) {
    await deleteNotification(id);
    setNotifications((current) => current.filter((note) => note.id !== id));
  }

  function exportCsv() {
    const header = ['full_name', 'phone', 'email', 'payment_status', 'unique_code', 'category'];
    const csv = [header.join(',')]
      .concat(rows.map((row) => header.map((key) => csvValue(String((row as unknown as Record<string, unknown>)[key] ?? ''))).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mezzopedia-${category}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-page">
      <div className="admin-sidebar">
        <BrandHeader logo={logo} small />
        <nav>
          <button className={category === 'student' && activePanel === 'list' ? 'active' : ''} onClick={() => selectCategory('student')}><GraduationCap size={18} /> Students</button>
          <button className={category === 'adult' && activePanel === 'list' ? 'active' : ''} onClick={() => selectCategory('adult')}><Users size={18} /> Adults</button>
          <button className={activePanel === 'notifications' ? 'active' : ''} onClick={() => void openNotifications()}><Bell size={18} /> Notifications {unreadCount ? <em>{unreadCount}</em> : null}</button>
          <button className={activePanel === 'settings' ? 'active' : ''} onClick={() => setActivePanel('settings')}><ImagePlus size={18} /> Logo Settings</button>
        </nav>
        <button className="logout-button" onClick={onLogout}><LogOut size={18} /> Logout</button>
      </div>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h2>{category === 'student' ? 'Student' : 'Adult'} Registrations</h2>
          </div>
          <div className="button-row align-right">
            <button className="secondary-button" onClick={refreshList} disabled={loading}><RefreshCw size={18} /> Refresh</button>
            <button className="secondary-button" onClick={exportCsv}><Download size={18} /> Export CSV</button>
            <button className="primary-button" onClick={startAdd}><Plus size={18} /> Add Entry</button>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card"><span>Total</span><strong>{rows.length}</strong></div>
          <div className="stat-card"><span>Paid</span><strong>{paidCount}</strong></div>
          <div className="stat-card"><span>Unpaid/Pending</span><strong>{unpaidCount}</strong></div>
          <div className="stat-card"><span>Notifications</span><strong>{unreadCount}</strong></div>
        </div>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        {activePanel !== 'notifications' && activePanel !== 'settings' && (
          <div className="tabs">
            <button className={activePanel === 'list' ? 'active' : ''} onClick={showList}>List</button>
            <button className={activePanel === 'add' ? 'active' : ''} onClick={startAdd}>Add / Edit</button>
            <button className={activePanel === 'upload' ? 'active' : ''} onClick={() => { setEditing(null); setActivePanel('upload'); }}>Upload Excel</button>
          </div>
        )}

        {activePanel === 'list' && (
          <section className="admin-card">
            <form className="table-search" onSubmit={searchList}>
              <Search size={18} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." />
              <button className="secondary-button compact" type="submit">Search</button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Proof</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.full_name}</strong><small>{row.category}</small></td>
                      <td><code>{row.unique_code}</code></td>
                      <td><small>{row.phone || 'No phone'}<br />{row.email || 'No email'}</small></td>
                      <td><StatusBadge status={row.payment_status} /></td>
                      <td>{row.proof_url ? <a href={row.proof_url} target="_blank" rel="noreferrer">View proof</a> : <small>None</small>}</td>
                      <td>
                        <div className="table-actions">
                          <button title="Edit" onClick={() => startEdit(row)}><Pencil size={16} /></button>
                          <button title="Mark paid" onClick={() => setStatus(row, 'paid')}><Check size={16} /></button>
                          <button title="Mark unpaid" onClick={() => setStatus(row, 'unpaid')}><X size={16} /></button>
                          <button title="Delete" onClick={() => removeRow(row)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <p className="empty-state">No records found for this category.</p>}
            </div>
          </section>
        )}

        {activePanel === 'add' && (
          <section className="admin-card">
            <h3>{editing ? 'Edit Registration' : 'Add New Registration'}</h3>
            <form className="form-grid" onSubmit={submitForm}>
              <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
              <label>Unique code<input value={form.unique_code} onChange={(e) => setForm({ ...form, unique_code: e.target.value })} placeholder="Auto-generated if blank" /></label>
              <label>Phone<input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label>Email<input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}><option value="student">Student</option><option value="adult">Adult</option></select></label>
              <label>Payment status<select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as PaymentStatus })}><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="paid">Paid</option></select></label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={loading}><Save size={18} /> Save Details</button>
                <button className="ghost-button" type="button" onClick={showList}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        {activePanel === 'upload' && (
          <section className="admin-card">
            <h3>Upload Excel File</h3>
            <p className="subtle">Excel columns accepted: name/full_name, phone, email, payment_status, unique_code, category. When you select a file, it is saved immediately to Supabase. If unique_code is blank, the app will generate one.</p>
            <div className="upload-box">
              <FileSpreadsheet size={34} />
              <label className="file-button large">
                <Upload size={18} /> Select Excel/CSV and Save
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) void parseExcel(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            <div className="segment left">
              <button className={uploadMode === 'merge' ? 'active' : ''} onClick={() => setUploadMode('merge')}>Merge & Update</button>
              <button className={uploadMode === 'replace' ? 'active' : ''} onClick={() => setUploadMode('replace')}>Replace {category}</button>
            </div>
            {uploadPreview.length > 0 && (
              <>
                <div className="table-wrap small-table">
                  <table>
                    <thead><tr><th>Row</th><th>Name</th><th>Code</th><th>Phone</th><th>Email</th><th>Status</th></tr></thead>
                    <tbody>{uploadPreview.slice(0, 25).map((row) => <tr key={`${row.rowNumber}-${row.unique_code}`}><td>{row.rowNumber}</td><td>{row.full_name}</td><td>{row.unique_code}</td><td>{row.phone}</td><td>{row.email}</td><td>{row.payment_status}</td></tr>)}</tbody>
                  </table>
                </div>
                <button className="primary-button" onClick={() => saveExcelRows()} disabled={loading}><FileUp size={18} /> Save {uploadPreview.length} Records Again</button>
              </>
            )}
          </section>
        )}

        {activePanel === 'notifications' && (
          <section className="admin-card">
            <div className="section-heading">
              <div><h3>Notifications</h3><p className="subtle">Payment claims, proof uploads, and status updates appear here. Click refresh if you are checking after a new proof upload.</p></div>
              <div className="button-row align-right">
                <button className="secondary-button" onClick={() => void openNotifications()} disabled={loading}><RefreshCw size={18} /> Refresh</button>
                <button className="secondary-button" onClick={readNotifications} disabled={loading}>Mark all read</button>
              </div>
            </div>
            <div className="notification-list">
              {notifications.map((note) => (
                <div key={note.id} className={`notification ${note.is_read ? '' : 'unread'}`}>
                  <Bell size={18} />
                  <div>
                    <strong>{note.registrant_name || 'System'}</strong>
                    <p>{note.message}</p>
                    <small>{formatDate(note.created_at)}</small>
                  </div>
                  <button onClick={() => removeNotification(note.id)}><Trash2 size={16} /></button>
                </div>
              ))}
              {!notifications.length && <p className="empty-state">No notifications yet. Proof uploads also appear in the Student/Adult list under the Proof column.</p>}
            </div>
          </section>
        )}

        {activePanel === 'settings' && (
          <section className="admin-card">
            <h3>Logo Settings</h3>
            <p className="subtle">Upload a new logo to show on the user portal, admin login, and downloaded registration card.</p>
            <div className="settings-logo">
              <img src={logo || '/mezzopedia-logo.jpg'} alt="Current logo" />
              <div className="button-row">
                <label className="file-button"><ImagePlus size={18} /> Upload Logo<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && readLogo(e.target.files[0])} /></label>
                <button className="secondary-button" onClick={clearLogo}>Reset Default</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function parseExcelRow(row: Record<string, unknown>, rowNumber: number, fallbackCategory: Category): ExcelRowPreview {
  const get = (...names: string[]) => {
    const keys = Object.keys(row);
    const found = keys.find((key) => names.includes(key.trim().toLowerCase().replace(/\s+/g, '_')));
    return found ? row[found] : '';
  };

  const parsedCategory = normalizeCategory(get('category', 'type'), fallbackCategory);
  const fullName = String(get('full_name', 'name', 'student_name', 'adult_name')).trim();
  const uniqueCode = String(get('unique_code', 'code', 'registration_code', 'reg_code')).trim() || generateCode(parsedCategory);

  return {
    rowNumber,
    full_name: fullName,
    phone: String(get('phone', 'phone_number', 'mobile')).trim(),
    email: String(get('email', 'email_address')).trim(),
    payment_status: normalizeStatus(get('payment_status', 'status', 'payment')),
    unique_code: uniqueCode,
    category: parsedCategory
  };
}

function csvValue(value: string) {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
