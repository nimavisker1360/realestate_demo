// Script to set a user as admin
// Usage: node scripts/setAdmin.js <email>

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin(email) {
  if (!email) {
    console.log("❌ Please provide an email address");
    console.log("Usage: node scripts/setAdmin.js <email>");
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { isAdmin: true },
    });

    console.log(`✅ User ${email} is now an admin!`);
    console.log("Updated user:", updatedUser);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
setAdmin(email);




