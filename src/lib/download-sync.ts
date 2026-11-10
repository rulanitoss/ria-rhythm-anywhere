import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/lib/music";

/** Synced list stores track info only; audio files stay on each device. */
export async function syncSaved(userId: string, track: Track) {
  await supabase.from("synced_downloads").upsert({ user_id: userId, track_id: track.id, track: track as any });
}

export async function syncRemoved(userId: string, id: string) {
  await supabase.from("synced_downloads").delete().eq("user_id", userId).eq("track_id", id);
}

export async function syncedTracks(): Promise<Track[]> {
  const { data } = await supabase.from("synced_downloads").select("track").order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.track as unknown as Track);
}
