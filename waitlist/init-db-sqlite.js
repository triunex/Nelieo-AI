require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase() {
    console.log('🔄 Initializing SQLite database...');
    
    try {
        // Create database file
        const dbPath = path.join(__dirname, 'lumina_waitlist.db');
        const db = new Database(dbPath);
        
        console.log(`✅ Database file created at: ${dbPath}`);

        // Create waitlist table
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
        
        console.log('✅ Waitlist table created/verified');

        // Create analytics table for tracking
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
        
        console.log('✅ Analytics table created/verified');

        // Get current count
        const result = db.prepare('SELECT COUNT(*) as count FROM waitlist').get();
        
        db.close();
        
        console.log(`
╔════════════════════════════════════════╗
║   Database Setup Complete! ✨          ║
║                                        ║
║   Database: lumina_waitlist.db        ║
║   Tables: waitlist, waitlist_analytics║
║   Current signups: ${String(result.count).padEnd(19)} ║
╚════════════════════════════════════════╝

Next steps:
1. Configure your .env file with SMTP settings (optional)
2. Run: npm start
3. Visit: http://localhost:3001
        `);

    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

initializeDatabase();
