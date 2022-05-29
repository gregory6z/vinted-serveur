const express = require("express");
const router = express.Router();

const Offer = require("../models/Offer");

const isAuthenticated = require("../middlewares/isAuthenticated");

const cloudinary = require("../config/cloudinary");

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, description, price, condition, city, brand, size, color } =
      req.fields;

    if (
      title ||
      description ||
      price ||
      condition ||
      city ||
      brand ||
      size ||
      color
    ) {
      res.status(400).json({ error: "manque des informations" });
    }

    if (title.length > 50) {
      return res
        .status(400)
        .json({ error: "The product title is too long, max characters 50" });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        error: "The product description is too long, max characters 5000",
      });
    }
    if (price > 100000 && price > 0) {
      return res.status(400).json({
        error: "The product price shoud less than 100 000",
      });
    }

    const newOffer = await new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        { MARQUE: brand },
        { TAILLE: size },
        { ETAT: condition },
        { COULEUR: color },
        { EMPLACEMENT: city },
      ],
      owner: req.user,
    });

    const pictureToUpload = req.files.picture.path;

    const image = await cloudinary.uploader.upload(pictureToUpload, {
      folder: `/vinted/offers/${newOffer._id}`,
    });

    newOffer.product_image = image.secure_url;

    await newOffer.save();

    res.status(200).json(newOffer);
  } catch (err) {
    res.status(401).json(err);
  }
});

router.put("/update/:id", isAuthenticated, async (req, res) => {
  const offerToUpdate = await Offer.findById(req.params.id);

  const { title, description, price, condition, city, brand, size, color } =
    req.fields;

  if (title) {
    offerToUpdate.product_name = title;
  }
  if (description) {
    offerToUpdate.product_description = description;
  }
  if (price) {
    offerToUpdate.product_price = price;
  }

  if (brand) {
    offerToUpdate.product_details[0]["MARQUE"] = brand;
  }
  if (size) {
    offerToUpdate.product_details[1]["TAILLE"] = size;
  }
  if (condition) {
    offerToUpdate.product_details[2]["ETAT"] = condition;
  }
  if (color) {
    offerToUpdate.product_details[3]["COULEUR"] = color;
  }
  if (city) {
    offerToUpdate.product_details[4]["EMPLACEMENT"] = city;
  }

  if (req.files.picture) {
    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      public_id: `/api/vinted/offers/${offerToModify._id}/preview`,
    });
    offerToModify.product_image = result;
  }

  await offerToUpdate.save();

  res.status(200).json({ message: "this offer is updated" });
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const offerToDelete = await Offer.findById(req.fields._id);

    if (!offerToDelete) {
      res.status(400).json({ message: "This offer does not exists" });
    }
    await offerToDelete.remove();
    await cloudinary.api.delete_all_resources(`/offers/${offerToDelete._id}`);
    await cloudinary.api.delete_folder(`/offers/${offerToDelete._id}`);

    res.status(200).json({ message: "Your offer has been deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
    let { page, title, priceMin, priceMax, sort, limit } = req.query;
    const filter = {};

    if (title) {
      filter.product_name = new RegExp(title, "i");
    }
    if (priceMin || priceMax) {
      filter.product_price = {};
      if (priceMax) {
        filter.product_price.$lte = Number(priceMax);
      }
      if (priceMin) {
        filter.product_price.$gte = Number(priceMin);
      }
    }
    if (sort) {
      sort = { product_price: sort.replace("price-", "") };
    }
    if (!limit || Number(limit) < 1) {
      limit = 5;
    }
    if (!page || Number(page) < 1) {
      page = 1;
    }
    const offers = await Offer.find(filter)
      .populate({
        path: "owner",
        select: "account",
      })
      .sort(sort)
      .skip(Number(limit) * (Number(page) - 1))
      .limit(Number(limit));

    const count = await Offer.countDocuments(filter);

    res.status(200).json({ count: count, offers: offers });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });

    if (!offer) {
      return res.status(404).json({ message: "This product id not found" });
    }

    res.status(200).json(offer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
