const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Open database
const dbPath = path.join(__dirname, 'lumina_waitlist.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n📤 Exporting waitlist to CSV...\n');

// Get all users
const users = db.prepare('SELECT * FROM waitlist ORDER BY created_at ASC').all();

if (users.length === 0) {
    console.log('⚠️  No users to export.\n');
    db.close();
    process.exit(0);
}

// Create CSV content
const headers = ['ID', 'Name', 'Email', 'Company', 'Use Case', 'Joined At'];
const csvRows = [headers.join(',')];

users.forEach(user => {
    const row = [
        user.id,
        `"${user.name}"`,
        user.email,
        `"${user.company || ''}"`,
        user.use_case,
        `"${new Date(user.created_at).toISOString()}"`
    ];
    csvRows.push(row.join(','));
});

const csvContent = csvRows.join('\n');

// Save to file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const filename = `waitlist-export-${timestamp}.csv`;
const filepath = path.join(__dirname, filename);

fs.writeFileSync(filepath, csvContent, 'utf8');

console.log(`✅ Exported ${users.length} users to: ${filename}`);
console.log(`📍 Full path: ${filepath}\n`);

// Show preview
console.log('📋 Preview (first 5 rows):\n');
console.log(csvRows.slice(0, 6).join('\n'));
console.log(`\n... and ${Math.max(0, users.length - 5)} more rows\n`);

db.close();
