require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const validator = require('validator');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lumina_waitlist',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Email transporter setup (optional for testing)
let transporter = null;
const emailConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

if (emailConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Verify email configuration
    transporter.verify((error, success) => {
        if (error) {
            console.log('⚠️  Email configuration error:', error.message);
            console.log('Email notifications will be disabled');
            transporter = null;
        } else {
            console.log('✅ Email server ready');
        }
    });
} else {
    console.log('⚠️  Email not configured - running without email notifications');
    console.log('To enable emails, set SMTP_USER and SMTP_PASS in .env file');
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
        const [existing] = await pool.query(
            'SELECT id FROM waitlist WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This email is already on the waitlist'
            });
        }

        // Insert into database
        const [result] = await pool.query(
            'INSERT INTO waitlist (name, email, company, use_case, created_at) VALUES (?, ?, ?, ?, NOW())',
            [name, email, company || null, useCase]
        );

        // Get total count
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM waitlist');
        const position = countResult[0].total;

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
        const [result] = await pool.query('SELECT COUNT(*) as total FROM waitlist');
        res.json({
            success: true,
            count: result[0].total
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
    if (!transporter) {
        console.log(`📧 [Mock] Would send confirmation email to ${email} (position ${position})`);
        return;
    }
    
    const mailOptions = {
        from: `"Lumina" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "You're on the Lumina Waitlist! 🎉",
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 16px;
                        padding: 40px;
                        color: white;
                        text-align: center;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: 700;
                        margin-bottom: 20px;
                    }
                    .position {
                        font-size: 48px;
                        font-weight: 700;
                        margin: 20px 0;
                        background: rgba(255, 255, 255, 0.2);
                        padding: 20px;
                        border-radius: 12px;
                    }
                    .content {
                        background: white;
                        color: #333;
                        padding: 30px;
                        border-radius: 12px;
                        margin-top: 30px;
                        text-align: left;
                    }
                    .button {
                        display: inline-block;
                        padding: 14px 32px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        margin-top: 20px;
                        font-weight: 600;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">✨ lumina</div>
                    <h1>Welcome to the Future!</h1>
                    <p>Hi ${name},</p>
                    <p>You're officially on the waitlist for Lumina - Autonomous Cloud Employees</p>
                    <div class="position">
                        Position #${position}
                    </div>
                </div>
                
                <div class="content">
                    <h2>What's Next?</h2>
                    <p>🚀 <strong>Early Access:</strong> You'll be among the first to try Lumina when we launch</p>
                    <p>📧 <strong>Updates:</strong> We'll keep you posted on our progress and new features</p>
                    <p>💡 <strong>Exclusive:</strong> Get insider tips on how to maximize Lumina for your use case</p>
                    
                    <p style="margin-top: 30px;">We're working hard to build something incredible. Get ready to automate your workflow like never before!</p>
                    
                    <center>
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">
                            Learn More About Lumina
                        </a>
                    </center>
                </div>
                
                <div class="footer">
                    <p>© 2025 Lumina. All rights reserved.</p>
                    <p>You're receiving this because you joined our waitlist.</p>
                </div>
            </body>
            </html>
        `
    };

    return transporter.sendMail(mailOptions);
}

async function sendAdminNotification(name, email, company, useCase, position) {
    if (!process.env.ADMIN_EMAIL) return;
    
    if (!transporter) {
        console.log(`📧 [Mock] Would send admin notification for ${name} (${email})`);
        return;
    }

    const mailOptions = {
        from: `"Lumina Waitlist" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Waitlist Signup (#${position})`,
        html: `
            <h2>New Waitlist Signup</h2>
            <p><strong>Position:</strong> #${position}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || 'N/A'}</p>
            <p><strong>Use Case:</strong> ${useCase}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `
    };

    return transporter.sendMail(mailOptions);
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Lumina Waitlist Server Running      ║
║   Port: ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await pool.end();
    process.exit(0);
});
