import React, { useState, useEffect } from 'react';

const SpotifyPlayer = ({ accessToken }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);  
  const [trackInfo, setTrackInfo] = useState(null);
  const [isBlurred, setIsBlurred] = useState(true);
  const [debugLog, setDebugLog] = useState([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isTextBlurred, setIsTextBlurred] = useState(true);

  // Playlist à utiliser
  const DEFAULT_PLAYLIST_URI = 'spotify:playlist:7dSyZpWpn9ASoQIBUCJZ2g';




  // 🛠 Arrêter complètement la session actuelle
  const resetSpotifySession = async () => {
  if (!accessToken) return;

  try {
      console.log("⏹️ Déconnexion de tous les appareils Web Player...");

      // 🔹 **Forcer Spotify à oublier le Web Player en arrêtant la lecture**
      await fetch(`https://api.spotify.com/v1/me/player/pause`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log("⏸️ Lecture mise en pause.");

      // 🗑 **Forcer Spotify à vider la file d’attente**
      await fetch(`https://api.spotify.com/v1/me/player/queue`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log("🗑️ File d'attente supprimée.");

      // 🔄 **Vérifier et supprimer les anciens Web Player pour éviter les conflits**
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (data.devices.length > 0) {
          for (const device of data.devices) {
              if (device.name.includes("Web Player") && device.id !== deviceId) {
                  await fetch(`https://api.spotify.com/v1/me/player/transfer`, {
                      method: 'PUT',
                      headers: { 'Authorization': `Bearer ${accessToken}` },
                      body: JSON.stringify({ device_ids: [device.id], play: false })
                  });
                  console.log(`🔄 Ancien Web Player déconnecté : ${device.id}`);
              }
          }
      }

      // 🔥 **Attendre 2 secondes pour que la session soit bien réinitialisée**
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log("♻️ Web Player réinitialisé !");
  } catch (error) {
      console.error("❌ Erreur lors de la réinitialisation des sessions Web Player:", error);
  }
};





// 🔹 Surveiller la fermeture de l'onglet pour reset la session
useEffect(() => {
    const handleBeforeUnload = async () => {
        await resetSpotifySession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
    };
}, []); // ❗ Exécuté UNE SEULE FOIS pour attacher l'événement



// 🔹 Surveiller le morceau en cours et le flouter au changement
useEffect(() => {
  if (accessToken && deviceId) {
      fetchCurrentTrack();
  }
}, [accessToken, deviceId]); // ✅ Exécuté lorsque `accessToken` ou `deviceId` change





  // Fonction pour extraire l'ID de la pochette depuis l'URL Spotify
  const extractImageId = (imageUrl) => {
    return imageUrl ? imageUrl.split("/").pop() : null;
  };





const playRandomTrack = async (deviceId) => {
  if (!accessToken || !deviceId) return;

  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/4zlxNfdlDOM5OnGv2TaPUP/tracks`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error("Impossible de récupérer la playlist.");

    const data = await response.json();
    const tracks = data.items.map(item => item.track.uri);

    // **Supprimer les doublons et sélectionner un morceau qui n'a PAS été joué**
    const uniqueTracks = [...new Set(tracks)];
    const randomIndex = Math.floor(Math.random() * uniqueTracks.length);
    const randomTrack = uniqueTracks[randomIndex];

    // **Lancer la lecture du morceau sélectionné**
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ uris: [randomTrack] }),
    });

    console.log("🎵 Lecture d’un NOUVEAU morceau aléatoire :", randomTrack);

  } catch (error) {
    console.error("❌ Erreur lors de la lecture aléatoire :", error);
  }
};






  
  const startDefaultPlaylist = async () => {
    if (!accessToken || !deviceId) return;

    try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
                context_uri: DEFAULT_PLAYLIST_URI,
                offset: { position: 0 }, // Démarrer au début de la playlist
            }),
        });

        console.log(`✅ Playlist de démarrage lancée : ${DEFAULT_PLAYLIST_URI}`);
        fetchCurrentTrack(); // Met à jour l'affichage
    } catch (error) {
        console.error("❌ Erreur lors du démarrage de la playlist :", error);
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
        const albumCoverId = extractImageId(albumCoverSpotify);
        const localCoverPath = `/albums/${albumCoverId}.jpeg`; // 📂 Vérification dans public/albums/

                // ✅ **🔹 Remettre le flou UNIQUEMENT si le morceau a changé**
                if (!trackInfo || trackInfo.name !== data.item.name) {
                  setIsBlurred(true);
                  setIsTextBlurred(true);
              }

        setTrackInfo({
          name: data.item.name,
          artist: data.item.artists.map((artist) => artist.name).join(", "),
          albumName: data.item.album.name,
          albumReleaseYear: data.item.album.release_date.slice(0, 4),
          albumCoverSpotify,
          albumCoverId,
          localCoverPath,
        });
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du morceau en cours:", error);
  }
};





useEffect(() => {
  if (trackInfo) {
    console.log("🎵 Nouveau morceau détecté → Vérification de l'image locale...");

    // 🔹 Vérifier si une image locale existe
    const img = new Image();
    img.src = trackInfo.localCoverPath;

    img.onload = () => {
      console.log("✅ Image locale trouvée, pas de flou sur l'image.");
      setIsBlurred(false); // L’image locale est nette
    };

    img.onerror = () => {
      console.log("❌ Image locale NON trouvée, flou sur l'image.");
      setIsBlurred(true); // L’image Spotify est floutée
    };

    // 🔹 **TOUJOURS flouter le texte au début du morceau**
    setIsTextBlurred(true);
    setShowOriginal(false); // Toujours afficher l'image locale au départ
  }
}, [trackInfo]); // 🔄 Se déclenche à CHAQUE nouveau morceau






  

  // 🔹 Déflouter la cover et afficher la version originale de Spotify
  const handleUnblur = () => {
    setIsBlurred(false);
  };


  

// Fonction pour activer le mode shuffle via l'API de Spotify
const enableShuffle = async (deviceId) => {
    const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });  
    if (!response.ok) {
      console.error('Erreur lors de l\'activation du mode shuffle');
    } else {
      console.log('Mode shuffle activé');
    }
  };




  
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

        // ✅ Ne pas reflouter l'image après mise en pause
        setIsBlurred(isBlurred); 
        setIsTextBlurred(isTextBlurred);

    } catch (error) {
        console.error('Erreur lors du changement d’état de lecture:', error);
    }
};







const fadeInVolume = async () => {
    if (!accessToken || !deviceId) return;

    try {
        await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=0&device_id=${deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        // Augmenter progressivement le volume en 1 seconde
        for (let volume = 0; volume <= 100; volume += 10) {
            await new Promise(res => setTimeout(res, 100)); // Attente de 100ms entre chaque palier
            await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}&device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
        }

        console.log('Fondu en ouverture terminé');
    } catch (error) {
        console.error('Erreur lors du fondu en ouverture:', error);
    }
};




 // Vérification en temps réel si un morceau démarre à 0s pour appliquer seek à 30s
  useEffect(() => {
    if (!accessToken || !deviceId) return;

    const checkAndSeek = async () => {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.progress_ms < 2000) {
            console.log("Le morceau a commencé à 0s, repositionnement à 30s...");

            const trackDuration = data.item.duration_ms; // Durée totale du morceau en millisecondes
            const randomStart = Math.floor(Math.random() * (trackDuration / 2)); // Aléatoire entre 0 et 50% de la durée
            console.log(`🎲 Démarrage aléatoire à ${randomStart / 1000}s sur un total de ${trackDuration / 1000}s`);

            // Appliquer immédiatement le seek
            await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${randomStart}&device_id=${deviceId}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${accessToken}` },
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du morceau en cours:', error);
      }
    };

    const interval = setInterval(checkAndSeek, 500);
    return () => clearInterval(interval);
  }, [accessToken, deviceId]);



  useEffect(() => {
    if (accessToken && deviceId) {
        startDefaultPlaylist();
    }
}, [accessToken, deviceId]);



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






  // Fonction pour revenir au morceau précédent
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



 






  // 🎵 Initialisation du Spotify Web Playback SDK
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
      
          // 1️⃣ **Réinitialisation complète AVANT d'activer la lecture**
          await resetSpotifySession();
      
          // 2️⃣ **Activer le mode shuffle après réinitialisation**
          await enableShuffle(device_id);
      
          // 3️⃣ **Attendre un peu pour éviter les conflits avec la file d'attente**
          await new Promise(resolve => setTimeout(resolve, 1000));
      
          // 4️⃣ **Forcer un morceau aléatoire immédiatement**
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

    return () => player && player.disconnect();
  }, [accessToken]);




return (
    <div className="spotify-player">
      {trackInfo && (
        <>

{/* 🔹 Image de l'album (locale ou Spotify) */}
<img
  src={showOriginal ? trackInfo.albumCoverSpotify : trackInfo.localCoverPath} 
  onError={(e) => {
    e.target.onerror = null; 
    e.target.src = trackInfo.albumCoverSpotify; 
    setIsBlurred(true); // Si l’image locale ne charge pas, flouter
  }}
  alt="Cover album"
  className={isBlurred ? "blur" : "no-blur"} // 🔥 Seulement flouter si pas de fichier local
  onClick={() => {
    setShowOriginal(!showOriginal);
    setIsBlurred(false); // ❗ Défloutage de l’image
    setIsTextBlurred(false); // ❗ Défloutage du texte aussi
  }}
/>

{/* 🔹 Infos du morceau (Titre, Album, Artiste) */}
<div
  className={`blur-container ${isTextBlurred ? "blur" : "no-blur"}`} 
  onClick={() => setIsTextBlurred(false)} // ❗ Déflouter en cliquant sur le texte
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
