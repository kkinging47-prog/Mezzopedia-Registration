import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, CheckCircle2, Edit3, KeyRound, Mail, MapPin,
  Phone, School, Search, ShieldCheck, UserRound, UsersRound
} from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '../lib/supabase';

interface Props {
  logo: string | null;
  onBack: () => void;
}

type ConfirmationStatus = 'pending' | 'confirmed';

interface FinalistSearchResult {
  id: string;
  full_name: string;
  class_name: string;
  region: string | null;
  location: string | null;
  recording_date: string;
  confirmation_status: ConfirmationStatus;
}

interface FinalistDetail extends FinalistSearchResult {
  usercode: string;
  school: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  companion_name: string | null;
  companion_relationship: string | null;
  companion_phone: string | null;
  confirmed_at: string | null;
  updated_at: string | null;
}

interface EditForm {
  full_name: string;
  class_name: string;
  school: string;
  location: string;
  region: string;
  email: string;
  phone: string;
  whatsapp: string;
  companion_name: string;
  companion_relationship: string;
  companion_phone: string;
}

const CLASS_OPTIONS = ['Primary 5', 'Primary 6', 'JHS 1', 'JHS 2', 'JHS 3', 'SHS', 'Adults'];
const REGION_OPTIONS = [
  'Ahafo Region', 'Ashanti Region', 'Bono Region', 'Bono East Region', 'Central Region',
  'Eastern Region', 'Greater Accra Region', 'North East Region', 'Northern Region', 'Oti Region',
  'Savannah Region', 'Upper East Region', 'Upper West Region', 'Volta Region', 'Western Region',
  'Western North Region'
];
const RELATIONSHIP_OPTIONS = ['Parent', 'Guardian', 'Teacher', 'Relative', 'Self', 'Other'];

const scheduleCards = [
  { classes: 'Primary 5 & Primary 6', date: '31 August 2026' },
  { classes: 'JHS 1, JHS 2 & JHS 3', date: '1 September 2026' },
  { classes: 'SHS & Adults', date: '2 September 2026' }
];

