import React, { useState, useEffect } from 'react';

const SpotifyPlayer = ({ accessToken }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [isBlurred, setIsBlurred] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isTextBlurred, setIsTextBlurred] = useState(true);

  const DEFAULT_PLAYLIST_URI = 'spotify:playlist:7dSyZpWpn9ASoQIBUCJZ2g';

  const resetSpotifySession = async () => {
    if (!accessToken) return;
    try {
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log('✅ Session Spotify réinitialisée.');
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation :', error);
    }
  };

  const enableShuffle = async (deviceId) => {
    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log('🔀 Mode shuffle activé');
    } catch (error) {
      console.error('❌ Erreur d'activation du shuffle :', error);
    }
  };

  const fetchCurrentTrack = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.item) {
          setTrackInfo({
            name: data.item.name,
            artist: data.item.artists.map(artist => artist.name).join(', '),
            albumName: data.item.album.name,
            albumReleaseYear: data.item.album.release_date.slice(0, 4),
            albumCoverSpotify: data.item.album.images[0]?.url || '',
          });
          setIsBlurred(true);
          setIsTextBlurred(true);
        }
      }
    } catch (error) {
      console.error('❌ Erreur de récupération du morceau :', error);
    }
  };

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
          getOAuthToken: cb => cb(accessToken),
          volume: 0.5,
        });

        newPlayer.on('ready', async ({ device_id }) => {
          console.log('✅ Spotify Player prêt ! Device ID:', device_id);
          setDeviceId(device_id);
          await resetSpotifySession();
          await enableShuffle(device_id);
          fetchCurrentTrack();
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
    <div className="spotify-player">
      {trackInfo && (
        <>
          <img
            src={showOriginal ? trackInfo.albumCoverSpotify : trackInfo.albumCoverSpotify}
            alt="Cover album"
            className={isBlurred ? "blur" : "no-blur"}
            onClick={() => {
              setShowOriginal(!showOriginal);
              setIsBlurred(false);
              setIsTextBlurred(false);
            }}
          />
          <div className={`blur-container ${isTextBlurred ? "blur" : "no-blur"}`} onClick={() => setIsTextBlurred(false)}>
            <h2>{trackInfo.name}</h2>
            <p>{trackInfo.albumName} ({trackInfo.albumReleaseYear})</p>
            <h4>{trackInfo.artist}</h4>
          </div>
          <div className="controls">
            <button>⏮</button>
            <button className="play-button">{isPlaying ? "⏸" : "▶"}</button>
            <button>⏭</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SpotifyPlayer;
