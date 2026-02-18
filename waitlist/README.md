# 🌟 Lumina Waitlist Landing Page

A beautiful, production-ready waitlist landing page with Apple-inspired glassmorphism effects, local MySQL database, and automated email responses.

![Lumina Landing Page](preview.png)

## ✨ Features

- **🎨 Glassmorphism Design**: Apple-inspired liquid glass effects with backdrop blur
- **🗄️ Local MySQL Database**: No external dependencies, complete data ownership
- **📧 Email Automation**: Instant confirmation emails with beautiful HTML templates
- **📊 Real-time Analytics**: Live waitlist counter and position tracking
- **📱 Fully Responsive**: Perfect on all devices from mobile to 4K displays
- **🚀 Production Ready**: Optimized, secure, and scalable
- **⚡ Fast & Lightweight**: Minimal dependencies, maximum performance

## 🎯 What You Get

### Frontend
- Stunning glassmorphism UI inspired by Apple's design language
- Smooth animations and transitions
- Interactive demo window showing email interface
- Real-time form validation
- Success states and loading indicators
- Parallax background effects
- Custom styled scrollbars

### Backend
- Express.js server with MySQL integration
- RESTful API endpoints
- Email automation with Nodemailer
- Admin notifications
- Duplicate detection
- Input validation and sanitization
- Security best practices

### Database
- Optimized MySQL schema
- Indexed for performance
- Analytics tracking built-in
- Easy to extend

## 🚀 Quick Start

### Prerequisites

1. Node.js (v14+)
2. MySQL (v5.7+)
3. Email account for SMTP (Gmail recommended)

### Installation

1. **Clone and navigate:**
   ```bash
   cd waitlist
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Add your wallpaper:**
   - Place your background image as `wallpaper.jpg`

5. **Initialize database:**
   ```bash
   npm run init-db
   ```

6. **Start server:**
   ```bash
   npm start
   ```

7. **Visit:** `http://localhost:3000`

### Or Use Setup Wizard (Windows)

```powershell
.\setup.ps1
```

## 📝 Configuration

### Database (.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lumina_waitlist
```

### Email (.env)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@example.com
```

**Gmail Setup:**
1. Enable 2-Factor Authentication
2. Generate App Password (Google Account → Security → App passwords)
3. Use app password in `.env`

## 🎨 Customization

### Change Colors

Edit `styles.css`:
```css
:root {
    --glass-bg: rgba(255, 255, 255, 0.08);
    --accent-color: #007aff;
    --success-color: #10b981;
}
```

### Modify Email Templates

Edit `server.js` → `sendConfirmationEmail()` function

### Update Content

Edit `index.html` for text and structure

## 📊 API Endpoints

### Join Waitlist
```bash
POST /api/waitlist/join
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "useCase": "customer-support"
}
```

### Get Count
```bash
GET /api/waitlist/count
```

## 🗄️ Database Schema

### waitlist
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(255) | User's name |
| email | VARCHAR(255) | Unique email |
| company | VARCHAR(255) | Optional company |
| use_case | VARCHAR(100) | Selected use case |
| created_at | TIMESTAMP | Signup time |

### waitlist_analytics
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| event_type | VARCHAR(50) | Event name |
| email | VARCHAR(255) | User email |
| metadata | JSON | Additional data |
| created_at | TIMESTAMP | Event time |

## 🚀 Production Deployment

### 1. Environment
```env
NODE_ENV=production
APP_URL=https://yourdomain.com
```

### 2. Process Manager
```bash
npm install -g pm2
pm2 start server.js --name lumina-waitlist
pm2 save
pm2 startup
```

### 3. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com
```

## 🔒 Security Features

- ✅ Input validation (validator.js)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Email validation
- ✅ Duplicate detection
- ✅ CORS protection
- ✅ Environment variable management
- ✅ Rate limiting ready

## 📱 Responsive Breakpoints

- 📱 Mobile: 320px - 768px
- 💻 Tablet: 768px - 1024px
- 🖥️ Desktop: 1024px+
- 🖼️ Large: 1920px+

## 🎯 Use Cases Supported

- Customer Support Automation
- Sales & Lead Generation
- Data Entry & Processing
- Social Media Management
- Research & Analysis
- Custom use cases

## 📧 Email Features

### User Confirmation Email
- Welcome message
- Waitlist position
- Next steps
- Call-to-action button
- Beautiful HTML design

### Admin Notification
- Real-time alerts
- User details
- Use case information
- Signup timestamp

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Node.js, Express.js
- **Database**: MySQL 2
- **Email**: Nodemailer
- **Validation**: Validator.js
- **Environment**: dotenv

## 📈 Performance

- ⚡ Fast page load (~1s)
- 🎯 Optimized animations (60fps)
- 📦 Minimal bundle size
- 🗄️ Indexed database queries
- 🔄 Connection pooling

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env
```

### Email Not Sending
```bash
# Test SMTP connection
# Check app-specific password
# Review server logs
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001
```

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Detailed setup instructions
- [API Documentation](#-api-endpoints) - Endpoint reference
- [Deployment Guide](#-production-deployment) - Production setup

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this for your projects!

## 🙏 Credits

- Design inspired by Apple's design language
- Glassmorphism effects using modern CSS
- Icons and animations custom-built

## 📞 Support

Need help? Check:
1. [Quick Start Guide](QUICKSTART.md)
2. Server logs: `npm start` output
3. Browser console (F12)
4. Database connection

---

Made with ❤️ for beautiful waitlist pages

**Ready to launch?** Follow the [Quick Start](#-quick-start) guide above!
