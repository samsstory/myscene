import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if the URL points to a user-uploaded photo in Supabase storage
 * (as opposed to a platform-sourced artist image from Spotify/Edmtrain).
 */
export function isUserUploadedImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("supabase") && url.includes("show-photos")) return true;
  if (url.includes("lovable.app/images/") || url.includes("lovableproject.com/images/")) return true;
  return false;
}

/**
 * Looks up a platform-sourced artist image from show_artists table.
 * Returns the first non-user-uploaded artist_image_url found, or undefined.
 */
export async function resolveArtistImage(artistName: string): Promise<string | undefined> {
  try {
    const { data } = await supabase
      .from("show_artists")
      .select("artist_image_url")
      .ilike("artist_name", artistName)
      .not("artist_image_url", "is", null)
      .limit(10);

    if (!data) return undefined;

    // Return the first image that isn't a user upload
    for (const row of data) {
      if (row.artist_image_url && !isUserUploadedImage(row.artist_image_url)) {
        return row.artist_image_url;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}
