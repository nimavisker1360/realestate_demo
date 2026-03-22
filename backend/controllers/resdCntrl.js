import asyncHandler from "express-async-handler";
import { prisma, getMongoDb } from "../config/prismaConfig.js";
import { ObjectId } from "mongodb";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "TRY"];

const normalizeCurrency = (currencyCode) => {
  const normalized = String(currencyCode || "").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : "USD";
};

const normalizeListingStatus = (listingStatus, projectStatus) => {
  const status = String(listingStatus || "")
    .toLowerCase()
    .trim();
  if (["ready", "hazir", "tamamlandi", "completed"].includes(status)) {
    return "ready";
  }
  if (
    [
      "offplan",
      "off-plan",
      "off plan",
      "devam-ediyor",
      "devam ediyor",
      "under construction",
      "under-construction",
      "insaat halinde",
      "insaat-halinde",
    ].includes(status)
  ) {
    return "offplan";
  }

  const project = String(projectStatus || "")
    .toLowerCase()
    .trim();
  if (["tamamlandi", "completed", "ready"].includes(project)) {
    return "ready";
  }
  if (
    ["devam-ediyor", "devam ediyor", "under construction", "off-plan", "offplan"].includes(
      project
    )
  ) {
    return "offplan";
  }
  return null;
};

const normalizeLookupIdentifier = (value) => {
  const raw = String(value || "").trim();
  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    return raw;
  }
};

const extractObjectIdCandidate = (identifier) => {
  if (!identifier) return null;
  if (ObjectId.isValid(identifier)) return identifier;
  const match = identifier.match(/([a-fA-F0-9]{24})$/);
  if (match && ObjectId.isValid(match[1])) return match[1];
  return null;
};

