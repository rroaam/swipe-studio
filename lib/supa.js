// Supabase client + storage helpers. Used by the cloud store and the local sync.
import { createClient } from '@supabase/supabase-js';

export const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
export const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
export const BUCKET = 'swipe-media';

export function hasSupabase() { return Boolean(SUPA_URL && SUPA_KEY); }

export function supa() {
  if (!hasSupabase()) throw new Error('Supabase env not set (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)');
  return createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
}

export function publicUrl(objectPath) {
  return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

// 'supabase' => cloud (Vercel review surface); anything else => local filesystem.
export const CLOUD = process.env.ROAM_STORE === 'supabase';
