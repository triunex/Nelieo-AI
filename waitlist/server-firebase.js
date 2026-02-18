require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
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

// Initialize Firebase Admin SDK
let db;
try {
    // For Render: use environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            })
        });
        console.log('✅ Firebase initialized with environment credentials');
    } 
    // For local development: use service account file
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase initialized with service account file');
    } else {
        throw new Error('Firebase credentials not configured');
    }
    
    db = admin.firestore();
    console.log('✅ Connected to Firestore');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.error('\nPlease set these environment variables:');
    console.error('  FIREBASE_PROJECT_ID');
    console.error('  FIREBASE_CLIENT_EMAIL');
    console.error('  FIREBASE_PRIVATE_KEY');
    process.exit(1);
}

// Email provider selection
let emailProvider = null;
let resend = null;
let sendgrid = null;

if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
    emailProvider = 'resend';
    console.log('✅ Email provider: Resend');
} else if (process.env.SENDGRID_API_KEY) {
    sendgrid = require('@sendgrid/mail');
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    emailProvider = 'sendgrid';
    console.log('✅ Email provider: SendGrid');
} else {
    console.log('⚠️  No email provider configured. Running in mock email mode.');
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
        const existingSnapshot = await db.collection('waitlist')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            return res.status(409).json({
                success: false,
                message: 'This email is already on the waitlist'
            });
        }

        // Add to Firestore
        const docRef = await db.collection('waitlist').add({
            name,
            email,
            company: company || null,
            use_case: useCase,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Get total count
        const countSnapshot = await db.collection('waitlist').count().get();
        const position = countSnapshot.data().count;

        // Send confirmation email
        try {
            await sendConfirmationEmail(email, name, position);
        } catch (emailError) {
            console.error('Email send error:', emailError);
        }

        // Send admin notification
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
        const countSnapshot = await db.collection('waitlist').count().get();
        res.json({
            success: true,
            count: countSnapshot.data().count
        });
    } catch (error) {
        console.error('Count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get count'
        });
    }
});

// Admin endpoint to view all waitlist entries
app.get('/api/admin/waitlist', async (req, res) => {
    try {
        const { secret } = req.query;
        
        if (secret !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        
        const snapshot = await db.collection('waitlist')
            .orderBy('created_at', 'desc')
            .get();
        
        const entries = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            entries.push({
                id: doc.id,
                name: data.name,
                email: data.email,
                company: data.company,
                use_case: data.use_case,
                created_at: data.created_at ? data.created_at.toDate().toISOString() : null
            });
        });
        
        res.json({
            success: true,
            count: entries.length,
            entries: entries
        });
    } catch (error) {
        console.error('Admin fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch entries' });
    }
});

// Email functions
async function sendConfirmationEmail(email, name, position) {
    if (!emailProvider) {
        console.log(`📧 [Mock] Would send confirmation to ${email}`);
        return;
    }

    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;padding:0;margin:0;background:#fafafa}
                .email-wrapper{max-width:600px;margin:0 auto;background:#fff}
                .header{padding:40px 40px 24px;background:#000;text-align:center}
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
                <div class="content"><p>Thanks for joining! You're officially on the waitlist for early access to Nelieo.</p><p>We'll keep you updated as we get closer to launch.</p></div>
                <div class="footer"><p style="color:#666;font-size:14px">© 2025 Nelieo. All rights reserved.</p></div>
            </div>
        </body>
        </html>
    `;

    try {
        if (emailProvider === 'resend') {
            await resend.emails.send({
                from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
                to: email,
                subject: `You're #${position} on the Nelieo Waitlist!`,
                html: htmlBody
            });
        } else if (emailProvider === 'sendgrid') {
            await sendgrid.send({
                from: process.env.FROM_EMAIL || 'noreply@nelieo.com',
                to: email,
                subject: `You're #${position} on the Nelieo Waitlist!`,
                html: htmlBody
            });
        }
        console.log(`✅ Confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Email send failed:', error);
        throw error;
    }
}

async function sendAdminNotification(name, email, company, useCase, position) {
    if (!process.env.ADMIN_EMAIL || !emailProvider) {
        return;
    }

    const htmlBody = `
        <h2>New Waitlist Signup</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Use Case:</strong> ${useCase}</p>
        <p><strong>Position:</strong> #${position}</p>
    `;

    try {
        if (emailProvider === 'resend') {
            await resend.emails.send({
                from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
                to: process.env.ADMIN_EMAIL,
                subject: `New Waitlist Signup: ${name}`,
                html: htmlBody
            });
        } else if (emailProvider === 'sendgrid') {
            await sendgrid.send({
                from: process.env.FROM_EMAIL || 'noreply@nelieo.com',
                to: process.env.ADMIN_EMAIL,
                subject: `New Waitlist Signup: ${name}`,
                html: htmlBody
            });
        }
    } catch (error) {
        console.error('Admin notification failed:', error);
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'firebase' });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Nelieo Waitlist Server Running      ║
║   Port: ${PORT}                           ║
║   Database: Firebase Firestore         ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    process.exit(0);
});
