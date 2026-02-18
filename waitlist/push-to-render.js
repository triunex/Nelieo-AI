// Push local waitlist data to Render production
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const RENDER_URL = process.env.RENDER_URL || 'https://nelieo.onrender.com';
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'your-secret-key-here';
const csvPath = path.join(__dirname, 'waitlist_export.csv');

if (!fs.existsSync(csvPath)) {
    console.error('❌ waitlist_export.csv not found! Run: node export-waitlist.js');
    process.exit(1);
}

// Read and parse CSV
const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.split('\n').filter(line => line.trim());
const dataLines = lines.slice(1); // Skip header

const entries = [];

for (const line of dataLines) {
    const match = line.match(/^\d+,"([^"]+)","([^"]+)","([^"]*)","([^"]+)","([^"]+)"$/);
    
    if (match) {
        const [, name, email, company, use_case, created_at] = match;
        entries.push({
            name,
            email,
            company: company || null,
            use_case,
            created_at
        });
    }
}

console.log(`📤 Pushing ${entries.length} entries to ${RENDER_URL}`);
console.log(`🔐 Using secret: ${IMPORT_SECRET.substring(0, 8)}...`);

// Make POST request
const url = new URL(`${RENDER_URL}/api/waitlist/import`);
const postData = JSON.stringify({
    entries,
    secret: IMPORT_SECRET
});

const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            
            if (result.success) {
                console.log('\n✅ Import successful!');
                console.log(`  📥 Imported: ${result.imported}`);
                console.log(`  ⏭️  Skipped: ${result.skipped}`);
                console.log(`  📊 Total on server: ${result.totalNow}`);
            } else {
                console.error('\n❌ Import failed:', result.error);
            }
        } catch (err) {
            console.error('\n❌ Error parsing response:', err);
            console.error('Response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Request error:', error.message);
});

req.write(postData);
req.end();
