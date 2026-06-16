import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, BellRing, CheckCircle2, Download, Edit3,
  FileUp, Mail, Phone, Search, ShieldCheck, UserRound
} from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { StatusBadge } from './StatusBadge';
import { addNotification, getRegistrantById, searchRegistrants, updateRegistrant, uploadProof } from '../lib/db';
import { downloadRegistrationCard, formatDate } from '../lib/helpers';
import { isSupabaseConfigured } from '../lib/supabase';
import { Category, Registrant } from '../types';

interface Props {
  logo: string | null;
  onAdmin: () => void;
}

type LookupCategory = Category | 'all';

export function StudentLookup({ logo, onAdmin }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LookupCategory>('all');
  const [results, setResults] = useState<Registrant[]>([]);
  const [selected, setSelected] = useState<Registrant | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    let ignore = false;
    setMessage('');
    setError('');
    if (!canSearch || selected) {
      if (!canSearch) setResults([]);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const rows = await searchRegistrants(query, category);
        if (!ignore) setResults(rows);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [query, category, canSearch, selected]);

  const subtitle = useMemo(() => {
    if (!isSupabaseConfigured) return 'Database not configured yet. Add your Supabase keys to .env.';
    if (!canSearch) return 'Type at least 2 letters of your name to search.';
    if (loading) return 'Searching registration list...';
    if (results.length) return `${results.length} matching registration${results.length === 1 ? '' : 's'} found.`;
    return 'No matching registration found yet.';
  }, [canSearch, loading, results.length]);

  async function refreshSelected(id = selected?.id) {
    if (!id) return;
    const fresh = await getRegistrantById(id);
    setSelected(fresh);
  }

  async function saveEditedName() {
    if (!selected || !newName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const updated = await updateRegistrant(selected.id, { full_name: newName.trim() });
      setSelected(updated);
      setEditingName(false);
      setMessage('Your name has been updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update name.');
    } finally {
      setLoading(false);
    }
  }

  async function notifyAdmin() {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await addNotification({
        registrant_id: selected.id,
        registrant_name: selected.full_name,
        type: 'payment_claim',
        message: `${selected.full_name} says payment has been made, but status is ${selected.payment_status}.`
      });
      setMessage('Admin has been notified. You may also upload proof of payment below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not notify admin.');
    } finally {
      setLoading(false);
    }
  }

  async function submitProof() {
    if (!selected || !proofFile) return;
    setLoading(true);
    setError('');
    try {
      const updated = await uploadProof(selected, proofFile);
      setSelected(updated);
      setProofFile(null);
      setMessage('Proof of payment uploaded successfully. The admin will see it immediately.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload proof.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCard() {
    if (!selected) return;
    setError('');
    try {
      const logoUrl = logo?.startsWith('data:') ? logo : `${window.location.origin}${logo || '/mezzopedia-logo.jpg'}`;
      await downloadRegistrationCard(selected, logoUrl);
      setMessage('PDF registration card generated. Check your Downloads folder.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate PDF registration card.');
    }
  }

  function resetSearch() {
    setSelected(null);
    setEditingName(false);
    setNewName('');
    setProofFile(null);
    setMessage('');
    setError('');
    setResults([]);
    setQuery('');
  }

  if (selected) {
    return (
      <section className="page page--detail">
        <button type="button" className="admin-pill" onClick={onAdmin}>Admin</button>
        <BrandHeader logo={logo} small />
        <div className="panel detail-panel">
          <button type="button" className="ghost-button" onClick={resetSearch}>
            <ArrowLeft size={18} /> Search another name
          </button>

          <div className="detail-top">
            <div className="avatar"><UserRound size={34} /></div>
            <div>
              <p className="eyebrow">Registration Details</p>
              <h2>{selected.full_name}</h2>
              <p className="subtle">{selected.category === 'student' ? 'Student' : 'Adult'} category</p>
            </div>
            <StatusBadge status={selected.payment_status} />
          </div>

          <div className="code-box">
            <span>Your Unique Registration Code</span>
            <strong>{selected.unique_code}</strong>
          </div>

          <div className="info-grid">
            <div className="info-card"><Phone size={18} /><span>Phone</span><strong>{selected.phone || 'Not provided'}</strong></div>
            <div className="info-card"><Mail size={18} /><span>Email</span><strong>{selected.email || 'Not provided'}</strong></div>
            <div className="info-card"><ShieldCheck size={18} /><span>Payment</span><strong>{selected.payment_status.toUpperCase()}</strong></div>
            <div className="info-card"><CheckCircle2 size={18} /><span>Last Updated</span><strong>{formatDate(selected.updated_at)}</strong></div>
          </div>

          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          <div className="button-row">
            <button type="button" className="primary-button" onClick={handleDownloadCard}>
              <Download size={18} /> Download PDF Registration Card
            </button>
            <button type="button" className="secondary-button" onClick={() => { setEditingName(true); setNewName(selected.full_name); }}>
              <Edit3 size={18} /> Edit Name
            </button>
          </div>

          {editingName && (
            <div className="inline-editor">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Correct full name" />
              <button type="button" className="primary-button compact" onClick={saveEditedName} disabled={loading}>Save</button>
              <button type="button" className="ghost-button compact" onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          )}

          {selected.payment_status !== 'paid' && (
            <div className="payment-help">
              <h3>Have you already paid?</h3>
              <p className="subtle">Notify the admin and upload proof of payment so your status can be updated.</p>
              <div className="button-row">
                <button type="button" className="secondary-button" onClick={notifyAdmin} disabled={loading}>
                  <BellRing size={18} /> Notify Admin
                </button>
                <label className="file-button">
                  <FileUp size={18} /> Choose Proof
                  <input type="file" accept="image/*,.pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => setProofFile(e.target.files?.[0] || null)} />
                </label>
                <button type="button" className="primary-button" disabled={!proofFile || loading} onClick={submitProof}>Upload Proof</button>
              </div>
              {proofFile && <p className="file-name">Selected: {proofFile.name}</p>}
            </div>
          )}

          {selected.proof_url && (
            <div className="proof-card">
              <h3>Proof of Payment Attached</h3>
              <p>{selected.proof_filename || 'Uploaded proof'} • {formatDate(selected.proof_uploaded_at)}</p>
              <a href={selected.proof_url} target="_blank" rel="noreferrer">View uploaded proof</a>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <button type="button" className="admin-pill" onClick={onAdmin}>Admin</button>
      <BrandHeader logo={logo} />
      <div className="panel lookup-panel">
        <h2>Find Your Details</h2>
        <p className="subtle">Search your name and select the correct result to view your registration code and payment status.</p>

        {!isSupabaseConfigured && (
          <div className="notice error"><AlertCircle size={18} /> Supabase is not configured. Follow the README setup steps first.</div>
        )}

        <div className="search-box">
          <Search size={19} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type your full name here..." />
        </div>

        <div className="segment">
          <button type="button" className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>All</button>
          <button type="button" className={category === 'student' ? 'active' : ''} onClick={() => setCategory('student')}>Students</button>
          <button type="button" className={category === 'adult' ? 'active' : ''} onClick={() => setCategory('adult')}>Adults</button>
        </div>

        <p className="lookup-status">{subtitle}</p>
        {error && <div className="notice error">{error}</div>}

        <div className="results-list">
          {results.map((row) => (
            <button type="button" key={row.id} className="result-item" onClick={() => { setSelected(row); refreshSelected(row.id); }}>
              <span>
                <strong>{row.full_name}</strong>
                <small>{row.category === 'student' ? 'Student' : 'Adult'} • {row.phone || row.email || 'No contact'}</small>
              </span>
              <StatusBadge status={row.payment_status} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
