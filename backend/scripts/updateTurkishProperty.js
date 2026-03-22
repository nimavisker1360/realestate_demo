import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function updateTurkishProperty() {
  console.log("🔧 Updating Turkish property address...");
  
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db("CaseCentralYT");
    const residencies = db.collection("Residency");
    
    // Update the Turkish property to add the address string
    const result = await residencies.updateOne(
      { title: "Satılık 2+1 Daire - Makyol Santral" },
      { 
        $set: { 
          address: "Koza Mh., Esenyurt, İstanbul"
        } 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log("✅ Address updated successfully!");
    } else {
      console.log("⚠️ No changes made");
    }
    
    // Verify
    const property = await residencies.findOne({ title: "Satılık 2+1 Daire - Makyol Santral" });
    console.log("\n📄 Updated property:");
    console.log("Title:", property.title);
    console.log("Address:", property.address);
    console.log("City:", property.city);
    console.log("Country:", property.country);
    console.log("Price:", property.price, property.currency);
    console.log("Rooms:", property.rooms);
    console.log("Area:", property.area);
    console.log("Floor:", property.floor, "/", property.totalFloors);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

updateTurkishProperty();
