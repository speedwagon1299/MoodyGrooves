from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
import os
import requests
from config import SECRET_KEY
from spotify_api import get_spotify_auth_url, handle_spotify_callback, get_user_playlists, filter_songs, create_playlist

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests
app.secret_key = SECRET_KEY 

@app.route("/login")
def login():
    return redirect(get_spotify_auth_url())

@app.route("/callback")
def callback():
    return handle_spotify_callback()

@app.route("/get_playlists")
def get_playlists():
    return jsonify(get_user_playlists())

@app.route("/filter_songs", methods=["POST"])
def filter():
    data = request.json
    return jsonify(filter_songs(data["playlists"], data["genre"]))

@app.route("/create_playlist", methods=["POST"])
def create():
    data = request.json
    return jsonify(create_playlist(data["track_uris"]))

if __name__ == "__main__":
    app.run(debug=True)
