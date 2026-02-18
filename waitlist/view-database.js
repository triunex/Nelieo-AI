const Database = require('better-sqlite3');
const path = require('path');

// Open database
const dbPath = path.join(__dirname, 'lumina_waitlist.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║                    WAITLIST DATABASE VIEWER                        ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// Get total count
const countResult = db.prepare('SELECT COUNT(*) as total FROM waitlist').get();
console.log(`📊 Total Signups: ${countResult.total}\n`);

if (countResult.total > 0) {
    // Get all users
    const users = db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC').all();
    
    console.log('┌────┬─────────────────────────────┬──────────────────────────────────┬─────────────────────┬─────────────────┬─────────────────────┐');
    console.log('│ ID │ Name                        │ Email                            │ Company             │ Use Case        │ Joined At           │');
    console.log('├────┼─────────────────────────────┼──────────────────────────────────┼─────────────────────┼─────────────────┼─────────────────────┤');
    
    users.forEach(user => {
        const id = String(user.id).padEnd(2);
        const name = (user.name || '').substring(0, 27).padEnd(27);
        const email = (user.email || '').substring(0, 32).padEnd(32);
        const company = (user.company || 'N/A').substring(0, 19).padEnd(19);
        const useCase = (user.use_case || '').substring(0, 15).padEnd(15);
        const date = new Date(user.created_at).toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).padEnd(19);
        
        console.log(`│ ${id} │ ${name} │ ${email} │ ${company} │ ${useCase} │ ${date} │`);
    });
    
    console.log('└────┴─────────────────────────────┴──────────────────────────────────┴─────────────────────┴─────────────────┴─────────────────────┘\n');
    
    // Show detailed view
    console.log('📋 DETAILED VIEW:\n');
    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Company: ${user.company || 'Not specified'}`);
        console.log(`   Use Case: ${user.use_case}`);
        console.log(`   Joined: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
    });
} else {
    console.log('⚠️  No signups yet. Visit http://localhost:3001/join.html to test!\n');
}

db.close();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('💡 Tips:');
console.log('   • Run this script anytime: node view-database.js');
console.log('   • Export to CSV: node export-csv.js');
console.log('   • Delete a user: node delete-user.js <email>\n');