export const createResidency = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    description_en,
    description_tr,
    description_ru,
    price,
    currency,
    address,
    city,
    country,
    image,
    images,
    videos,
    facilities,
    propertyType,
    category,
    userEmail,
    consultantId,
    interiorFeatures,
    exteriorFeatures,
    muhitFeatures,
    // Turkish real estate fields
    listingNo,
    listingDate,
    area,
    rooms,
    buildingAge,
    floor,
    totalFloors,
    heating,
    bathrooms,
    kitchen,
    balcony,
    elevator,
    parking,
    furnished,
    usageStatus,
    siteName,
    dues,
    mortgageEligible,
    deedStatus,
    // Land/Arsa features
    imarDurumu,
    altyapiFeatures,
    konumFeatures,
    genelOzellikler,
    manzaraFeatures,
    // Yurt İçi Proje (Local Project) specific fields
    projectName,
    ilanNo,
    projeHakkinda,
    dairePlanlari,
    vaziyetPlani,
    brochureUrl,
    iletisim,
    ozellikler,
    kampanya,
    mapImage,
    deliveryDate,
    projectStatus,
    listingStatus,
    gyo,
    // Project-specific features (Özellikler tabs)
    binaOzellikleri,
    disOzellikler,
    engelliYasliUygun,
    eglenceAlisveris,
    guvenlik,
    manzara,
    muhit,
  } = req.body.data;

  console.log("========================================");
  console.log("🏠 Creating Residency...");
  console.log("Title:", title);
  console.log("Address:", address);
  console.log("City:", city);
  console.log("Price:", price);
  console.log("Currency:", normalizeCurrency(currency));
  console.log("Property Type:", propertyType);
  console.log("Category:", category);
  console.log("Owner Email:", userEmail);
  console.log("Consultant ID:", consultantId || "Not assigned");
  console.log("Images count:", images?.length || 1);
  console.log("Rooms:", rooms);
  console.log("Area:", area);

  try {
    // Use MongoDB directly to support all fields including category
    const db = await getMongoDb();

    // First check if user exists
    const user = await db.collection("User").findOne({ email: userEmail });
    if (!user) {
      console.log("⚠️  User not found:", userEmail);
      console.log("========================================");
      return res.status(404).send({
        message: "User not found. Please register the user first.",
      });
    }

    const residencyData = {
      title,
      description,
      description_en: description_en || null,
      description_tr: description_tr || null,
      description_ru: description_ru || null,
      price,
      currency: normalizeCurrency(currency),
      address,
      city,
      country,
      image,
      images: images || [image],
      videos: videos || [],
      facilities,
      propertyType: propertyType || "sale",
      category: category || "residential",
      userEmail,
      consultantId: consultantId || null,
      interiorFeatures: interiorFeatures || [],
      exteriorFeatures: exteriorFeatures || [],
      muhitFeatures: muhitFeatures || [],
      // Turkish real estate fields
      listingNo: listingNo || null,
      listingDate: listingDate ? new Date(listingDate) : null,
      area: area || null,
      rooms: rooms || null,
      buildingAge: buildingAge || null,
      floor: floor !== undefined ? floor : null,
      totalFloors: totalFloors || null,
      heating: heating || null,
      bathrooms: bathrooms || facilities?.bathrooms || null,
      kitchen: kitchen || null,
      balcony: balcony || false,
      elevator: elevator || false,
      parking: parking || null,
      furnished: furnished || false,
      usageStatus: usageStatus || null,
      siteName: siteName || null,
      dues: dues || null,
      mortgageEligible: mortgageEligible || false,
      deedStatus: deedStatus || null,
      // Land/Arsa features
      imarDurumu: imarDurumu || null,
      altyapiFeatures: altyapiFeatures || [],
      konumFeatures: konumFeatures || [],
      genelOzellikler: genelOzellikler || [],
      manzaraFeatures: manzaraFeatures || [],
      // Yurt İçi Proje (Local Project) specific fields
      projectName: projectName || null,
      ilanNo: ilanNo || null,
      projeHakkinda: projeHakkinda || null,
      dairePlanlari: dairePlanlari || [],
      vaziyetPlani: vaziyetPlani || null,
      brochureUrl: brochureUrl || null,
      iletisim: iletisim || null,
      ozellikler: ozellikler || null,
      kampanya: kampanya || null,
      mapImage: mapImage || null,
      deliveryDate: deliveryDate || null,
      projectStatus: projectStatus || "devam-ediyor",
      listingStatus: normalizeListingStatus(listingStatus, projectStatus),
      gyo: Boolean(gyo),
      // Project-specific features (Özellikler tabs)
      binaOzellikleri: binaOzellikleri || [],
      disOzellikler: disOzellikler || [],
      engelliYasliUygun: engelliYasliUygun || [],
      eglenceAlisveris: eglenceAlisveris || [],
      guvenlik: guvenlik || [],
      manzara: manzara || [],
      muhit: muhit || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("Residency").insertOne(residencyData);

    // Get the created residency
    const residency = await db
      .collection("Residency")
      .findOne({ _id: result.insertedId });
    residency.id = residency._id.toString();
    delete residency._id;

    console.log("✅ Residency created successfully!");
    console.log("Residency ID:", residency.id);
    console.log("========================================");

    res.status(201).send({
      message: "Residency created successfully",
      residency: residency,
    });
  } catch (error) {
    console.log("❌ Error creating residency!");
    console.error("Error details:", error.message);

    if (error.code === 11000) {
      console.log("⚠️  Duplicate residency detected");
      console.log("========================================");
      return res.status(409).send({
        message: "A residency with this address already exists for this user",
      });
    }

    console.log("========================================");
    res.status(500).send({
      message: "Error creating residency",
      error: error.message,
    });
  }
});

export const getAllResidencies = asyncHandler(async (req, res) => {
  try {
    // Use MongoDB directly to get all fields including new ones
    const db = await getMongoDb();
    const residencies = await db
      .collection("Residency")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform _id to id for consistency
    const transformed = residencies.map((r) => {
      r.id = r._id.toString();
      delete r._id;
      return r;
    });

    // Attach consultant details for list view (if assigned)
    const consultantIds = [
      ...new Set(
        transformed
          .map((r) => r.consultantId)
          .filter((id) => id && ObjectId.isValid(id))
      ),
    ];

    if (consultantIds.length > 0) {
      const consultants = await db
        .collection("Consultant")
        .find({
          _id: { $in: consultantIds.map((id) => new ObjectId(id)) },
        })
        .toArray();

      const consultantMap = new Map(
        consultants.map((consultant) => {
          const id = consultant._id.toString();
          delete consultant._id;
          return [id, { ...consultant, id }];
        })
      );

      transformed.forEach((residency) => {
        const consultant = consultantMap.get(residency.consultantId);
        if (consultant) {
          residency.consultant = consultant;
        }
      });
    }

    res.send(transformed);
  } catch (err) {
    throw new Error(err.message);
  }
});

//get residency by id

