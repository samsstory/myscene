import { supabase } from "@/integrations/supabase/client";

/**
 * Delete a show and all its related records (tags, artists, rankings, comparisons).
 * This is the single source of truth for show deletion logic.
 * Throws on failure.
 */
export async function deleteShowById(showId: string): Promise<void> {
  // Delete child records first (order matters for FK constraints)
  await supabase.from('show_tags').delete().eq('show_id', showId);
  await supabase.from('show_artists').delete().eq('show_id', showId);
  await supabase.from('show_rankings').delete().eq('show_id', showId);
  await supabase.from('show_comparisons').delete().or(`show1_id.eq.${showId},show2_id.eq.${showId}`);

  const { error } = await supabase.from('shows').delete().eq('id', showId);
  if (error) throw error;
}
