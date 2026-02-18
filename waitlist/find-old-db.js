// Script to find all SQLite database files on Render
// Run this via Render Shell to locate your old database with the 4 users

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🔍 Searching for all SQLite database files...\n');

const possibleLocations = [
    '/opt/render/project/src/lumina_waitlist.db',
    '/opt/render/project/src/waitlist/lumina_waitlist.db',
    process.cwd() + '/lumina_waitlist.db',
    __dirname + '/lumina_waitlist.db',
];

console.log('Checking these locations:');
possibleLocations.forEach(loc => console.log(`  - ${loc}`));
console.log('');

let found = [];

for (const dbPath of possibleLocations) {
    try {
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            const db = new Database(dbPath, { readonly: true });
            const count = db.prepare('SELECT COUNT(*) as total FROM waitlist').get();
            db.close();
            
            found.push({
                path: dbPath,
                size: stats.size,
                modified: stats.mtime,
                userCount: count.total
            });
            
            console.log(`✅ FOUND: ${dbPath}`);
            console.log(`   Size: ${stats.size} bytes`);
            console.log(`   Modified: ${stats.mtime}`);
            console.log(`   Users: ${count.total}`);
            console.log('');
        }
    } catch (err) {
        // File doesn't exist or can't be read
    }
}

if (found.length === 0) {
    console.log('❌ No database files found in expected locations');
    console.log('\nTrying to list /opt/render/project/src directory:');
    try {
        const files = fs.readdirSync('/opt/render/project/src');
        console.log(files.join('\n'));
    } catch (err) {
        console.log('Cannot read directory:', err.message);
    }
} else {
    console.log(`\n Summary: Found ${found.length} database file(s)`);
    
    // Find the one with most users
    const bestDb = found.sort((a, b) => b.userCount - a.userCount)[0];
    console.log(`\n Database with most users (${bestDb.userCount}):`);
    console.log(`   ${bestDb.path}`);
    
    if (bestDb.userCount === 4) {
        console.log('\n✅ Found your database with 4 users!');
        console.log(`\nTo use this database, set this environment variable in Render:`);
        console.log(`DB_PATH=${bestDb.path}`);
    }
}
