const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./authRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Utiliser le port fourni par Render

app.use(cors());
app.use("/auth", authRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});