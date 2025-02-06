import { useState } from "react";
import { filterSongs } from "../api/spotify";

function FilterSongs({ playlists, token, onFilter }) {
    const [genre, setGenre] = useState("");

    const handleFilter = async () => {
        const result = await filterSongs(playlists, genre, token);
        onFilter(result.filtered_tracks);
    };

    return (
        <div>
            <h2>Enter Genre</h2>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} />
            <button onClick={handleFilter}>Filter Songs</button>
        </div>
    );
}

export default FilterSongs;