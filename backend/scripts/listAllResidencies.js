import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function listAll() {
  console.log("📋 Listing all residencies...\n");
  
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");
    
    const db = client.db("CaseCentralYT");
    const residencies = db.collection("Residency");
    
    // Find all residencies
    const all = await residencies.find({}).toArray();
    
    console.log(`Found ${all.length} residencies:\n`);
    
    all.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   ID: ${r._id}`);
      console.log(`   Address: ${JSON.stringify(r.address)}`);
      console.log(`   Address type: ${typeof r.address}`);
      console.log(`   City: ${r.city}`);
      console.log(`   CreatedAt: ${r.createdAt} (type: ${typeof r.createdAt})`);
      console.log("");
    });
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

listAll();
