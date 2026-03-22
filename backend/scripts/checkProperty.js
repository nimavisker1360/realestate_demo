import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function checkProperty() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db("CaseCentralYT");
    const residencies = db.collection("Residency");
    
    const property = await residencies.findOne({ title: "Satılık 2+1 Daire - Makyol Santral" });
    
    console.log("Property found:");
    console.log("ID:", property._id);
    console.log("Title:", property.title);
    console.log("Interior Features:", property.interiorFeatures?.length || 0, "items");
    console.log("Exterior Features:", property.exteriorFeatures?.length || 0, "items");
    
    if (property.interiorFeatures) {
      console.log("\nFirst 5 interior features:", property.interiorFeatures.slice(0, 5));
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

checkProperty();
