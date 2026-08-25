import { supabase, assertSupabaseConfigured } from './supabase';
import { LiveFinalist, LiveFinalistAdmin, LiveFinalistUpdate } from '../types';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return String((error as { message: string }).message);
  }
  return fallback;
}

export async function searchLiveFinalists(query: string) {
  assertSupabaseConfigured();
  const searchText = query.trim();
  if (searchText.length < 2) return [] as LiveFinalist[];

  const { data, error } = await supabase.rpc('search_live_finalists', { p_query: searchText });
  if (error) throw new Error(errorMessage(error, 'Could not search the Live Finals list.'));
  return (data || []) as LiveFinalist[];
}

export async function listLiveFinalistsForAdmin() {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc('list_live_finalists_for_admin');
  if (error) throw new Error(errorMessage(error, 'Could not export the Live Finals list.'));
  return (data || []) as LiveFinalistAdmin[];
}

export async function confirmLiveFinalist(id: string, userCode: string, update: LiveFinalistUpdate) {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc('confirm_live_finalist', {
    p_id: id,
    p_unique_code: userCode.trim(),
    p_school_name: update.school_name,
    p_school_location: update.school_location,
    p_region: update.region,
    p_email: update.email,
    p_phone: update.phone,
    p_whatsapp: update.whatsapp,
    p_travel_from: update.travel_from,
    p_companion_name: update.companion_name,
    p_companion_relationship: update.companion_relationship,
    p_companion_phone: update.companion_phone,
    p_accommodation_required: update.accommodation_required,
    p_accommodation_note: update.accommodation_note
  });

  if (error) throw new Error(errorMessage(error, 'Could not confirm your Live Finals details.'));
  return Boolean(data);
}
