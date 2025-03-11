import React, { useEffect, useState } from 'react';

const Playlists = ({ accessToken }) => {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (accessToken) {
      fetch("https://api.spotify.com/v1/me/playlists", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          setPlaylists(data.items); // Mettre à jour l'état avec les playlists
        })
        .catch(error => console.error("Erreur lors de la récupération des playlists", error));
    }
  }, [accessToken]);

  return (
    <div>
      <h2>Mes Playlists</h2>
      {playlists.length > 0 ? (
        <ul>
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <a href={playlist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                <img src={playlist.images[0]?.url} alt={playlist.name} width="50" />
                {playlist.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucune playlist trouvée</p>
      )}
    </div>
  );
};

export default Playlists;