export function FinalistPortal({ logo, onBack }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FinalistSearchResult[]>([]);
  const [candidate, setCandidate] = useState<FinalistSearchResult | null>(null);
  const [detail, setDetail] = useState<FinalistDetail | null>(null);
  const [usercode, setUsercode] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    let ignore = false;
    setMessage('');
    setError('');

    if (!canSearch || detail) {
      if (!canSearch) setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        assertSupabaseConfigured();
        const { data, error: rpcError } = await supabase.rpc('search_live_finalists', { p_query: query.trim() });
        if (rpcError) throw rpcError;
        if (!ignore) setResults((data || []) as FinalistSearchResult[]);
      } catch (err) {
        if (!ignore) setError(readError(err, 'Could not search the Live Finals list.'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [query, canSearch, detail]);

  const searchStatus = useMemo(() => {
    if (!isSupabaseConfigured) return 'Database not configured yet.';
    if (!canSearch) return 'Type at least 2 letters of your name.';
    if (loading) return 'Searching the final Live Finals list...';
    if (results.length) return `${results.length} finalist${results.length === 1 ? '' : 's'} found.`;
    return 'No finalist found with that name.';
  }, [canSearch, loading, results.length]);

  function selectCandidate(row: FinalistSearchResult) {
    setCandidate(row);
    setUsercode('');
    setMessage('');
    setError('');
  }

  async function verifyAndOpen(e?: FormEvent) {
    e?.preventDefault();
    if (!candidate || !usercode.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      assertSupabaseConfigured();
      const { data, error: rpcError } = await supabase.rpc('get_live_finalist_details', {
        p_id: candidate.id,
        p_usercode: usercode.trim()
      });
      if (rpcError) throw rpcError;
      const row = firstRow<FinalistDetail>(data);
      if (!row) throw new Error('The user code does not match this finalist. Please check the code and try again.');
      setDetail(row);
      setCandidate(null);
      setResults([]);
      setEditing(false);
      setForm(detailToForm(row));
    } catch (err) {
      setError(readError(err, 'Could not verify the finalist.'));
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    if (!detail) return;
    setForm(detailToForm(detail));
    setEditing(true);
    setMessage('');
    setError('');
  }

  async function saveChanges(e: FormEvent) {
    e.preventDefault();
    if (!detail || !form) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('update_live_finalist_details', {
        p_id: detail.id,
        p_usercode: usercode.trim(),
        p_full_name: form.full_name.trim(),
        p_class_name: form.class_name,
        p_school: form.school,
        p_location: form.location,
        p_region: form.region,
        p_email: form.email,
        p_phone: form.phone,
        p_whatsapp: form.whatsapp,
        p_companion_name: form.companion_name,
        p_companion_relationship: form.companion_relationship,
        p_companion_phone: form.companion_phone
      });
      if (rpcError) throw rpcError;
      const row = firstRow<FinalistDetail>(data);
      if (!row) throw new Error('Your details could not be updated. Please verify your user code and try again.');
      setDetail(row);
      setForm(detailToForm(row));
      setEditing(false);
      setMessage('Your changes have been saved. Please review the details and click Confirm Details.');
    } catch (err) {
      setError(readError(err, 'Could not save your changes.'));
    } finally {
      setLoading(false);
    }
  }

  async function confirmDetails() {
    if (!detail) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('confirm_live_finalist', {
        p_id: detail.id,
        p_usercode: usercode.trim()
      });
      if (rpcError) throw rpcError;
      const row = firstRow<FinalistDetail>(data);
      if (!row) throw new Error('Your details could not be confirmed. Please verify your user code and try again.');
      setDetail(row);
      setForm(detailToForm(row));
      setMessage('Thank you. Your Live Finals attendance details have been confirmed successfully.');
    } catch (err) {
      setError(readError(err, 'Could not confirm your details.'));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setQuery('');
    setResults([]);
    setCandidate(null);
    setDetail(null);
    setUsercode('');
    setEditing(false);
    setForm(null);
    setMessage('');
    setError('');
  }

  if (detail) {
    return (
      <section className="page page--detail">
        <BrandHeader logo={logo} small />
        <div className="panel detail-panel">
          <button type="button" className="ghost-button" onClick={reset}>
            <ArrowLeft size={18} /> Search another finalist
          </button>

          <div className="detail-top">
            <div className="avatar"><UserRound size={34} /></div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p className="eyebrow">Live Finals Attendance Details</p>
              <h2>{detail.full_name}</h2>
              <p className="subtle">{detail.class_name} • {detail.region || 'Region not provided'}</p>
            </div>
            <span className={`status ${detail.confirmation_status === 'confirmed' ? 'paid' : 'pending'}`}>
              {detail.confirmation_status === 'confirmed' ? 'Confirmed' : 'Needs confirmation'}
            </span>
          </div>

          <div style={recordingBannerStyle}>
            <CalendarDays size={28} />
            <div>
              <strong style={{ display: 'block', fontSize: '1.15rem' }}>Your TV Recording Date</strong>
              <span>{formatRecordingDate(detail.recording_date)}</span>
            </div>
          </div>

          <div className="info-grid">
            <Info icon={<School size={18} />} label="School" value={detail.school || 'Not provided'} />
            <Info icon={<MapPin size={18} />} label="Coming From / Location" value={detail.location || 'Not provided'} />
            <Info icon={<MapPin size={18} />} label="Region" value={detail.region || 'Not provided'} />
            <Info icon={<KeyRound size={18} />} label="Class" value={detail.class_name} />
            <Info icon={<Phone size={18} />} label="Contact Phone" value={detail.phone || 'Not provided'} />
            <Info icon={<Mail size={18} />} label="Email" value={detail.email || 'Not provided'} />
            <Info icon={<Phone size={18} />} label="WhatsApp" value={detail.whatsapp || 'Not provided'} />
            <Info icon={<ShieldCheck size={18} />} label="User Code" value={detail.usercode} />
          </div>

          <div className="proof-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UsersRound size={20} /> Who are you coming with?</h3>
            <p className="subtle" style={{ marginBottom: 14 }}>
              This was prefilled from the original registration guardian/contact information where available. Please edit it if a different person will accompany you.
            </p>
            <div className="info-grid">
              <Info icon={<UserRound size={18} />} label="Accompanying Person" value={detail.companion_name || 'Not provided'} />
              <Info icon={<UsersRound size={18} />} label="Relationship" value={detail.companion_relationship || 'Not provided'} />
              <Info icon={<Phone size={18} />} label="Accompanying Person Contact" value={detail.companion_phone || 'Not provided'} />
              <Info icon={<CheckCircle2 size={18} />} label="Confirmation" value={detail.confirmation_status === 'confirmed' ? `Confirmed${detail.confirmed_at ? ` • ${formatDateTime(detail.confirmed_at)}` : ''}` : 'Pending'} />
            </div>
          </div>

          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          {!editing && (
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={startEdit} disabled={loading}>
                <Edit3 size={18} /> Edit Details
              </button>
              <button type="button" className="primary-button" onClick={confirmDetails} disabled={loading || detail.confirmation_status === 'confirmed'}>
                <CheckCircle2 size={18} /> {detail.confirmation_status === 'confirmed' ? 'Details Confirmed' : 'Confirm Details'}
              </button>
            </div>
          )}

          {editing && form && (
            <form className="form-grid" onSubmit={saveChanges} style={{ marginTop: 22 }}>
              <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
              <label>Class<select value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })}>{CLASS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>School<input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></label>
              <label>Coming from / Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
              <label>Region<select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}><option value="">Select region</option>{REGION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Contact phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label>WhatsApp<input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
              <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label>Who are you coming with?<input value={form.companion_name} onChange={(e) => setForm({ ...form, companion_name: e.target.value })} placeholder="Name of accompanying person" /></label>
              <label>Relationship<select value={form.companion_relationship} onChange={(e) => setForm({ ...form, companion_relationship: e.target.value })}><option value="">Select relationship</option>{RELATIONSHIP_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Accompanying person's contact<input type="tel" value={form.companion_phone} onChange={(e) => setForm({ ...form, companion_phone: e.target.value })} /></label>
              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={loading}>Save Changes</button>
                <button type="button" className="ghost-button" onClick={() => { setEditing(false); setForm(detailToForm(detail)); }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <BrandHeader logo={logo} />
      <div className="panel detail-panel" style={{ maxWidth: 980 }}>
        <button type="button" className="ghost-button" onClick={onBack}><ArrowLeft size={18} /> Back to Registration Check</button>
        <p className="eyebrow" style={{ marginTop: 12 }}>Mezzopedia Live Finals</p>
        <h2>Confirm Your TV Recording Details</h2>
        <p className="subtle">
          Search your name, verify with your contest user code, check where you are coming from and who will accompany you, then edit or confirm the details.
        </p>

        <div style={scheduleGridStyle}>
          {scheduleCards.map((item) => (
            <div key={item.classes} style={scheduleCardStyle}>
              <CalendarDays size={22} />
              <strong>{item.date}</strong>
              <span>{item.classes}</span>
            </div>
          ))}
        </div>

        {!isSupabaseConfigured && <div className="notice error">Supabase is not configured for this portal yet.</div>}

        <div className="search-box">
          <Search size={19} />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setCandidate(null); }} placeholder="Type your full name..." />
        </div>
        <p className="lookup-status">{searchStatus}</p>
        {error && <div className="notice error">{error}</div>}

        <div className="results-list">
          {results.map((row) => (
            <button type="button" key={row.id} className="result-item" onClick={() => selectCandidate(row)}>
              <span>
                <strong>{row.full_name}</strong>
                <small>{row.class_name} • {row.region || 'Region not provided'} • {formatRecordingDate(row.recording_date)}</small>
              </span>
              <span className={`status ${row.confirmation_status === 'confirmed' ? 'paid' : 'pending'}`}>{row.confirmation_status}</span>
            </button>
          ))}
        </div>

        {candidate && (
          <form onSubmit={verifyAndOpen} className="proof-card" style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 6 }}>{candidate.full_name}</h3>
            <p className="subtle">For privacy, enter the contest user code issued to this finalist before contact and companion details are shown.</p>
            <div className="password-box">
              <KeyRound size={18} />
              <input value={usercode} onChange={(e) => setUsercode(e.target.value)} placeholder="Enter user code e.g. MNMC00000" autoCapitalize="characters" />
            </div>
            <div className="button-row">
              <button type="submit" className="primary-button" disabled={loading || !usercode.trim()}>View My Details</button>
              <button type="button" className="ghost-button" onClick={() => setCandidate(null)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="info-card">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function detailToForm(row: FinalistDetail): EditForm {
  return {
    full_name: row.full_name || '',
    class_name: row.class_name || '',
    school: row.school || '',
    location: row.location || '',
    region: row.region || '',
    email: row.email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    companion_name: row.companion_name || '',
    companion_relationship: row.companion_relationship || '',
    companion_phone: row.companion_phone || ''
  };
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) || null;
  return data && typeof data === 'object' ? data as T : null;
}

function readError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return String((error as { message: string }).message);
  }
  return fallback;
}

function formatRecordingDate(value: string) {
  if (!value) return 'Date not assigned';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const scheduleGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
  margin: '22px 0'
};

const scheduleCardStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  padding: 16,
  border: '1px solid #dfe4f0',
  borderRadius: 18,
  background: '#f7f9ff',
  color: '#101c4c'
};

const recordingBannerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: 18,
  margin: '18px 0',
  borderRadius: 20,
  background: 'linear-gradient(135deg, #fff4da, #fffaf0)',
  border: '1px solid #f2cf79',
  color: '#6f4700'
};
