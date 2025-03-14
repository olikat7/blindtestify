import React, { useState, useEffect } from 'react';

const SpotifyPlayer = ({ accessToken }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [isBlurred, setIsBlurred] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isTextBlurred, setIsTextBlurred] = useState(true);

  const PLAYLIST_URI = 'spotify:playlist:4zlxNfdlDOM5OnGv2TaPUP';

  // 🔄 Réinitialisation des sessions Spotify pour éviter les conflits
  const resetSpotifySession = async () => {
    if (!accessToken) return;
    try {
      console.log('⏹️ Arrêt de la lecture en cours...');
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('✅ Session réinitialisée');
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation de la session:', error);
    }
  };

  // 🔀 Activer le mode shuffle
  const enableShuffle = async () => {
    if (!accessToken || !deviceId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('🔀 Mode shuffle activé');
    } catch (error) {
      console.error('❌ Erreur lors de l'activation du mode shuffle:', error);
    }
  };

  // 🎵 Lecture aléatoire d'un morceau
  const playRandomTrack = async () => {
    if (!accessToken || !deviceId) return;
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/4zlxNfdlDOM5OnGv2TaPUP/tracks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      const tracks = data.items.map((item) => item.track.uri);
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ uris: [randomTrack] }),
      });
      console.log('🎵 Lecture d’un morceau aléatoire');
    } catch (error) {
      console.error('❌ Erreur lors de la lecture aléatoire:', error);
    }
  };

  // 🔍 Récupération des infos du morceau en cours
  const fetchCurrentTrack = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.item) {
          setTrackInfo({
            name: data.item.name,
            artist: data.item.artists.map((artist) => artist.name).join(', '),
            albumName: data.item.album.name,
            albumCover: data.item.album.images[0]?.url || '',
          });
          setIsBlurred(true);
          setIsTextBlurred(true);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du morceau en cours:', error);
    }
  };

  // ▶⏸ Contrôle du lecteur
  const togglePlayPause = async () => {
    if (!accessToken || !deviceId) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.is_playing) {
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log('⏸ Lecture mise en pause');
      } else {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log('▶ Lecture reprise');
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('❌ Erreur lors du changement d’état de lecture:', error);
    }
  };

  // 🎵 Initialisation du Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken) return;
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        const newPlayer = new window.Spotify.Player({
          name: 'Web Player',
          getOAuthToken: (cb) => cb(accessToken),
          volume: 0.5,
        });

        newPlayer.on('ready', async ({ device_id }) => {
          console.log('✅ Spotify Player prêt ! Device ID:', device_id);
          setDeviceId(device_id);
          await resetSpotifySession();
          await enableShuffle();
          await playRandomTrack();
        });

        newPlayer.on('player_state_changed', (state) => {
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
    <div className='spotify-player'>
      {trackInfo && (
        <>
          <img
            src={showOriginal ? trackInfo.albumCover : trackInfo.albumCover}
            alt='Cover album'
            className={isBlurred ? 'blur' : 'no-blur'}
            onClick={() => {
              setShowOriginal(!showOriginal);
              setIsBlurred(false);
              setIsTextBlurred(false);
            }}
          />
          <div className={`blur-container ${isTextBlurred ? 'blur' : 'no-blur'}`} onClick={() => setIsTextBlurred(false)}>
            <h2>{trackInfo.name}</h2>
            <p>{trackInfo.albumName}</p>
            <h4>{trackInfo.artist}</h4>
          </div>
          <div className='controls'>
            <button onClick={togglePlayPause}>{isPlaying ? '⏸' : '▶'}</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SpotifyPlayer;
