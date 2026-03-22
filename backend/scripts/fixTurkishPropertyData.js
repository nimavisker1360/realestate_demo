import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function fixTurkishProperty() {
  console.log("🔧 Fixing Turkish property data in MongoDB...");
  
  // Extract MongoDB connection info from DATABASE_URL
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("CaseCentralYT");
    const residencies = db.collection("Residency");
    
    // Find the problematic Turkish property
    const turkishProperty = await residencies.findOne({
      $or: [
        { listingNo: "1275908801" },
        { title: "Satılık 2+1 Daire - Makyol Santral" }
      ]
    });
    
    if (!turkishProperty) {
      console.log("❌ Turkish property not found in database");
      return;
    }
    
    console.log("📄 Found Turkish property:", turkishProperty._id);
    console.log("Current address:", turkishProperty.address);
    console.log("Current createdAt:", turkishProperty.createdAt);
    
    // Build the address string from the object
    let addressString = "";
    if (typeof turkishProperty.address === "object" && turkishProperty.address !== null) {
      const addr = turkishProperty.address;
      addressString = `${addr.neighborhood || ""}, ${addr.district || ""}, ${addr.city || ""}`.trim();
    } else if (typeof turkishProperty.address === "string") {
      addressString = turkishProperty.address;
    }
    
    // Prepare the update
    const updateData = {
      // Convert address object to string
      address: addressString || "Koza Mh., Esenyurt, İstanbul",
      
      // Store original address details in addressDetails
      addressDetails: turkishProperty.address,
      
      // Fix city/country
      city: turkishProperty.address?.city || "İstanbul",
      country: "Turkey",
      
      // Convert createdAt/updatedAt to proper Date objects if they're strings
      createdAt: new Date(turkishProperty.createdAt || new Date()),
      updatedAt: new Date(turkishProperty.updatedAt || new Date()),
      
      // Convert listingDate to proper Date if string
      listingDate: turkishProperty.listingDate ? new Date(turkishProperty.listingDate) : null,
      
      // Ensure other fields are properly set
      currency: turkishProperty.currency || "TRY",
      propertyType: "sale",
      
      // Create facilities from property fields
      facilities: {
        bedrooms: parseInt(turkishProperty.rooms?.split("+")[0]) || 2,
        bathrooms: turkishProperty.bathrooms || 1,
        parkings: turkishProperty.parking ? 1 : 0
      },
      
      // Set description if missing
      description: turkishProperty.description || `${turkishProperty.rooms} daire, ${turkishProperty.area?.net}m² net alan, ${turkishProperty.floor}. kat, ${turkishProperty.siteName}`,
      
      // Set default image if missing
      image: turkishProperty.image || turkishProperty.images?.[0] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60"
    };
    
    console.log("\n📝 Updating with:");
    console.log("Address:", updateData.address);
    console.log("City:", updateData.city);
    console.log("Country:", updateData.country);
    console.log("CreatedAt:", updateData.createdAt);
    
    // Update the document
    const result = await residencies.updateOne(
      { _id: turkishProperty._id },
      { $set: updateData }
    );
    
    if (result.modifiedCount > 0) {
      console.log("\n✅ Turkish property fixed successfully!");
    } else {
      console.log("\n⚠️ No changes were made");
    }
    
    // Verify the fix
    const fixed = await residencies.findOne({ _id: turkishProperty._id });
    console.log("\n📄 Verified data:");
    console.log("Address:", fixed.address);
    console.log("AddressDetails:", fixed.addressDetails);
    console.log("CreatedAt type:", typeof fixed.createdAt);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixTurkishProperty()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
