import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, CheckCircle2, Download, Edit3, Mail, MapPin, Phone,
  Save, School, Search, ShieldCheck, UserRound, Users, X
} from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { confirmLiveFinalist, searchLiveFinalists } from '../lib/finalists';
import { downloadGuardianInvitationLetter, downloadSchoolInvitationLetter } from '../lib/finalistLetters';
import { isSupabaseConfigured } from '../lib/supabase';
import { LiveFinalist, LiveFinalistUpdate } from '../types';

interface Props {
  logo: string | null;
  onBack: () => void;
  onAdmin: () => void;
}

function formFrom(row: LiveFinalist): LiveFinalistUpdate {
  return {
    school_name: row.school_name || '',
    school_location: row.school_location || '',
    region: row.region || '',
    email: row.email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    travel_from: row.travel_from || row.school_location || '',
    companion_name: row.companion_name || '',
    companion_relationship: row.companion_relationship || '',
    companion_phone: row.companion_phone || '',
    accommodation_required: Boolean(row.accommodation_required),
    accommodation_note: row.accommodation_note || ''
  };
}

function formatReportingDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
}

export function FinalistConfirmation({ logo, onBack, onAdmin }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LiveFinalist[]>([]);
  const [selected, setSelected] = useState<LiveFinalist | null>(null);
  const [form, setForm] = useState<LiveFinalistUpdate | null>(null);
  const [editing, setEditing] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    let ignore = false;
    if (!canSearch || selected) {
      if (!canSearch) setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await searchLiveFinalists(query);
        if (!ignore) setResults(rows);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Could not search the finalist list.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [query, canSearch, selected]);

  const searchMessage = useMemo(() => {
    if (!isSupabaseConfigured) return 'The database is not configured yet.';
    if (!canSearch) return 'Type at least 2 letters of your name.';
    if (loading) return 'Searching the final Live Finals list...';
    if (results.length) return `${results.length} matching finalist${results.length === 1 ? '' : 's'} found.`;
    return 'No finalist found with that name.';
  }, [canSearch, loading, results.length]);

  function choose(row: LiveFinalist) {
    setSelected(row);
    setForm(formFrom(row));
    setEditing(false);
    setUserCode('');
    setMessage('');
    setError('');
  }

  function resetSearch() {
    setSelected(null);
    setForm(null);
    setEditing(false);
    setUserCode('');
    setMessage('');
    setError('');
    setQuery('');
    setResults([]);
  }

  function logoForPdf() {
    if (logo?.startsWith('data:')) return logo;
    return `${window.location.origin}${logo || '/mezzopedia-logo.jpg'}`;
  }

  async function downloadLetter(type: 'school' | 'guardian') {
    if (!selected) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (type === 'school') {
        await downloadSchoolInvitationLetter(selected, logoForPdf());
        setMessage('School invitation letter downloaded successfully.');
      } else {
        await downloadGuardianInvitationLetter(selected, logoForPdf());
        setMessage('Parent/guardian invitation letter downloaded successfully.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download invitation letter.');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfirmation() {
    if (!selected || !form) return;
    if (!userCode.trim()) {
      setError('Enter your contest user code before confirming or saving changes.');
      return;
    }
    if (!form.travel_from.trim()) {
      setError('Please enter the location you will be travelling from.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await confirmLiveFinalist(selected.id, userCode, form);
      const refreshed = await searchLiveFinalists(selected.full_name);
      const latest = refreshed.find((item) => item.id === selected.id) || selected;
      setSelected(latest);
      setForm(formFrom(latest));
      setEditing(false);
      setUserCode('');
      setMessage('Your Live Finals details have been confirmed successfully. Thank you.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm your details.');
    } finally {
      setLoading(false);
    }
  }

  if (selected && form) {
    const confirmed = selected.confirmation_status === 'confirmed';
    const needsAccommodation = Boolean(selected.accommodation_required);
    return (
      <section className="page page--detail finalist-page">
        <button type="button" className="admin-pill" onClick={onAdmin}>Admin</button>
        <BrandHeader logo={logo} small />
        <div className="panel finalist-detail-panel">
          <div className="finalist-detail-actions">
            <button type="button" className="ghost-button" onClick={resetSearch}>
              <ArrowLeft size={18} /> Search another finalist
            </button>
            <button type="button" className="ghost-button" onClick={onBack}>Registration page</button>
          </div>

          <div className="detail-top">
            <div className="avatar"><UserRound size={34} /></div>
            <div className="finalist-title-block">
              <p className="eyebrow">Live Finals Attendance Confirmation</p>
              <h2>{selected.full_name}</h2>
              <p className="subtle">{selected.class_name} • {selected.region || 'Region not provided'}</p>
            </div>
            <span className={`confirmation-chip ${confirmed ? 'confirmed' : 'pending'}`}>
              {confirmed ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              {confirmed ? 'Confirmed' : 'Awaiting confirmation'}
            </span>
          </div>

          <div className="reporting-banner">
            <CalendarDays size={28} />
            <div>
              <span>Your Live Finals reporting date</span>
              <strong>{formatReportingDate(selected.reporting_date)}</strong>
            </div>
          </div>

          <div className="finalist-section invitation-section">
            <p className="eyebrow">Official Invitation Letters</p>
            <h3>Download letters for school heads and parents/guardians</h3>
            <p className="subtle">These official PDF letters include the Mezzo Maths logo, contestant details, school, region, recording date, contacts and signature of the Administrative Manager / Mezzopedia Contest Manager.</p>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => downloadLetter('school')} disabled={loading}>
                <Download size={18} /> Download School Invitation PDF
              </button>
              <button type="button" className="secondary-button" onClick={() => downloadLetter('guardian')} disabled={loading}>
                <Download size={18} /> Download Parent / Guardian PDF
              </button>
            </div>
          </div>

          {!editing ? (
            <>
              <div className="finalist-section">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Contestant & School</p>
                    <h3>Check these details carefully</h3>
                  </div>
                </div>
                <div className="finalist-info-grid">
                  <div className="info-card"><School size={18} /><span>Class</span><strong>{selected.class_name}</strong></div>
                  <div className="info-card"><School size={18} /><span>School</span><strong>{selected.school_name || 'Not provided'}</strong></div>
                  <div className="info-card"><MapPin size={18} /><span>School Location</span><strong>{selected.school_location || 'Not provided'}</strong></div>
                  <div className="info-card"><MapPin size={18} /><span>Region</span><strong>{selected.region || 'Not provided'}</strong></div>
                </div>
              </div>

              <div className="finalist-section">
                <p className="eyebrow">Contact Details</p>
                <div className="finalist-info-grid">
                  <div className="info-card"><Phone size={18} /><span>Registered Phone</span><strong>{selected.phone || 'Not provided'}</strong></div>
                  <div className="info-card"><Phone size={18} /><span>WhatsApp</span><strong>{selected.whatsapp || 'Not provided'}</strong></div>
                  <div className="info-card"><Mail size={18} /><span>Email</span><strong>{selected.email || 'Not provided'}</strong></div>
                  <div className="info-card"><MapPin size={18} /><span>Travelling From</span><strong>{selected.travel_from || selected.school_location || 'Please update this'}</strong></div>
                </div>
              </div>

              <div className="finalist-section companion-section">
                <p className="eyebrow">Accompanying Person</p>
                <div className="finalist-info-grid">
                  <div className="info-card"><Users size={18} /><span>Coming With</span><strong>{selected.companion_name || 'Not provided'}</strong></div>
                  <div className="info-card"><Users size={18} /><span>Relationship</span><strong>{selected.companion_relationship || 'Not provided'}</strong></div>
                  <div className="info-card"><Phone size={18} /><span>Companion Contact</span><strong>{selected.companion_phone || 'Not provided'}</strong></div>
                </div>
                <p className="subtle finalist-note">For students, the accompanying person is pre-filled from the guardian details available in the registration records. Change it if a different person will accompany the finalist.</p>
              </div>

              <div className="finalist-section accommodation-section">
                <p className="eyebrow">Accommodation Request</p>
                <div className="finalist-info-grid">
                  <div className="info-card"><ShieldCheck size={18} /><span>Needs Accommodation</span><strong>{needsAccommodation ? 'Yes, accommodation needed' : 'No accommodation requested'}</strong></div>
                  <div className="info-card"><Users size={18} /><span>Accommodation Note</span><strong>{selected.accommodation_note || 'No note provided'}</strong></div>
                </div>
                <p className="subtle finalist-note">Use Edit Details to request accommodation if the finalist needs Mezzo to make accommodation arrangements.</p>
              </div>
            </>
          ) : (
            <div className="finalist-edit-card">
              <div className="section-heading compact-heading">
                <div>
                  <p className="eyebrow">Edit Details</p>
                  <h3>Update only what has changed</h3>
                  <p className="subtle">Name, class and reporting date are locked. Contact Mezzo if any of those three are incorrect.</p>
                </div>
                <button type="button" className="secondary-button compact" onClick={() => { setEditing(false); setForm(formFrom(selected)); }}>
                  <X size={16} /> Cancel edit
                </button>
              </div>

              <div className="finalist-form-grid">
                <label>School name<input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} /></label>
                <label>School location<input value={form.school_location} onChange={(e) => setForm({ ...form, school_location: e.target.value })} /></label>
                <label>Region<input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
                <label>Travelling from<input value={form.travel_from} onChange={(e) => setForm({ ...form, travel_from: e.target.value })} placeholder="Town / area you will travel from" required /></label>
                <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label>Registered phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label>WhatsApp<input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></label>
                <label>Coming with<input value={form.companion_name} onChange={(e) => setForm({ ...form, companion_name: e.target.value })} placeholder="Name of accompanying person" /></label>
                <label>Relationship<input value={form.companion_relationship} onChange={(e) => setForm({ ...form, companion_relationship: e.target.value })} placeholder="Parent, guardian, teacher, spouse..." /></label>
                <label>Companion contact<input value={form.companion_phone} onChange={(e) => setForm({ ...form, companion_phone: e.target.value })} /></label>
                <label className="checkbox-label accommodation-toggle">
                  <input type="checkbox" checked={form.accommodation_required} onChange={(e) => setForm({ ...form, accommodation_required: e.target.checked })} />
                  Request accommodation from Mezzo
                </label>
                <label>Accommodation note<input value={form.accommodation_note} onChange={(e) => setForm({ ...form, accommodation_note: e.target.value })} placeholder="Example: finalist and mother need accommodation" /></label>
              </div>
            </div>
          )}

          <div className="verification-card">
            <div>
              <p className="eyebrow">Verification</p>
              <h3>Enter your contest user code</h3>
              <p className="subtle">Your user code is required before the system will save or confirm these details.</p>
            </div>
            <input value={userCode} onChange={(e) => setUserCode(e.target.value)} placeholder="e.g. MNMC00123" autoCapitalize="characters" />
          </div>

          {message && <div className="notice success"><CheckCircle2 size={18} /> {message}</div>}
          {error && <div className="notice error">{error}</div>}

          <div className="button-row finalist-buttons">
            {!editing && (
              <button type="button" className="secondary-button" onClick={() => setEditing(true)} disabled={loading}>
                <Edit3 size={18} /> Edit Details
              </button>
            )}
            <button type="button" className="primary-button" onClick={saveConfirmation} disabled={loading}>
              {editing ? <Save size={18} /> : <CheckCircle2 size={18} />}
              {loading ? 'Saving...' : editing ? 'Save Changes & Confirm' : confirmed ? 'Reconfirm These Details' : 'Confirm These Details'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page finalist-page">
      <button type="button" className="admin-pill" onClick={onAdmin}>Admin</button>
      <BrandHeader logo={logo} />

      <div className="finalist-schedule">
        <div className="schedule-card"><span>31 AUG</span><strong>Primary 5 & Primary 6</strong><small>Live Finals reporting day</small></div>
        <div className="schedule-card"><span>01 SEP</span><strong>JHS 1, JHS 2 & JHS 3</strong><small>Live Finals reporting day</small></div>
        <div className="schedule-card"><span>02 SEP</span><strong>SHS & Adults</strong><small>Live Finals reporting day</small></div>
      </div>

      <div className="panel finalist-search-panel">
        <button type="button" className="ghost-button" onClick={onBack}><ArrowLeft size={18} /> Back to registration lookup</button>
        <p className="eyebrow">Mezzopedia Live Finals</p>
        <h2>Confirm Your Live Finals Details</h2>
        <p className="subtle">Search your name, check your school, region, contact, travel, accommodation and accompanying-person details.</p>

        <div className="search-box">
          <Search size={19} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type your finalist name..." />
        </div>

        <p className="lookup-status">{searchMessage}</p>
        {error && <div className="notice error">{error}</div>}

        <div className="results-list">
          {results.map((row) => (
            <button type="button" key={row.id} className="result-item finalist-result" onClick={() => choose(row)}>
              <span>
                <strong>{row.full_name}</strong>
                <small>{row.class_name} • {row.region || 'Region not provided'} • {formatReportingDate(row.reporting_date)}</small>
              </span>
              <span className={`confirmation-chip ${row.confirmation_status === 'confirmed' ? 'confirmed' : 'pending'}`}>
                {row.confirmation_status === 'confirmed' ? 'Confirmed' : 'Pending'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
