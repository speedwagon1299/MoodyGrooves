export interface PlaylistImage {
  url?: string
  height?: number | null
  width?: number | null
}

export interface Playlist {
  id: string
  name: string
  description?: string | null
  images: PlaylistImage[]
  tracks?: { href?: string, total?: number }
  owner?: { display_name?: string; id?: string }
}

export interface TrackInfo {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
}

export type LocationState = {
  hrefs?: string[]
}