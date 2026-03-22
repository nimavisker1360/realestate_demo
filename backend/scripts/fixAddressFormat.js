import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixAddresses() {
  console.log("🔧 Starting to fix address formats...");

  try {
    // Get all residencies directly from MongoDB
    const residencies = await prisma.residency.findMany();
    console.log(`Found ${residencies.length} residencies`);

    for (const residency of residencies) {
      try {
        // Check if address is an object (it shouldn't be)
        if (typeof residency.address === 'object') {
          console.log(`⚠️  Found object address in property: ${residency.title}`);
          
          // Convert object to string
          const addressString = residency.address.neighborhood 
            ? `${residency.address.neighborhood}, ${residency.address.district}, ${residency.address.city}`
            : `${residency.address.district}, ${residency.address.city}`;

          console.log(`   Converting to: ${addressString}`);

          // Update the residency
          await prisma.residency.update({
            where: { id: residency.id },
            data: { address: addressString },
          });

          console.log(`✅ Fixed address for: ${residency.title}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing ${residency.id}:`, error.message);
        // If we can't fix it, try to delete it
        console.log(`   Attempting to delete problematic property...`);
        try {
          await prisma.residency.delete({
            where: { id: residency.id },
          });
          console.log(`   ✅ Deleted problematic property`);
        } catch (delError) {
          console.error(`   ❌ Could not delete:`, delError.message);
        }
      }
    }

    console.log("🎉 Address fix completed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixAddresses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
