import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DATABASE_URL;

async function fixAddresses() {
  const client = new MongoClient(uri);

  try {
    console.log("🔧 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected!");

    const database = client.db("CaseCentralYT");
    const collection = database.collection("Residency");

    // Find all documents where address is an object
    const problematicDocs = await collection.find({
      address: { $type: "object" }
    }).toArray();

    console.log(`Found ${problematicDocs.length} properties with object addresses`);

    for (const doc of problematicDocs) {
      console.log(`\n📝 Fixing: ${doc.title}`);
      console.log(`   Current address:`, doc.address);

      // Convert object to string
      let addressString;
      if (doc.address.neighborhood) {
        addressString = `${doc.address.neighborhood}, ${doc.address.district}, ${doc.address.city}`;
      } else if (doc.address.district) {
        addressString = `${doc.address.district}, ${doc.address.city}`;
      } else {
        addressString = doc.address.city || "Unknown Address";
      }

      console.log(`   New address: ${addressString}`);

      // Update the document
      await collection.updateOne(
        { _id: doc._id },
        { $set: { address: addressString } }
      );

      console.log(`   ✅ Updated!`);
    }

    console.log("\n🎉 All addresses fixed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

fixAddresses();
