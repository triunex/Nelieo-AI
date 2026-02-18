// seed-database.js - Run this once to seed production data
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'lumina_waitlist.db');
console.log(`Seeding database: ${dbPath}`);

const db = new Database(dbPath);

// Create tables if they don't exist
console.log('Creating tables if needed...');

db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        company TEXT,
        use_case TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_email ON waitlist(email)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_created_at ON waitlist(created_at)`);

db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        email TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_event_type ON waitlist_analytics(event_type)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON waitlist_analytics(created_at)`);

console.log('✅ Tables ready');

const seedData = [
    { name: "Shourya Sharma", email: "triunex.shorya@gmail.com", company: null, use_case: "Testing", created_at: "2024-11-01 10:30:00" },
    { name: "Shourya Sharma", email: "sharmashorya934@gmail.com", company: null, use_case: "Testing", created_at: "2024-11-01 11:00:00" },
    { name: "raja bhaiya", email: "sharmashorya086@gmail.com", company: null, use_case: "Development", created_at: "2024-11-02 09:15:00" },
    { name: "Manish sharma", email: "sharmasubh785@gmail.com", company: null, use_case: "Testing", created_at: "2024-11-02 14:20:00" },
    { name: "Golu sharma", email: "triunex.work@gmail.com", company: null, use_case: "Work", created_at: "2024-11-03 08:45:00" },
    { name: "Rahul chaubey", email: "reflera.founder@gmail.com", company: null, use_case: "Business", created_at: "2024-11-03 16:30:00" },
    { name: "Mamta Sharma", email: "shirishivaya1986@gmail.com", company: null, use_case: "Personal", created_at: "2024-11-04 12:00:00" }
];

const insert = db.prepare(`
    INSERT INTO waitlist (name, email, company, use_case, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO NOTHING
`);

let seeded = 0;
let skipped = 0;

for (const entry of seedData) {
    try {
        const result = insert.run(entry.name, entry.email, entry.company, entry.use_case, entry.created_at);
        if (result.changes > 0) {
            seeded++;
            console.log(`✅ Added: ${entry.email}`);
        } else {
            skipped++;
            console.log(`⏭️  Exists: ${entry.email}`);
        }
    } catch (err) {
        console.error(`❌ Error: ${entry.email}`, err.message);
    }
}

const count = db.prepare('SELECT COUNT(*) as count FROM waitlist').get();

console.log(`\n📊 Seeding Summary:`);
console.log(`  ✅ New entries: ${seeded}`);
console.log(`  ⏭️  Already existed: ${skipped}`);
console.log(`  📧 Total in database: ${count.count}`);

db.close();
console.log('\n✅ Seeding complete!');
