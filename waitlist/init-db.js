require('dotenv').config();
const mysql = require('mysql2/promise');

async function initializeDatabase() {
    console.log('🔄 Initializing database...');
    
    try {
        // Connect to MySQL without database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        // Create database
        const dbName = process.env.DB_NAME || 'lumina_waitlist';
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        console.log(`✅ Database '${dbName}' created/verified`);

        // Use database
        await connection.query(`USE ${dbName}`);

        // Create waitlist table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS waitlist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                company VARCHAR(255),
                use_case VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Waitlist table created/verified');

        // Create analytics table for tracking
        await connection.query(`
            CREATE TABLE IF NOT EXISTS waitlist_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                email VARCHAR(255),
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_event_type (event_type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Analytics table created/verified');

        await connection.end();
        
        console.log(`
╔════════════════════════════════════════╗
║   Database Setup Complete! ✨          ║
║                                        ║
║   Database: ${dbName.padEnd(27)} ║
║   Tables: waitlist, waitlist_analytics║
╚════════════════════════════════════════╝

Next steps:
1. Configure your .env file with SMTP settings
2. Run: npm start
3. Visit: http://localhost:3000
        `);

    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        console.error('\nMake sure MySQL is running and credentials are correct in .env file');
        process.exit(1);
    }
}

initializeDatabase();
