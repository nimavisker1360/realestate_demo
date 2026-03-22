import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createForeignSalesBlog() {
  try {
    // Check if blog already exists
    const existingBlog = await prisma.blog.findFirst({
      where: {
        content: {
          contains: "FOREIGN_SALES_CHART"
        }
      }
    });

    if (existingBlog) {
      console.log("Foreign Sales blog already exists!");
      console.log("Blog ID:", existingBlog.id);
      return;
    }

    // Get the highest order number
    const maxOrder = await prisma.blog.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const blog = await prisma.blog.create({
      data: {
        title: "Ülke Uyruklarına Göre Yabancılara Yapılan Konut Satışları",
        title_en: "Housing Sales to Foreigners by Nationality",
        title_tr: "Ülke Uyruklarına Göre Yabancılara Yapılan Konut Satışları",
        category: "Market Analysis",
        category_en: "Market Analysis",
        category_tr: "Piyasa Analizi",
        content: "<!-- FOREIGN_SALES_CHART -->",
        summary: "2015-2025 yılları arasında Türkiye'de yabancılara yapılan konut satışlarının ülke uyruklarına göre kapsamlı istatistikleri.",
        summary_en: "Comprehensive statistics of housing sales to foreigners in Turkey by nationality from 2015-2025.",
        summary_tr: "2015-2025 yılları arasında Türkiye'de yabancılara yapılan konut satışlarının ülke uyruklarına göre kapsamlı istatistikleri.",
        image: "",
        published: true,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    console.log("✅ Foreign Sales blog created successfully!");
    console.log("Blog ID:", blog.id);
    console.log("Title:", blog.title);
    console.log("You can now view it at: /blog/" + blog.id);
  } catch (error) {
    console.error("Error creating blog:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createForeignSalesBlog();
