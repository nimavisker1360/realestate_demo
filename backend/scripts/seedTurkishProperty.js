import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const turkishProperty = {
  title: "Satılık 2+1 Daire - Makyol Santral",
  price: 5850000,
  currency: "TRY",
  addressDetails: {
    city: "İstanbul",
    district: "Esenyurt",
    neighborhood: "Koza Mh.",
  },
  city: "İstanbul",
  country: "Turkey",
  listingNo: "1275908801",
  listingDate: new Date("2026-01-09"),
  propertyType: "sale",
  area: {
    gross: 125,
    net: 85,
  },
  rooms: "2+1",
  buildingAge: 5,
  floor: 2,
  totalFloors: 18,
  heating: "Merkezi (Pay Ölçer)",
  bathrooms: 1,
  kitchen: "Açık (Amerikan)",
  balcony: true,
  elevator: true,
  parking: "Kapalı Otopark",
  furnished: false,
  usageStatus: "Mülk Sahibi",
  siteName: "Makyol Santral",
  dues: null,
  mortgageEligible: true,
  deedStatus: "Kat Mülkiyetli",
  images: [],
  facilities: {
    bedrooms: 2,
    bathrooms: 1,
    parkings: 1,
  },
};

async function main() {
  console.log("🏠 Seeding Turkish property...");

  try {
    const residency = await prisma.residency.create({
      data: turkishProperty,
    });

    console.log("✅ Property created successfully!");
    console.log("ID:", residency.id);
    console.log("Title:", residency.title);
    console.log("Price:", residency.price, residency.currency);
  } catch (error) {
    console.error("❌ Error creating property:", error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
