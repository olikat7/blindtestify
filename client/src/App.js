import React, { useEffect, useState } from "react";
import SpotifyPlayer from './components/SpotifyPlayer';
import './App.css';

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // Récupérer le token d'accès de l'URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('access_token');
    
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Faire un appel à l'API Spotify une fois le token disponible
  useEffect(() => {
    if (accessToken) {
      fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          setUserProfile(data); // Sauvegarder les données du profil utilisateur
        })
        .catch(error => console.error("Error fetching user data", error));
    }
  }, [accessToken]);

  return (
    <div className="spotify-player">

      {!accessToken ? (
        <a href={`${API_URL}/auth/login`}>
          <button>Se connecter à Spotify</button>
        </a>
      ) : (
        <div>
          <SpotifyPlayer accessToken={accessToken} />
        </div>
      )}
    </div>    
  );
}

export default App;
