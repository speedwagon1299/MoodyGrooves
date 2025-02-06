// Handles API requests to Flask backend

const API_URL = "http://127.0.0.1:5000";

// get_spotify_auth_url()
export const loginWithSpotify = async () => {
    window.location.href = `${API_URL}/login`;
};

// get_spotify_auth_url()
export const getPlaylists = async (token) => {
    const response = await fetch(`${API_URL}/get_playlists`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    return response.json();
};

// filter_songs()
export const filterSongs = async (playlists, genre, token) => {
    const response = await fetch(`${API_URL}/filter_songs`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ playlists, genre })
    });
    return response.json();
};

// create()
export const createPlaylist = async (trackUris, token) => {
    const response = await fetch(`${API_URL}/create_playlist`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ track_uris: trackUris })
    });
    return response.json();
};
