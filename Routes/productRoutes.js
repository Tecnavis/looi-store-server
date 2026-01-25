router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const product = new Product({
      name,
      price,
      maincategory: category,
      description,
      totalStock: stock || 0,
      coverImage: req.file.path, // ✅ Cloudinary URL
      sizes: [],
    });

    await product.save();
    return res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});
    }

    const product = new Product({
      name,
      price,
      category,
      description,
      stock,
      image: req.file.path, // ✅ Cloudinary URL
    });

    await product.save();
    return res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});
