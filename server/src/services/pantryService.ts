import { supabase } from '../lib/supabase';
import { PantryItem, PantryItemInput, Staple } from '../types/recipe';

export async function getUserPantry(userId: string): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, canonical_name, quantity, unit')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as PantryItem[];
}

export async function addPantryItems(userId: string, items: PantryItemInput[]): Promise<PantryItem[]> {
  const rows = items.map((item) => ({
    user_id: userId,
    canonical_name: item.canonical_name,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
  }));

  const { data, error } = await supabase
    .from('pantry_items')
    .upsert(rows, { onConflict: 'user_id,canonical_name' })
    .select('id, canonical_name, quantity, unit');

  if (error) throw error;
  return (data ?? []) as PantryItem[];
}

export async function removePantryItem(userId: string, canonicalName: string): Promise<void> {
  const { data, error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('user_id', userId)
    .eq('canonical_name', canonicalName)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    const err = new Error('not_found');
    (err as NodeJS.ErrnoException).code = 'not_found';
    throw err;
  }
}

export async function getStaplesWithOwnership(userId: string): Promise<Staple[]> {
  const [staplesResult, ownedResult] = await Promise.all([
    supabase
      .from('ingredient_map')
      .select('canonical_name, unit')
      .eq('is_pantry_staple', true)
      .order('canonical_name'),
    supabase
      .from('pantry_items')
      .select('canonical_name')
      .eq('user_id', userId),
  ]);

  if (staplesResult.error) throw staplesResult.error;

  const ownedSet = new Set(
    (ownedResult.data ?? []).map((r: { canonical_name: string }) => r.canonical_name),
  );

  return (staplesResult.data ?? []).map((row: { canonical_name: string; unit: string | null }) => ({
    canonical_name: row.canonical_name,
    unit: row.unit ?? '',
    owned: ownedSet.has(row.canonical_name),
  }));
}
