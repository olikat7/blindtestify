import React, { useState, useEffect } from 'react';

const SpotifyPlayer = ({ accessToken }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [isBlurred, setIsBlurred] = useState(true);
  const [isTextBlurred, setIsTextBlurred] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  const PLAYLIST_URI = 'spotify:playlist:7qIjKM4EBB0V8oAxBHKg4L';





  const resetSpotifySession = async () => {
    if (!accessToken) return;
  
    try {
        console.log("⏹️ Déconnexion de tous les appareils Web Player...");
  
        // 🔹 **Forcer Spotify à oublier le Web Player en arrêtant la lecture**
        await fetch(`https://api.spotify.com/v1/me/player/pause`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
  
        // 🗑 **Vider la file d'attente**
        await fetch(`https://api.spotify.com/v1/me/player/queue`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
  
        // 🔄 **Forcer un changement de device temporaire pour réinitialiser la session**
        const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
  
        const data = await response.json();
        if (data.devices.length > 0) {
            const otherDevice = data.devices.find(d => d.id !== deviceId);
            if (otherDevice) {
                await fetch(`https://api.spotify.com/v1/me/player/transfer`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    body: JSON.stringify({ device_ids: [otherDevice.id], play: false })
                });
                console.log("✅ Session transférée temporairement à un autre appareil.");
            }
        }
  
        // 🔥 **Attendre 2 secondes pour que Spotify prenne en compte la réinitialisation**
        await new Promise(resolve => setTimeout(resolve, 2000));
  
        console.log("♻️ Web Player réinitialisé !");
    } catch (error) {
        console.error("❌ Erreur lors de la réinitialisation des sessions Web Player:", error);
    }
  };

  

  const enableShuffle = async (deviceId) => {
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    console.log('✅ Mode shuffle activé');
  };

  const playRandomTrack = async (deviceId) => {
    if (!accessToken || !deviceId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ context_uri: PLAYLIST_URI }),
      });
      console.log("🎵 Lecture aléatoire lancée");
    } catch (error) {
      console.error("❌ Erreur lors de la lecture aléatoire:", error);
    }
  };




  const fetchCurrentTrack = async () => {
    if (!accessToken) return;
  
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data && data.item) {
            const albumCoverSpotify = data.item.album.images[0]?.url || "";
            const albumId = data.item.album.id;  // Récupère l'ID de l'album
            const localCoverPath = `/albums/${albumId}.jpeg`; // 📂 Vérifie via l'ID de l'album
          // ✅ **Flouter le texte UNIQUEMENT si le morceau a changé**
          if (!trackInfo || trackInfo.name !== data.item.name) {
            setIsTextBlurred(true); // 🔹 Flouter uniquement au changement de morceau
          }
  
          setTrackInfo({
            name: data.item.name,
            artist: data.item.artists.map((artist) => artist.name).join(", "),
            albumName: data.item.album.name,
            albumReleaseYear: data.item.album.release_date.slice(0, 4),
            albumCoverSpotify,
            albumCoverId,
            albumId,
            localCoverPath,
          });
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du morceau en cours:", error);
    }
  };
  


// ⏭ Fonction pour mettre Pause ou Play
const togglePlayPause = async () => {
    if (!player || !accessToken || !deviceId) {
        console.log("Le lecteur n'est pas encore prêt.");
        return;
    }

    try {
        // Vérifier l'état du lecteur Spotify
        const state = await player.getCurrentState();
        if (!state) {
            console.warn("Aucun appareil actif détecté. Ouvrez Spotify sur votre téléphone et sélectionnez votre appareil.");
            alert("Aucun appareil actif trouvé. Assurez-vous que l'application Spotify est ouverte sur votre iPhone.");
            return;
        }

        if (isPlaying) {
            // ✅ Mettre en pause sans reflouter l'image
            await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            console.log('Lecture mise en pause');
        } else {
            // ✅ Reprendre la lecture
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            console.log("Lecture reprise.");
        }

        setIsPlaying(!isPlaying);

        /* ✅ Ne pas reflouter l'image après mise en pause
        setIsBlurred(isBlurred); 
        setIsTextBlurred(isTextBlurred);*/

    } catch (error) {
        console.error('Erreur lors du changement d’état de lecture:', error);
    }
};



