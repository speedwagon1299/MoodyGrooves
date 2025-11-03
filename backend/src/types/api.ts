export type CurrentUserPlaylists = SpotifyApi.ListOfCurrentUsersPlaylistsResponse;

export type PlaylistTracksPage = {
  items: Array<{
    track: {
      name?: string;
      artists?: Array<{ name?: string }>;
      href?: string;
    } | null;
  }>;
  next?: string | null;
  limit?: number;
  offset?: number;
};

export interface TrackInfo {
  id: string;
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
}