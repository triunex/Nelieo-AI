// Export waitlist data to CSV for migration
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'lumina_waitlist.db');
const db = new Database(dbPath);

try {
    // Get all waitlist entries
    const entries = db.prepare('SELECT * FROM waitlist ORDER BY created_at ASC').all();
    
    console.log(`Found ${entries.length} waitlist entries`);
    
    if (entries.length === 0) {
        console.log('No entries to export');
        process.exit(0);
    }
    
    // Create CSV content
    const headers = 'id,name,email,company,use_case,created_at\n';
    const rows = entries.map(entry => {
        return `${entry.id},"${entry.name}","${entry.email}","${entry.company || ''}","${entry.use_case}","${entry.created_at}"`;
    }).join('\n');
    
    const csv = headers + rows;
    
    // Write to file
    const exportPath = path.join(__dirname, 'waitlist_export.csv');
    fs.writeFileSync(exportPath, csv, 'utf8');
    
    console.log(`✅ Exported to: ${exportPath}`);
    console.log('\nEntries:');
    entries.forEach(entry => {
        console.log(`  - ${entry.email} (${entry.name})`);
    });
    
} catch (error) {
    console.error('Export error:', error);
} finally {
    db.close();
}
