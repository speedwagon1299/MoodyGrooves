import { createPlaylist } from "../api/spotify";

function CreatePlaylist({ trackUris, token, onComplete }) {
    const handleCreate = async () => {
        const result = await createPlaylist(trackUris, token);
        onComplete(result.playlist_url);
    };

    return <button onClick={handleCreate}>Create Playlist</button>;
}

export default CreatePlaylist;
