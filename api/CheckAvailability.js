/**
 * AyVPN-Shop - Inventory Checker API
 * Path: api/CheckAvailability.js
 * Developer: shaam-my
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// متغیرهای محیطی استخراج شده از پروژه شما (هماهنگ با verify.js)
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

async function checkStock(req, res) {
    const { planTitle } = req.query; 

    // لیست دقیق پلن‌ها بر اساس فایل start-payment.js و index.html شما
    const validPlans = [
        '1M', '2M', '3M', '6M', '1Y', '2Y',      // Unlimited Plans
        'N1M', 'N2M', 'N3M', 'N6M', 'N1Y', 'N2Y' // National Plans
    ];

    if (!planTitle || !validPlans.includes(planTitle)) {
        return res.status(400).json({ error: 'Plan title is invalid or missing' });
    }

    try {
        const serviceAccountAuth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle[planTitle];
        if (!sheet) {
            console.error(`Sheet "${planTitle}" not found.`);
            return res.status(404).json({ error: 'Sheet not found' });
        }

        const rows = await sheet.getRows();
        
        // بررسی وجود ردیفی که وضعیت آن دقیقا unused باشد
        const availableRows = rows.filter(row => {
            const statusValue = (row.get('Status') || row.get('status') || '').toString().toLowerCase().trim();
            return statusValue === 'unused';
        });

        const isAvailable = availableRows.length > 0;

        return res.json({
            plan: planTitle,
            available: isAvailable,
            count: availableRows.length
        });

    } catch (error) {
        console.error('CheckAvailability Error:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = checkStock;