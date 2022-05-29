require("dotenv").config();
const express = require("express");
const formidable = require("express-formidable");
const cors = require("cors");

const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(formidable());

mongoose.connect(process.env.MONGODB_URI);

const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");

app.use(userRoutes);
app.use(offerRoutes);

app.all("*", (req, res) => {
  res.status(404).json("Route introuvable");
});

app.listen(process.env.PORT, () => {
  console.log("Server started");
});
