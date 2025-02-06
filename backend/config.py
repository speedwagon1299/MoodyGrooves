import os
from dotenv import load_dotenv

load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY", "ebab41ec37bd5ca64d61a3e0ae82463a990747ea2424a0878b51ebcbabc74920")  # Default if not set
REDIRECT_URI = "http://127.0.0.1:5000/callback"
