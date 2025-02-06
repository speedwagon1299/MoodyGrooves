import { useEffect, useState } from "react";
import { getPlaylists } from "../api/spotify";

function PlaylistSelection({ token, onSelect }) {
    const [playlists, setPlaylists] = useState([]);

    useEffect(() => {
        getPlaylists(token).then(setPlaylists);
    }, [token]);

    return (
        <div>
            <h2>Select a Playlist</h2>
            {playlists.length === 0 ? <p>Loading...</p> : playlists.map((playlist) => (
                <button key={playlist.id} onClick={() => onSelect(playlist.id)}>
                    {playlist.name}
                </button>
            ))}
        </div>
    );
}

export PlaylistSelection