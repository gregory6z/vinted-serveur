const express = require("express");
const router = express.Router();

const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../models/User");

const cloudinary = require("../config/cloudinary");

router.post("/user/signup", async (req, res) => {
  try {
    const userAlreadyExists = await User.findOne({ email: req.fields.email });

    if (!req.fields.username || !req.fields.password || !req.fields.email) {
      return res.status(400).json({
        Error: "L'email, password ou l`username est manquant",
      });
    }

    if (userAlreadyExists) {
      return res.status(400).json({
        Error:
          "l'email renseigné lors de l'inscription existe déjà dans la base de données",
      });
    }

    const salt = uid2(16);
    const token = uid2(64);
    const hash = SHA256(salt + req.fields.password).toString(encBase64);

    const newUser = new User({
      email: req.fields.email,
      account: {
        username: req.fields.username,
        phone: req.fields.phone,
      },
      token: token,
      hash: hash,
      salt: salt,

      newsletter: req.fields.newsletter,
    });

    const avatarUpload = req.files.avatar.path;

    const result = await cloudinary.uploader.upload(avatarUpload, {
      folder: `/vinted/avatar/${newUser._id}`,
    });

    newUser.account.avatar = result.secure_url;

    await newUser.save();

    res.status(200).json({
      _id: newUser._id,
      token: newUser.token,
      account: {
        username: newUser.account.username,
        phone: newUser.account.phone,
      },
    });
  } catch (err) {
    res.status(401).json(err);
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.fields.email });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Utilisateur ou mot de passe erroné" });
    }

    const newHash = SHA256(user.salt + req.fields.password).toString(encBase64);

    if (newHash !== user.hash) {
      return res
        .status(401)
        .json({ error: "Utilisateur ou mot de passe erroné" });
    }

    return res.status(201).json({
      _id: user._id,
      token: user.token,
      account: {
        username: user.account.username,
      },
    });
  } catch (err) {
    res.status(400).json(err);
  }
});

module.exports = router;
