import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Function to create a slug from a string
function createSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

async function updateBlogSlugs() {
  try {
    console.log("🔄 Updating blog slugs...");

    // Get all blogs
    const blogs = await prisma.blog.findMany();
    console.log(`📝 Found ${blogs.length} blogs`);

    for (const blog of blogs) {
      if (!blog.slug) {
        // Create slug from title or use ID
        let slug = blog.title 
          ? createSlug(blog.title)
          : `blog-${blog.id.substring(0, 8)}`;

        // Check if slug exists and make it unique
        let slugExists = await prisma.blog.findUnique({ 
          where: { slug } 
        });
        
        let counter = 1;
        while (slugExists && slugExists.id !== blog.id) {
          slug = `${createSlug(blog.title)}-${counter}`;
          slugExists = await prisma.blog.findUnique({ where: { slug } });
          counter++;
        }

        // Update the blog
        await prisma.blog.update({
          where: { id: blog.id },
          data: { slug },
        });

        console.log(`✅ Updated blog "${blog.title}" with slug: ${slug}`);
      }
    }

    console.log("✨ All blog slugs updated successfully!");
  } catch (error) {
    console.error("❌ Error updating blog slugs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateBlogSlugs();
