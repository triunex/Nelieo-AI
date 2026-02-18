// Direct database import - Run this on Render Shell
// This script can be executed directly on Render via the Shell tab

const Database = require('better-sqlite3');
const path = require('path');

// Your waitlist data
const entries = [
    {
        name: "Shourya Sharma",
        email: "triunex.shorya@gmail.com",
        company: null,
        use_case: "Testing",
        created_at: "2024-11-01 10:30:00"
    },
    {
        name: "Shourya Sharma", 
        email: "sharmashorya934@gmail.com",
        company: null,
        use_case: "Testing",
        created_at: "2024-11-01 11:00:00"
    },
    {
        name: "raja bhaiya",
        email: "sharmashorya086@gmail.com",
        company: null,
        use_case: "Development",
        created_at: "2024-11-02 09:15:00"
    },
    {
        name: "Manish sharma",
        email: "sharmasubh785@gmail.com",
        company: null,
        use_case: "Testing",
        created_at: "2024-11-02 14:20:00"
    },
    {
        name: "Golu sharma",
        email: "triunex.work@gmail.com",
        company: null,
        use_case: "Work",
        created_at: "2024-11-03 08:45:00"
    },
    {
        name: "Rahul chaubey",
        email: "reflera.founder@gmail.com",
        company: null,
        use_case: "Business",
        created_at: "2024-11-03 16:30:00"
    },
    {
        name: "Mamta Sharma",
        email: "shirishivaya1986@gmail.com",
        company: null,
        use_case: "Personal",
        created_at: "2024-11-04 12:00:00"
    }
];

const dbPath = process.env.DB_PATH || path.join(__dirname, 'lumina_waitlist.db');
console.log(`Using database: ${dbPath}`);

const db = new Database(dbPath);

try {
    const insert = db.prepare(`
        INSERT INTO waitlist (name, email, company, use_case, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO NOTHING
    `);
    
    let imported = 0;
    let skipped = 0;
    
    for (const entry of entries) {
        try {
            const result = insert.run(
                entry.name,
                entry.email,
                entry.company,
                entry.use_case,
                entry.created_at
            );
            
            if (result.changes > 0) {
                imported++;
                console.log(`✅ Imported: ${entry.email}`);
            } else {
                skipped++;
                console.log(`⏭️  Skipped: ${entry.email}`);
            }
        } catch (err) {
            console.error(`❌ Error importing ${entry.email}:`, err.message);
        }
    }
    
    const count = db.prepare('SELECT COUNT(*) as count FROM waitlist').get();
    
    console.log(`\n📊 Import Summary:`);
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📧 Total in database: ${count.count}`);
    
} catch (error) {
    console.error('Import error:', error);
} finally {
    db.close();
}
