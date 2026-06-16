import { supabase, assertSupabaseConfigured } from './supabase';
import { Category, NotificationItem, PaymentStatus, Registrant, UpsertRegistrantInput } from '../types';
import { safeFilePart } from './helpers';

const LOGO_KEY = 'logo_data_url';

function getSupabaseErrorMessage(error: unknown, fallback = 'Database request failed') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const possible = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      status?: unknown;
    };

    const parts: string[] = [];
    if (typeof possible.message === 'string' && possible.message.trim()) parts.push(possible.message.trim());
    if (typeof possible.details === 'string' && possible.details.trim()) parts.push(possible.details.trim());
    if (typeof possible.hint === 'string' && possible.hint.trim()) parts.push(`Hint: ${possible.hint.trim()}`);
    if (typeof possible.code === 'string' && possible.code.trim()) parts.push(`Code: ${possible.code.trim()}`);
    if (typeof possible.status === 'number' || typeof possible.status === 'string') parts.push(`Status: ${possible.status}`);

    if (parts.length) return parts.join(' | ');
  }

  return fallback;
}

function handleError(error: unknown, fallback = 'Database request failed') {
  throw new Error(getSupabaseErrorMessage(error, fallback));
}

export async function searchRegistrants(query: string, category: Category | 'all' = 'all') {
  assertSupabaseConfigured();
  let builder = supabase
    .from('registrants')
    .select('*')
    .ilike('full_name', `%${query.trim()}%`)
    .order('full_name', { ascending: true })
    .limit(60);

  if (category !== 'all') builder = builder.eq('category', category);
  const { data, error } = await builder;
  if (error) handleError(error);
  return (data || []) as Registrant[];
}

export async function listRegistrants(category: Category, query = '') {
  assertSupabaseConfigured();
  let builder = supabase
    .from('registrants')
    .select('*')
    .eq('category', category)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (query.trim()) builder = builder.ilike('full_name', `%${query.trim()}%`);
  const { data, error } = await builder;
  if (error) handleError(error);
  return (data || []) as Registrant[];
}

export async function getRegistrantById(id: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.from('registrants').select('*').eq('id', id).single();
  if (error) handleError(error);
  return data as Registrant;
}

export async function updateRegistrant(id: string, updates: Partial<UpsertRegistrantInput> & { proof_url?: string | null; proof_filename?: string | null; proof_uploaded_at?: string | null }) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('registrants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) handleError(error);
  return data as Registrant;
}

export async function upsertRegistrants(rows: UpsertRegistrantInput[]) {
  assertSupabaseConfigured();
  if (!rows.length) return [] as Registrant[];
  const cleaned = rows.map((row) => ({
    full_name: row.full_name.trim(),
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    payment_status: row.payment_status,
    unique_code: row.unique_code.trim(),
    category: row.category,
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('registrants')
    .upsert(cleaned, { onConflict: 'unique_code' })
    .select('*');
  if (error) handleError(error);
  return (data || []) as Registrant[];
}

export async function addRegistrant(row: UpsertRegistrantInput) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('registrants')
    .insert({
      full_name: row.full_name.trim(),
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      payment_status: row.payment_status,
      unique_code: row.unique_code.trim(),
      category: row.category
    })
    .select('*')
    .single();
  if (error) handleError(error);
  return data as Registrant;
}

export async function deleteRegistrant(id: string) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('registrants').delete().eq('id', id);
  if (error) handleError(error);
}

export async function deleteRegistrantsByCategory(category: Category) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('registrants').delete().eq('category', category);
  if (error) handleError(error);
}

export async function uploadProof(registrant: Registrant, file: File) {
  assertSupabaseConfigured();
  const safeName = safeFilePart(file.name.replace(/\.[^.]+$/, ''));
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'file';
  const path = `${registrant.id}/${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (uploadError) handleError(uploadError, 'Proof upload failed');

  const { data: publicUrl } = supabase.storage.from('payment-proofs').getPublicUrl(path);
  const uploadedAt = new Date().toISOString();
  const updated = await updateRegistrant(registrant.id, {
    proof_url: publicUrl.publicUrl,
    proof_filename: file.name,
    proof_uploaded_at: uploadedAt
  });

  await addNotification({
    registrant_id: registrant.id,
    registrant_name: registrant.full_name,
    type: 'proof_uploaded',
    message: `${registrant.full_name} uploaded proof of payment (${file.name}).`
  });

  return updated;
}

export async function addNotification(input: { registrant_id?: string | null; registrant_name?: string | null; type: string; message: string }) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('admin_notifications').insert({
    registrant_id: input.registrant_id || null,
    registrant_name: input.registrant_name || null,
    type: input.type,
    message: input.message,
    is_read: false
  });
  if (error) handleError(error);
}

async function ensureProofUploadNotifications() {
  const { data: proofRows, error: proofError } = await supabase
    .from('registrants')
    .select('id, full_name, proof_filename, proof_uploaded_at')
    .not('proof_url', 'is', null)
    .order('proof_uploaded_at', { ascending: false });

  if (proofError) handleError(proofError, 'Could not check uploaded proofs.');
  if (!proofRows?.length) return;

  const proofRegistrantIds = proofRows.map((row) => row.id);
  const { data: existingNotes, error: notesError } = await supabase
    .from('admin_notifications')
    .select('registrant_id')
    .eq('type', 'proof_uploaded')
    .in('registrant_id', proofRegistrantIds);

  if (notesError) handleError(notesError, 'Could not check proof notifications.');

  const existingIds = new Set((existingNotes || []).map((note) => note.registrant_id).filter(Boolean));
  const missingProofs = proofRows.filter((row) => !existingIds.has(row.id));

  if (!missingProofs.length) return;

  const { error: insertError } = await supabase.from('admin_notifications').insert(
    missingProofs.map((row) => ({
      registrant_id: row.id,
      registrant_name: row.full_name,
      type: 'proof_uploaded',
      message: `${row.full_name} uploaded proof of payment${row.proof_filename ? ` (${row.proof_filename})` : ''}.`,
      is_read: false,
      created_at: row.proof_uploaded_at || new Date().toISOString()
    }))
  );

  if (insertError) handleError(insertError, 'Could not create missing proof notifications.');
}

export async function listNotifications() {
  assertSupabaseConfigured();
  await ensureProofUploadNotifications();

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) handleError(error);
  return (data || []) as NotificationItem[];
}

export async function markAllNotificationsRead() {
  assertSupabaseConfigured();
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) handleError(error);
}

export async function deleteNotification(id: string) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('admin_notifications').delete().eq('id', id);
  if (error) handleError(error);
}

export async function getAppLogo() {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', LOGO_KEY)
    .maybeSingle();
  if (error) handleError(error);
  return data?.value || null;
}

export async function saveAppLogo(dataUrl: string | null) {
  assertSupabaseConfigured();
  const { error } = await supabase.from('app_settings').upsert({
    key: LOGO_KEY,
    value: dataUrl || '',
    updated_at: new Date().toISOString()
  });
  if (error) handleError(error);
}

export async function changePaymentStatus(registrant: Registrant, status: PaymentStatus) {
  const updated = await updateRegistrant(registrant.id, { payment_status: status });
  await addNotification({
    registrant_id: registrant.id,
    registrant_name: registrant.full_name,
    type: 'status_changed',
    message: `${registrant.full_name}'s payment status was changed to ${status}.`
  });
  return updated;
}
