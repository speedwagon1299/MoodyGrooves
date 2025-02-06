import { useState } from "react";
import Login from "./components/Login";
import PlaylistSelection from "./components/PlaylistSelection";
import FilterSongs from "./components/FilterSongs";
import CreatePlaylist from "./components/CreatePlaylist";

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [selectedPlaylists, setSelectedPlaylists] = useState([]);
    const [filteredTracks, setFilteredTracks] = useState([]);
    const [playlistUrl, setPlaylistUrl] = useState("");

    return (
        <div>
            {!user ? <Login setUser={setUser} /> :
                <div>
                    <PlaylistSelection token={token} onSelect={(id) => setSelectedPlaylists([...selectedPlaylists, id])} />
                    {selectedPlaylists.length > 0 &&
                        <FilterSongs playlists={selectedPlaylists} token={token} onFilter={setFilteredTracks} />}
                    {filteredTracks.length > 0 &&
                        <CreatePlaylist trackUris={filteredTracks.map(track => track.uri)} token={token} onComplete={setPlaylistUrl} />}
                    {playlistUrl && <a href={playlistUrl} target="_blank" rel="noopener noreferrer">Open Playlist</a>}
                </div>
            }
        </div>
    );
}

export default App;