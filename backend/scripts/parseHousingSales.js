import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Excel file
const excelPath = path.join(__dirname, '../data/ilcelere gore konut satis sayilari.xls');

// Read the Excel file
const workbook = XLSX.readFile(excelPath);

// Get all sheet names
console.log('Sheet names:', workbook.SheetNames);

// Parse each sheet and show structure
workbook.SheetNames.forEach((sheetName, index) => {
  if (index < 3) { // Only show first 3 sheets
    console.log(`\n=== Sheet: ${sheetName} ===`);
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Show first 10 rows
    console.log('First 10 rows:');
    jsonData.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i}:`, row.slice(0, 10));
    });
    
    console.log(`Total rows: ${jsonData.length}`);
  }
});