export const getResidency = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    // Use MongoDB directly to get all fields including new ones
    const db = await getMongoDb();
    const identifier = normalizeLookupIdentifier(id);
    const objectIdCandidate = extractObjectIdCandidate(identifier);
    let residency = null;

    if (objectIdCandidate) {
      residency = await db.collection("Residency").findOne({
        _id: new ObjectId(objectIdCandidate),
      });
    }

    if (!residency && identifier) {
      residency = await db.collection("Residency").findOne({
        slug: identifier,
      });
    }

    if (residency) {
      // Transform _id to id for consistency
      residency.id = residency._id.toString();
      delete residency._id;

      // Fetch consultant if consultantId exists
      if (residency.consultantId) {
        try {
          const consultant = await db.collection("Consultant").findOne({
            _id: new ObjectId(residency.consultantId),
          });
          if (consultant) {
            consultant.id = consultant._id.toString();
            delete consultant._id;
            residency.consultant = consultant;
          }
        } catch (e) {
          console.log("Error fetching consultant:", e.message);
        }
      }
    }

    res.send(residency);
  } catch (err) {
    throw new Error(err.message);
  }
});

// Update residency
export const updateResidency = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    description_en,
    description_tr,
    description_ru,
    price,
    currency,
    address,
    city,
    country,
    image,
    images,
    videos,
    facilities,
    propertyType,
    category,
    consultantId,
    interiorFeatures,
    exteriorFeatures,
    muhitFeatures,
    // Turkish real estate fields
    listingNo,
    listingDate,
    area,
    rooms,
    buildingAge,
    floor,
    totalFloors,
    heating,
    bathrooms,
    kitchen,
    balcony,
    elevator,
    parking,
    furnished,
    usageStatus,
    siteName,
    dues,
    mortgageEligible,
    deedStatus,
    // Land/Arsa features
    imarDurumu,
    altyapiFeatures,
    konumFeatures,
    genelOzellikler,
    manzaraFeatures,
    // Yurt İçi Proje (Local Project) specific fields
    projectName,
    ilanNo,
    projeHakkinda,
    dairePlanlari,
    vaziyetPlani,
    brochureUrl,
    iletisim,
    ozellikler,
    kampanya,
    mapImage,
    deliveryDate,
    projectStatus,
    listingStatus,
    gyo,
    // Project-specific features (Özellikler tabs)
    binaOzellikleri,
    disOzellikler,
    engelliYasliUygun,
    eglenceAlisveris,
    guvenlik,
    manzara,
    muhit,
  } = req.body.data;

  console.log("========================================");
  console.log("🏠 Updating Residency...");
  console.log("Residency ID:", id);
  console.log("Title:", title);
  console.log("Price:", price);
  console.log("Currency:", normalizeCurrency(currency));
  console.log("Category:", category);
  console.log("Interior Features:", interiorFeatures?.length || 0);
  console.log("Exterior Features:", exteriorFeatures?.length || 0);
  console.log("Rooms:", rooms);

  try {
    // Use MongoDB directly to update all fields including new ones
    const db = await getMongoDb();
    const updateData = {
      title,
      description,
      description_en: description_en || null,
      description_tr: description_tr || null,
      description_ru: description_ru || null,
      price,
      currency: normalizeCurrency(currency),
      address,
      city,
      country,
      image,
      images: images || [image],
      videos: videos || [],
      facilities,
      propertyType: propertyType || "sale",
      category: category || "residential",
      consultantId: consultantId || null,
      interiorFeatures: interiorFeatures || [],
      exteriorFeatures: exteriorFeatures || [],
      muhitFeatures: muhitFeatures || [],
      // Turkish real estate fields
      listingNo: listingNo || null,
      listingDate: listingDate ? new Date(listingDate) : null,
      area: area || null,
      rooms: rooms || null,
      buildingAge: buildingAge || null,
      floor: floor !== undefined ? floor : null,
      totalFloors: totalFloors || null,
      heating: heating || null,
      bathrooms: bathrooms || facilities?.bathrooms || null,
      kitchen: kitchen || null,
      balcony: balcony || false,
      elevator: elevator || false,
      parking: parking || null,
      furnished: furnished || false,
      usageStatus: usageStatus || null,
      siteName: siteName || null,
      dues: dues || null,
      mortgageEligible: mortgageEligible || false,
      deedStatus: deedStatus || null,
      // Land/Arsa features
      imarDurumu: imarDurumu || null,
      altyapiFeatures: altyapiFeatures || [],
      konumFeatures: konumFeatures || [],
      genelOzellikler: genelOzellikler || [],
      manzaraFeatures: manzaraFeatures || [],
      // Yurt İçi Proje (Local Project) specific fields
      projectName: projectName || null,
      ilanNo: ilanNo || null,
        projeHakkinda: projeHakkinda || null,
        dairePlanlari: dairePlanlari || [],
        vaziyetPlani: vaziyetPlani || null,
        brochureUrl: brochureUrl || null,
        iletisim: iletisim || null,
        ozellikler: ozellikler || null,
      kampanya: kampanya || null,
      mapImage: mapImage || null,
      deliveryDate: deliveryDate || null,
      projectStatus: projectStatus || "devam-ediyor",
      listingStatus: normalizeListingStatus(listingStatus, projectStatus),
      gyo: Boolean(gyo),
      // Project-specific features (Özellikler tabs)
      binaOzellikleri: binaOzellikleri || [],
      disOzellikler: disOzellikler || [],
      engelliYasliUygun: engelliYasliUygun || [],
      eglenceAlisveris: eglenceAlisveris || [],
      guvenlik: guvenlik || [],
      manzara: manzara || [],
      muhit: muhit || [],
      updatedAt: new Date(),
    };

    console.log("Consultant ID:", consultantId || "Not assigned");
    console.log("Property Type:", propertyType);
    if (propertyType === "local-project" || propertyType === "international-project") {
      console.log("Project Info:", projeHakkinda);
      console.log("Floor Plans:", dairePlanlari?.length || 0);
      console.log("Project Features - Bina:", binaOzellikleri?.length || 0);
      console.log("Project Features - Dis:", disOzellikler?.length || 0);
    }

    const result = await db
      .collection("Residency")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      console.log("⚠️  Residency not found:", id);
      console.log("========================================");
      return res.status(404).send({
        message: "Residency not found",
      });
    }

    console.log("✅ Residency updated successfully!");
    console.log("========================================");

    // Fetch the updated document
    const residency = await db
      .collection("Residency")
      .findOne({ _id: new ObjectId(id) });
    residency.id = residency._id.toString();
    delete residency._id;

    res.status(200).send({
      message: "Residency updated successfully",
      residency: residency,
    });
  } catch (error) {
    console.log("❌ Error updating residency!");
    console.error("Error details:", error.message);

    console.log("========================================");
    res.status(500).send({
      message: "Error updating residency",
      error: error.message,
    });
  }
});

