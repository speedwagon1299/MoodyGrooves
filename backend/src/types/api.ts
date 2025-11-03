export type CurrentUserPlaylists = SpotifyApi.ListOfCurrentUsersPlaylistsResponse;

export type PlaylistTracksPage = {
  items: Array<{
    track: {
      name?: string;
      artists?: Array<{ name?: string }>;
    } | null;
  }>;
  next?: string | null;
  limit?: number;
  offset?: number;
};