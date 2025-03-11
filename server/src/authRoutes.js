const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
require("dotenv").config();

const router = express.Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;  // L'URL de callback

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// 1️⃣ Route pour rediriger l'utilisateur vers la page de login Spotify
router.get("/login", (req, res) => {
    const scope = "streaming user-read-email user-read-private playlist-read-private user-read-playback-state user-modify-playback-state";
    const authUrl = `${SPOTIFY_AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}`;
    res.redirect(authUrl);
});


// 2️⃣ Callback après l'authentification Spotify
router.get("/callback", async (req, res) => {
    const code = req.query.code || null;

    if (!code) {
        return res.status(400).send("Erreur: Code d'autorisation manquant");
    }

    try {
        const response = await axios.post(
            SPOTIFY_TOKEN_URL,
            querystring.stringify({
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: "authorization_code",
            }),
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token } = response.data;

        // Ici, on stocke les tokens en session ou en base de données (à améliorer)
        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // Fallback en local
        res.redirect(`${FRONTEND_URL}?access_token=${access_token}&refresh_token=${refresh_token}`);
        
    } catch (error) {
        console.error("Erreur d'authentification Spotify:", error);
        res.status(500).send("Erreur lors de l'authentification");
    }
});

module.exports = router;