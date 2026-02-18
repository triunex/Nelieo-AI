// View Production Database from Render
// This script fetches waitlist entries from your live production server

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Your production URL
const PRODUCTION_URL = 'https://nelieo.onrender.com';

function promptForSecret() {
    return new Promise((resolve) => {
        rl.question('Enter your ADMIN_SECRET (set in Render environment): ', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function fetchProductionDatabase(adminSecret) {
    if (!adminSecret) {
        console.error('❌ ADMIN_SECRET is required');
        process.exit(1);
    }

    try {
        console.log(`\n🔍 Fetching production database from ${PRODUCTION_URL}...\n`);
        
        const url = `${PRODUCTION_URL}/api/admin/waitlist?secret=${encodeURIComponent(adminSecret)}`;
        const response = await fetch(url);

        if (response.status === 403) {
            console.error('❌ Access denied. Check your ADMIN_SECRET.');
            console.error('   Make sure ADMIN_SECRET is set in Render environment variables.');
            process.exit(1);
        }

        if (!response.ok) {
            console.error(`❌ Server error: ${response.status} ${response.statusText}`);
            process.exit(1);
        }

        const data = await response.json();
        
        if (!data.entries || data.entries.length === 0) {
            console.log('📭 No entries found in production database.');
            return;
        }

        console.log(`✅ Found ${data.entries.length} entries in production database:\n`);
        console.log('═══════════════════════════════════════════════════════════════════════════════');
        
        data.entries.forEach((entry, index) => {
            console.log(`\n#${index + 1}`);
            console.log(`  ID:        ${entry.id}`);
            console.log(`  Name:      ${entry.name}`);
            console.log(`  Email:     ${entry.email}`);
            console.log(`  Company:   ${entry.company || 'N/A'}`);
            console.log(`  Use Case:  ${entry.use_case || 'N/A'}`);
            console.log(`  Joined:    ${new Date(entry.created_at).toLocaleString()}`);
            console.log('───────────────────────────────────────────────────────────────────────────────');
        });

        console.log(`\n📊 Total Production Users: ${data.entries.length}`);
        console.log(`📅 Database queried: ${new Date().toLocaleString()}\n`);

    } catch (error) {
        console.error('❌ Error fetching production database:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.error('   Cannot reach production server. Check your internet connection.');
        }
        process.exit(1);
    }
}

// Main execution
(async () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Nelieo Production Database Viewer   ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const adminSecret = await promptForSecret();
    await fetchProductionDatabase(adminSecret);
})();
