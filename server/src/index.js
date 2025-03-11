const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./authRoutes");

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});