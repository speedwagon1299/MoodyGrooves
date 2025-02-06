import { signInWithPopup, auth, provider } from "../firebase";
import { loginWithSpotify } from "../api/spotify";

function Login({ setUser }) {
    const handleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            setUser(result.user);
            loginWithSpotify();
        } catch (error) {
            console.error(error);
        }
    };

    return <button onClick={handleLogin}>Login with Google & Spotify</button>;
}

export default Login;