// ⏭ Fonction pour aller au morceau suivant
const skipToNext = async () => {
  if (!accessToken || !deviceId) return;

  try {
      // Étape 1 : Baisser le volume à 0 avant de changer de morceau
      await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=0&device_id=${deviceId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      // Étape 2 : Passer au morceau suivant
      await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      // Étape 3 : Vérifier que le morceau a bien changé avant d'appliquer `seek`
      let trackReady = false;
      let attempts = 0;
      let trackDuration = 0;

      while (!trackReady && attempts < 10) {
          await new Promise(res => setTimeout(res, 500));
          const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
              headers: { 'Authorization': `Bearer ${accessToken}` },
          });

          if (response.ok) {
              const data = await response.json();
              if (data && data.progress_ms < 2000) {
                  trackReady = true;
                  trackDuration = data.item.duration_ms;
              }
          }
          attempts++;
      }

      // Étape 4 : Appliquer le seek à 30 secondes
      const randomStart = Math.floor(Math.random() * (trackDuration / 2)); // Aléatoire entre 0 et 50% de la durée
      console.log(`🎲 Démarrage aléatoire à ${randomStart / 1000}s sur un total de ${trackDuration / 1000}s`);

      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${randomStart}&device_id=${deviceId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      // Étape 5 : Relancer la lecture (toujours avec volume à 0)
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      // Étape 6 : Appliquer progressivement le volume pour un fade-in fluide
      for (let volume = 0; volume <= 100; volume += 10) {
          await new Promise(res => setTimeout(res, 100));
          await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}&device_id=${deviceId}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${accessToken}` },
          });
      }

      console.log('Lecture du morceau suivant à 30s avec fade-in');
      fetchCurrentTrack();
  } catch (error) {
      console.error('Erreur lors du passage au morceau suivant:', error);
  }
};



// ⏮ Fonction pour revenir au morceau précédent
const skipToPrevious = async () => {
  if (!accessToken || !deviceId) return;

  try {
    await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    fetchCurrentTrack(); // Met à jour la cover et les infos du morceau

    console.log('Morceau précédent');
  } catch (error) {
    console.error('Erreur lors du retour au morceau précédent:', error);
  }
};







  useEffect(() => {
    if (!accessToken) return;
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        const newPlayer = new window.Spotify.Player({
          name: "Web Player",
          getOAuthToken: (cb) => cb(accessToken),
          volume: 0.5
        });

        newPlayer.on("ready", async ({ device_id }) => {
          console.log("✅ Spotify Player prêt ! Device ID:", device_id);
          setDeviceId(device_id);
          await resetSpotifySession();
          await enableShuffle(device_id);
          await playRandomTrack(device_id);
        });

        newPlayer.on("player_state_changed", (state) => {
          if (state) {
            setIsPlaying(!state.paused);
            fetchCurrentTrack();
          }
        });

        newPlayer.connect();
        setPlayer(newPlayer);
      };
    };
  }, [accessToken]);



// 🔹 Surveiller le morceau en cours et flouter l’image si c'est une cover Spotify
useEffect(() => {
  if (trackInfo) {
    console.log("🎵 Nouveau morceau détecté → Vérification de l'image locale...");

    const img = new Image();
    img.src = `/albums/${trackInfo.albumId}.jpeg`; // 📂 Vérifie via l'ID de l'album

    img.onload = () => {
      console.log("✅ Image locale trouvée, pas de flou.");
      setIsBlurred(false); // ❗ Image locale nette
    };

    img.onerror = () => {
      console.log("❌ Image locale NON trouvée, flou appliqué.");
      setIsBlurred(true); // ❗ Flouter si l’image n’existe pas
    };
  }
}, [trackInfo]); // 🔄 Se déclenche à CHAQUE nouveau morceau







  return (
    <div className="spotify-player">
      {trackInfo && (
        <>
          <img
            src={showOriginal ? trackInfo.albumCoverSpotify : trackInfo.localCoverPath}
            alt="Cover album"
            className={isBlurred ? "blur" : "no-blur"}
            onClick={() => {
              setShowOriginal(!showOriginal);
              setIsBlurred(false);
              setIsTextBlurred(false);
            }}
          />

          <div
            className={`blur-container ${isTextBlurred ? "blur" : "no-blur"}`}
            onClick={() => setIsTextBlurred(false)}
          >
            <h2>{trackInfo.name}</h2>
            <p>{trackInfo.albumName} ({trackInfo.albumReleaseYear})</p>
            <h4>{trackInfo.artist}</h4>
          </div>

          {/* 🎵 Boutons de contrôle */}
          <div className="controls">
            <button onClick={skipToPrevious}>⏮</button>
            <button className="play-button" onClick={togglePlayPause}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={skipToNext}>⏭</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SpotifyPlayer;
