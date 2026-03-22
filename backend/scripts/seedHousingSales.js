import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Path to the Excel file
const excelPath = path.join(__dirname, '../data/ilcelere gore konut satis sayilari.xls');

async function seedHousingSales() {
  try {
    console.log('🔄 Reading Excel file...');
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets['t7'];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Skip header rows (0, 1, 2)
    const dataRows = jsonData.slice(3);
    
    console.log(`📊 Found ${dataRows.length} data rows`);
    
    // Parse data
    const housingSalesData = [];
    let currentYear = null;
    
    for (const row of dataRows) {
      // Update year if present
      if (row[0] && typeof row[0] === 'number') {
        currentYear = row[0];
      }
      
      // Skip if no year or no district
      if (!currentYear || !row[2]) continue;
      
      const province = row[1]?.toString().trim() || '';
      const district = row[2]?.toString().trim() || '';
      const totalSales = parseInt(row[3]) || 0;
      const mortgagedSales = parseInt(row[5]) || 0;
      const otherSales = parseInt(row[6]) || 0;
      const firstHandSales = parseInt(row[8]) || 0;
      const secondHandSales = parseInt(row[9]) || 0;
      
      // Skip if no valid data
      if (!province || !district || totalSales === 0) continue;
      
      housingSalesData.push({
        year: currentYear,
        province,
        district,
        totalSales,
        mortgagedSales,
        otherSales,
        firstHandSales,
        secondHandSales,
      });
    }
    
    console.log(`✅ Parsed ${housingSalesData.length} valid records`);
    
    // Clear existing data
    console.log('🗑️ Clearing existing housing sales data...');
    await prisma.housingSales.deleteMany({});
    
    // Insert data in batches
    console.log('📥 Inserting data to MongoDB...');
    const batchSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < housingSalesData.length; i += batchSize) {
      const batch = housingSalesData.slice(i, i + batchSize);
      await prisma.housingSales.createMany({
        data: batch,
      });
      inserted += batch.length;
      console.log(`  📈 Inserted ${inserted}/${housingSalesData.length} records`);
    }
    
    console.log('✨ Housing sales data seeded successfully!');
    
    // Show summary
    const summary = await prisma.housingSales.aggregate({
      _count: true,
      _sum: { totalSales: true },
    });
    
    const years = await prisma.housingSales.findMany({
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'asc' },
    });
    
    const provinces = await prisma.housingSales.findMany({
      distinct: ['province'],
      select: { province: true },
    });
    
    console.log('\n📊 Summary:');
    console.log(`  Total records: ${summary._count}`);
    console.log(`  Total sales: ${summary._sum.totalSales?.toLocaleString()}`);
    console.log(`  Years: ${years.map(y => y.year).join(', ')}`);
    console.log(`  Provinces: ${provinces.length}`);
    
    // Save JSON file for reference
    const jsonPath = path.join(__dirname, '../data/housing_sales.json');
    const fs = await import('fs');
    fs.writeFileSync(jsonPath, JSON.stringify(housingSalesData, null, 2));
    console.log(`\n💾 JSON file saved to: ${jsonPath}`);
    
  } catch (error) {
    console.error('❌ Error seeding housing sales:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedHousingSales();
