const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// -----------------------------------------
// 1. WHATSAPP CONNECTION SETUP
// -----------------------------------------
let isClientReady = false;

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        handleSIGINT: false,
        // FIX: Ignore SSL certificate errors to prevent ERR_CERT_AUTHORITY_INVALID
        ignoreHTTPSErrors: true, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
        ],
        navigationTimeout: 60000,
    }
});

// Event: QR Code generation
whatsappClient.on('qr', (qr) => {
    isClientReady = false;
    console.log('\n📱 SCAN THIS QR CODE WITH YOUR PHONE:');
    qrcode.generate(qr, { small: true });
});

// Event: Successfully authenticated
whatsappClient.on('ready', () => {
    isClientReady = true;
    console.log('\n=============================================');
    console.log('✅ TUMMALA FINANCE BOT IS CONNECTED!');
    console.log('=============================================\n');
});

// Event: Disconnected
whatsappClient.on('disconnected', (reason) => {
    isClientReady = false;
    console.log('❌ WhatsApp was logged out:', reason);
    // Suggestion: Re-initialize client if disconnected
    whatsappClient.initialize();
});

// FIX: Global error handler to catch "Detached Frame" or other Puppeteer crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Caught Unhandled Rejection:', reason);
});

whatsappClient.initialize();

// -----------------------------------------
// 2. DATABASE & CONFIG
// -----------------------------------------
const db = new sqlite3.Database('./finance.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        phone TEXT PRIMARY KEY,
        name TEXT,
        age TEXT,
        address TEXT,
        pincode TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        amount TEXT,
        purpose TEXT,
        age TEXT,
        address TEXT,
        pincode TEXT,
        status TEXT
    )`);
});

const runQuery = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const getQuery = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const allQuery = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const otps = new Map(); 

const ADMIN_NUMBERS = ['8317625357', '9398843123', '9347176849'];

const formatWA = (num) => {
    let clean = num.replace(/\D/g, '');
    return (clean.startsWith('91') ? clean : `91${clean}`) + '@c.us';
};

// -----------------------------------------
// 3. API ROUTES: AUTHENTICATION
// -----------------------------------------

app.post('/api/auth/send-otp', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ 
            success: false, 
            message: "WhatsApp bot is starting up. Please wait 1 minute." 
        });
    }

    const { phone, context } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const waId = formatWA(phone);
    otps.set(waId, otp);

    const msg = context === 'SIGNUP' 
        ? `🛡️ *TUMMALA FINANCE - VERIFYING USER*\n\nHello! Your verification code is: *${otp}*` 
        : `🔑 *TUMMALA FINANCE - LOGIN*\n\nYour secure access code is: *${otp}*`;

    try {
        await whatsappClient.sendMessage(waId, msg);
        console.log(`--> OTP [${otp}] sent to ${phone}`);
        res.json({ success: true });
    } catch (e) { 
        console.error("WhatsApp Send Error:", e.message);
        res.status(500).json({ success: false, message: "Failed to send message via WhatsApp." }); 
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { phone, otp } = req.body;
    const waId = formatWA(phone);
    
    if (otps.get(waId) === otp) {
        otps.delete(waId); 
        const raw = phone.replace(/\D/g, '').replace(/^91/, '');
        
        try {
            const user = await getQuery("SELECT * FROM users WHERE phone = ?", [raw]);
            const isAdmin = ADMIN_NUMBERS.includes(raw);
            
            res.json({ 
                success: true, 
                sessionType: isAdmin ? 'ADMIN' : (user ? 'MEMBER' : 'NEW_USER'), 
                userData: user 
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: "Database error" });
        }
    } else {
        res.status(401).json({ success: false, message: "Invalid OTP" });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, age, phone, address, pincode } = req.body;
    const raw = phone.replace(/\D/g, '').replace(/^91/, '');
    
    try {
        await runQuery(
            "INSERT OR REPLACE INTO users (phone, name, age, address, pincode) VALUES (?, ?, ?, ?, ?)",
            [raw, name, age, address, pincode]
        );
        res.json({ success: true, user: { name, age, phone: raw, address, pincode } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// -----------------------------------------
// 4. API ROUTES: LOANS
// -----------------------------------------

app.post('/api/loans/apply', async (req, res) => {
    const { name, phone, amount, purpose } = req.body;
    const rawPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    
    try {
        const userProfile = await getQuery("SELECT * FROM users WHERE phone = ?", [rawPhone]) || {};
        
        await runQuery(
            "INSERT INTO applications (name, phone, amount, purpose, age, address, pincode, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, rawPhone, amount, purpose, userProfile.age || 'N/A', userProfile.address || 'N/A', userProfile.pincode || 'N/A', 'Pending Review']
        );
        
        if (isClientReady) {
            for (const admin of ADMIN_NUMBERS) {
                try {
                    await whatsappClient.sendMessage(formatWA(admin), `💎 *NEW LOAN APPLICATION*\n\n*Name:* ${name}\n*Amount:* ₹${amount}\n*Purpose:* ${purpose}`);
                } catch (err) {
                    console.error(`Failed to notify admin ${admin}`);
                }
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

app.get('/api/loans/all', async (req, res) => {
    try {
        const applications = await allQuery("SELECT * FROM applications");
        res.json(applications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

app.post('/api/loans/update', async (req, res) => {
    const { id, status } = req.body;
    
    try {
        const appRecord = await getQuery("SELECT * FROM applications WHERE id = ?", [id]);
        
        if (appRecord && isClientReady) {
            await runQuery("UPDATE applications SET status = ? WHERE id = ?", [status, id]);
            
            const waId = formatWA(appRecord.phone);
            const customerMsg = `🏦 *TUMMALA FINANCE*\n\nYour loan for ₹${appRecord.amount} is now: *${status}*`;
            
            try {
                await whatsappClient.sendMessage(waId, customerMsg);
                res.json({ success: true });
            } catch(e) {
                res.json({ success: true, warning: "Status updated but message failed to send."});
            }
        } else {
            res.status(404).json({ success: false, message: "Application not found or client not ready." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// -----------------------------------------
// 5. SERVER START
// -----------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});