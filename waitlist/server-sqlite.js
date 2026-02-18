require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const validator = require('validator');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// SQLite database connection - supports production environment variable
const dbPath = process.env.DB_PATH || path.join(__dirname, 'lumina_waitlist.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

console.log(`✅ Connected to SQLite database: ${dbPath}`);

// Ensure database schema exists (safe idempotent initialization)
try {
    console.log('📋 Ensuring DB schema...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            company TEXT,
            use_case TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_email ON waitlist(email);
        CREATE INDEX IF NOT EXISTS idx_created_at ON waitlist(created_at);

        CREATE TABLE IF NOT EXISTS waitlist_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            email TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_event_type ON waitlist_analytics(event_type);
        CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON waitlist_analytics(created_at);
    `);
    console.log('✅ DB schema ready');
} catch (err) {
    console.error('❌ Failed to initialize DB schema:', err);
}

// Email provider selection: Resend preferred, SendGrid fallback, otherwise mock
let emailProvider = null;
let resend = null;
let sendgrid = null;
if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
    emailProvider = 'resend';
    console.log('✅ Email provider: Resend');
} else if (process.env.SENDGRID_API_KEY) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgrid = sgMail;
    emailProvider = 'sendgrid';
    console.log('✅ Email provider: SendGrid');
} else {
    console.log('⚠️  No email provider configured. Running in mock email mode.');
    console.log('To enable emails, set RESEND_API_KEY or SENDGRID_API_KEY in Render environment');
}

// Seed initial data if SEED_DATA environment variable is set
if (process.env.SEED_DATA === 'true') {
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
    for (const entry of seedData) {
        try {
            const result = insert.run(entry.name, entry.email, entry.company, entry.use_case, entry.created_at);
            if (result.changes > 0) seeded++;
        } catch (err) {
            // Ignore duplicates
        }
    }
    
    if (seeded > 0) {
        console.log(`✅ Seeded ${seeded} initial waitlist entries`);
    }
}

// API Routes

// Join waitlist
app.post('/api/waitlist/join', async (req, res) => {
    try {
        const { name, email, company, useCase } = req.body;

        // Validation
        if (!name || !email || !useCase) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and use case are required'
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
        }

        // Check if email already exists
        const existing = db.prepare('SELECT id FROM waitlist WHERE email = ?').get(email);

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'This email is already on the waitlist'
            });
        }

        // Insert into database
        const insert = db.prepare('INSERT INTO waitlist (name, email, company, use_case) VALUES (?, ?, ?, ?)');
        const result = insert.run(name, email, company || null, useCase);

        // Get total count
        const countResult = db.prepare('SELECT COUNT(*) as total FROM waitlist').get();
        const position = countResult.total;

        // Send confirmation email
        try {
            await sendConfirmationEmail(email, name, position);
        } catch (emailError) {
            console.error('Email send error:', emailError);
            // Don't fail the request if email fails
        }

        // Send notification to admin
        try {
            await sendAdminNotification(name, email, company, useCase, position);
        } catch (adminEmailError) {
            console.error('Admin notification error:', adminEmailError);
        }

        res.json({
            success: true,
            message: 'Successfully joined the waitlist',
            position: position,
            totalCount: position
        });

    } catch (error) {
        console.error('Waitlist join error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join waitlist. Please try again.'
        });
    }
});

// Get waitlist count
app.get('/api/waitlist/count', async (req, res) => {
    try {
        const result = db.prepare('SELECT COUNT(*) as total FROM waitlist').get();
        res.json({
            success: true,
            count: result.total
        });
    } catch (error) {
        console.error('Count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get count'
        });
    }
});

// Email Templates

async function sendConfirmationEmail(email, name, position) {
    if (!emailProvider) {
        console.log(`📧 [Mock] Would send confirmation email to ${email} (position ${position})`);
        return;
    }

    try {
        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height:1.6; color:#1a1a1a; background:#fff; padding:0; margin:0; }
                    .email-wrapper{max-width:600px;margin:0 auto;background:#fff}
                    .header{padding:48px 40px 32px;text-align:center;background:#000;border-bottom:1px solid #e5e5e5}
                    .logo{font-size:28px;font-weight:700;color:#fff;margin-bottom:16px}
                    .hero{padding:48px 40px;text-align:center;background:#fafafa}
                    .hero-title{font-size:32px;font-weight:700;color:#000;margin-bottom:12px}
                    .position-badge{display:inline-block;padding:16px 32px;background:#000;color:#fff;font-size:24px;font-weight:700;border-radius:8px}
                    .content{padding:48px 40px;background:#fff}
                    .footer{padding:40px 40px 48px;text-align:center;background:#fff}
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header"><div class="logo">nelieo</div></div>
                    <div class="hero"><h1 class="hero-title">You're on the Waitlist!</h1><p>Hi ${name}</p><div class="position-badge">Position #${position}</div></div>
                    <div class="content"><p>Thanks for joining the Nelieo waitlist — we’ll be in touch.</p></div>
                    <div class="footer"><p>© 2025 Nelieo</p></div>
                </div>
            </body>
            </html>`;

        const fromAddress = process.env.FROM_EMAIL || 'Nelieo <onboarding@resend.dev>';

        if (emailProvider === 'resend') {
            const emailData = { from: fromAddress, to: email, subject: "Welcome to Nelieo — You're In! 🚀", html: htmlBody };
            const { data, error } = await resend.emails.send(emailData);
            if (error) { console.error(`❌ Failed to send confirmation email to ${email}:`, error.message || error); throw error; }
            return data;
        } else if (emailProvider === 'sendgrid') {
            const msg = { to: email, from: fromAddress, subject: "Welcome to Nelieo — You're In! 🚀", html: htmlBody };
            const [response] = await sendgrid.send(msg);
            return response;
        }
    } catch (error) {
        console.error(`❌ Failed to send confirmation email to ${email}:`, error.message || error);
        throw error;
    }
}

async function sendAdminNotification(name, email, company, useCase, position) {
    if (!process.env.ADMIN_EMAIL) return;

    if (!emailProvider) {
        console.log(`📧 [Mock] Would send admin notification for ${name} (${email})`);
        return;
    }

    try {
        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;padding:20px;background:#fafafa} .container{background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e5e5}</style>
            </head>
            <body>
                <div class="container">
                    <h1>New Waitlist Signup</h1>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    <p><strong>Company:</strong> ${company || 'Not specified'}</p>
                    <p><strong>Use case:</strong> ${useCase}</p>
                    <p>Position: ${position}</p>
                </div>
            </body>
            </html>`;

        const fromAddress = process.env.FROM_EMAIL || 'Nelieo Waitlist <onboarding@resend.dev>';

        if (emailProvider === 'resend') {
            const emailData = { from: fromAddress, to: process.env.ADMIN_EMAIL, subject: `🎉 New Signup: ${name} (#${position})`, html: htmlBody };
            const { data, error } = await resend.emails.send(emailData);
            if (error) { console.error(`❌ Failed to send admin notification for ${name}:`, error.message || error); throw error; }
            return data;
        } else if (emailProvider === 'sendgrid') {
            const msg = { to: process.env.ADMIN_EMAIL, from: fromAddress, subject: `🎉 New Signup: ${name} (#${position})`, html: htmlBody };
            const [response] = await sendgrid.send(msg);
            return response;
        }
    } catch (error) {
        console.error(`❌ Failed to send admin notification for ${name}:`, error.message || error);
        throw error;
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root
// Bulk import endpoint (for data migration)
app.post('/api/waitlist/import', async (req, res) => {
    try {
        const { entries, secret } = req.body;
        
        // Simple secret key protection
        if (secret !== process.env.IMPORT_SECRET) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        if (!Array.isArray(entries)) {
            return res.status(400).json({ success: false, error: 'Entries must be an array' });
        }
        
        const insert = db.prepare(`
            INSERT INTO waitlist (name, email, company, use_case, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO NOTHING
        `);
        
        let imported = 0;
        let skipped = 0;
        
        for (const entry of entries) {
            try {
                insert.run(
                    entry.name,
                    entry.email,
                    entry.company || null,
                    entry.use_case,
                    entry.created_at
                );
                imported++;
            } catch (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    skipped++;
                } else {
                    console.error('Import entry error:', err);
                }
            }
        }
        
        const count = db.prepare('SELECT COUNT(*) as count FROM waitlist').get();
        
        res.json({
            success: true,
            imported,
            skipped,
            totalNow: count.count
        });
        
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ success: false, error: 'Import failed' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Nelieo Waitlist Server Running      ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    db.close();
    process.exit(0);
});