// Get residencies by consultant
export const getResidenciesByConsultant = asyncHandler(async (req, res) => {
  const { consultantId } = req.params;
  try {
    const residencies = await prisma.residency.findMany({
      where: { consultantId },
      orderBy: { createdAt: "desc" },
    });
    res.send(residencies);
  } catch (err) {
    throw new Error(err.message);
  }
});

// Delete residency
export const deleteResidency = asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log("========================================");
  console.log("🗑️ Deleting Residency...");
  console.log("Residency ID:", id);

  try {
    // First, get all users who have this residency in favorites
    const usersWithFav = await prisma.user.findMany({
      where: {
        favResidenciesID: {
          has: id,
        },
      },
    });

    // Remove residency from each user's favorites
    for (const user of usersWithFav) {
      const updatedFavs = user.favResidenciesID.filter((favId) => favId !== id);
      await prisma.user.update({
        where: { id: user.id },
        data: { favResidenciesID: updatedFavs },
      });
    }

    // Get all users who have bookings (bookedVisits is not empty)
    const usersWithBookings = await prisma.user.findMany({
      where: {
        bookedVisits: {
          isEmpty: false,
        },
      },
    });

    // Filter and update users who have this residency booked
    for (const user of usersWithBookings) {
      const hasBooking = user.bookedVisits.some((booking) => booking.id === id);
      if (hasBooking) {
        const updatedBookings = user.bookedVisits.filter(
          (booking) => booking.id !== id
        );
        await prisma.user.update({
          where: { id: user.id },
          data: { bookedVisits: updatedBookings },
        });
      }
    }

    // Delete the residency
    const residency = await prisma.residency.delete({
      where: { id },
    });

    console.log("✅ Residency deleted successfully!");
    console.log("========================================");

    res.status(200).send({
      message: "Residency deleted successfully",
      residency: residency,
    });
  } catch (error) {
    console.log("❌ Error deleting residency!");
    console.error("Error details:", error.message);

    if (error.code === "P2025") {
      console.log("⚠️  Residency not found:", id);
      console.log("========================================");
      return res.status(404).send({
        message: "Residency not found",
      });
    }

    console.log("========================================");
    res.status(500).send({
      message: "Error deleting residency",
      error: error.message,
    });
  }
});
