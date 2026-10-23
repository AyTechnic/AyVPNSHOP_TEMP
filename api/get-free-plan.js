const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const FREE_SHEET_TITLE = 'Free';

async function getDoc() {
    const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { chat_id } = req.body;

    if (!chat_id) {
        return res.status(400).json({ success: false, error: 'Chat ID الزامی است.' });
    }

    try {
        const doc = await getDoc();
        const sheet = doc.sheetsByTitle[FREE_SHEET_TITLE];
        if (!sheet) {
            return res.status(500).json({ success: false, error: 'شیت تست رایگان یافت نشد.' });
        }

        await sheet.loadHeaderRow(1);
        const rows = await sheet.getRows();

        // 1. بررسی تکراری بودن Chat ID
        const existingRow = rows.find(row => row.get('chat_id') === chat_id.toString());
        if (existingRow) {
            return res.status(400).json({ success: false, error: 'شما قبلاً از اشتراک تست استفاده کرده‌اید.' });
        }

        // 2. یافتن اولین لینک آزاد
        const availableRow = rows.find(row => !row.get('status') || row.get('status').toLowerCase() !== 'used');

        if (!availableRow) {
            return res.status(404).json({ success: false, error: 'متأسفانه ظرفیت اشتراک تست تکمیل شده است.' });
        }

        // 3. تخصیص لینک
        const today = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
        const trackingId = 'FreeBot-' + Date.now();
        const link = availableRow.get('link');

        availableRow.set('status', 'used');
        availableRow.set('chat_id', chat_id.toString());
        availableRow.set('purchaseDate', today);
        availableRow.set('trackingId', trackingId);
        availableRow.set('platform', 'bot');

        await availableRow.save();

        return res.status(200).json({ success: true, link: link });

    } catch (error) {
        console.error('Get Free Plan API Error:', error);
        return res.status(500).json({ success: false, error: 'خطای سرور در دریافت اشتراک.' });
    }
};