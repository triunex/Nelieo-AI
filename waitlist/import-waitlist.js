// Import waitlist data from CSV
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'lumina_waitlist.db');
const csvPath = path.join(__dirname, 'waitlist_export.csv');

if (!fs.existsSync(csvPath)) {
    console.error('❌ waitlist_export.csv not found! Run export-waitlist.js first.');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // Read CSV file
    const csv = fs.readFileSync(csvPath, 'utf8');
    const lines = csv.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} entries to import`);
    
    // Prepare insert statement
    const insert = db.prepare(`
        INSERT INTO waitlist (name, email, company, use_case, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO NOTHING
    `);
    
    let imported = 0;
    let skipped = 0;
    
    // Import each entry
    for (const line of dataLines) {
        // Parse CSV line (handle quoted fields)
        const match = line.match(/^\d+,"([^"]+)","([^"]+)","([^"]*)","([^"]+)","([^"]+)"$/);
        
        if (match) {
            const [, name, email, company, use_case, created_at] = match;
            
            try {
                insert.run(name, email, company || null, use_case, created_at);
                imported++;
                console.log(`  ✅ Imported: ${email}`);
            } catch (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    skipped++;
                    console.log(`  ⏭️  Skipped (duplicate): ${email}`);
                } else {
                    throw err;
                }
            }
        }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📧 Total unique: ${imported + skipped}`);
    
    // Verify count
    const count = db.prepare('SELECT COUNT(*) as count FROM waitlist').get();
    console.log(`\n✅ Database now has ${count.count} total entries`);
    
} catch (error) {
    console.error('Import error:', error);
} finally {
    db.close();
}
