import requests
import os
from flask import session, redirect, jsonify, request
from config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI

TOKEN_URL = "https://accounts.spotify.com/api/token"


def get_spotify_auth_url():
    """
    Authenticate Spotify user and get authorization code
    """
    scope = "playlist-read-private playlist-modify-public"
    return f"https://accounts.spotify.com/authorize?client_id={SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri={REDIRECT_URI}&scope={scope}"


def handle_spotify_callback():
    """
    Handle Spotify callback and get access token
    """
    code = request.args.get("code")
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": SPOTIFY_CLIENT_ID,
        "client_secret": SPOTIFY_CLIENT_SECRET,
    }
    response = requests.post(TOKEN_URL, data=token_data)
    session["token"] = response.json()

    # Redirect to React frontend
    return redirect("http://localhost:3000") 


def get_user_playlists():
    """
    Get user's playlists (public and private)
    Based on: https://developer.spotify.com/documentation/web-api/reference/get-list-users-playlists
    """
    token = session.get("token", {}).get("access_token")
    if not token:
        return {"error": "Not logged in"}, 401

    url = "https://api.spotify.com/v1/me/playlists"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)

    return response.json()

# TODO: implement filter
def filter_songs(selected_playlists, genre):
    """
    Filter songs based on genre in each selected playlist
    Based on: https://developer.spotify.com/documentation/web-api/reference/get-playlists-tracks
    """
    token = session.get("token", {}).get("access_token")
    if not token:
        return {"error": "Not logged in"}, 401

    filtered_tracks = []
    for playlist_id in selected_playlists:
        url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers).json()

        for item in response.get("items", []):
            track = item.get("track", {})
            filtered_tracks.append(track)

    return {"filtered_tracks": filtered_tracks}

def create_playlist(track_uris):
    """
    Create a playlist using the filtered tracks
    Based on: https://developer.spotify.com/documentation/web-api/reference/create-playlist
              https://developer.spotify.com/documentation/web-api/reference/add-tracks-to-playlist
    """
    token = session.get("token", {}).get("access_token")
    if not token:
        return {"error": "Not logged in"}, 401

    user_url = "https://api.spotify.com/v1/me"
    user_data = requests.get(user_url, headers={"Authorization": f"Bearer {token}"}).json()
    user_id = user_data.get("id")

    # Create new playlist
    url = f"https://api.spotify.com/v1/users/{user_id}/playlists"
    playlist_data = {"name": "Filtered Playlist", "public": True}
    response = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json=playlist_data)
    playlist_id = response.json().get("id")

    # Add songs
    add_tracks_url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    requests.post(add_tracks_url, headers={"Authorization": f"Bearer {token}"}, json={"uris": track_uris})

    return {"playlist_url": f"https://open.spotify.com/playlist/{playlist_id}"}
