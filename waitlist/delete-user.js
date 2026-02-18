const Database = require('better-sqlite3');
const path = require('path');

const email = process.argv[2];

if (!email) {
    console.log('\n❌ Please provide an email address to delete');
    console.log('Usage: node delete-user.js <email>\n');
    console.log('Example: node delete-user.js user@example.com\n');
    process.exit(1);
}

// Open database
const dbPath = path.join(__dirname, 'lumina_waitlist.db');
const db = new Database(dbPath);

console.log(`\n🔍 Looking for user: ${email}\n`);

// Find user
const user = db.prepare('SELECT * FROM waitlist WHERE email = ?').get(email);

if (!user) {
    console.log('❌ User not found in database\n');
    db.close();
    process.exit(1);
}

console.log('📋 User found:');
console.log(`   Name: ${user.name}`);
console.log(`   Email: ${user.email}`);
console.log(`   Company: ${user.company || 'N/A'}`);
console.log(`   Use Case: ${user.use_case}`);
console.log(`   Joined: ${new Date(user.created_at).toLocaleString()}\n`);

// Delete user
const result = db.prepare('DELETE FROM waitlist WHERE email = ?').run(email);

if (result.changes > 0) {
    console.log('✅ User deleted successfully!\n');
    
    // Show remaining count
    const countResult = db.prepare('SELECT COUNT(*) as total FROM waitlist').get();
    console.log(`📊 Remaining users: ${countResult.total}\n`);
} else {
    console.log('❌ Failed to delete user\n');
}

db.close();
