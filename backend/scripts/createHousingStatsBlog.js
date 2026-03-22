import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createHousingStatsBlog() {
  try {
    console.log('🔄 Creating Housing Statistics Blog Post...');

    // Check if it already exists
    const existing = await prisma.blog.findFirst({
      where: { slug: 'housing-sales-statistics-turkey' }
    });

    if (existing) {
      console.log('⚠️ Blog post already exists, updating...');
      await prisma.blog.update({
        where: { id: existing.id },
        data: {
          title: 'Housing Sales Statistics - Turkey',
          category: 'Market Analysis',
          content: '<!-- HOUSING_STATS_CHART -->',
          summary: 'Comprehensive housing sales statistics for Turkey from 2015-2025. View charts, trends, and data by province.',
          metaDescription: 'Turkey housing sales statistics 2015-2025. Charts, trends, provincial data and market analysis.',
          published: true,
          order: 0,
        }
      });
      console.log('✅ Blog post updated!');
    } else {
      await prisma.blog.create({
        data: {
          title: 'Housing Sales Statistics - Turkey',
          slug: 'housing-sales-statistics-turkey',
          category: 'Market Analysis',
          content: '<!-- HOUSING_STATS_CHART -->',
          summary: 'Comprehensive housing sales statistics for Turkey from 2015-2025. View charts, trends, and data by province.',
          metaDescription: 'Turkey housing sales statistics 2015-2025. Charts, trends, provincial data and market analysis.',
          published: true,
          order: 0,
        }
      });
      console.log('✅ Blog post created!');
    }

    // Show the blog
    const blog = await prisma.blog.findFirst({
      where: { slug: 'housing-sales-statistics-turkey' }
    });
    
    console.log('\n📝 Blog Details:');
    console.log(`  ID: ${blog.id}`);
    console.log(`  Title: ${blog.title}`);
    console.log(`  Slug: ${blog.slug}`);
    console.log(`  URL: /blog/${blog.id}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createHousingStatsBlog();
