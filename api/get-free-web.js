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

// 💡 تابع کمکی: نرمال‌سازی شماره تلفن برای مقایسه (حذف ۰ ابتدایی)
function normalizePhone(num) {
    if (!num) return '';
    const str = num.toString().trim();
    // اگر با '0' شروع شده بود، آن را حذف کن (مثلاً '0911...' می‌شود '911...')
    return str.startsWith('0') ? str.substring(1) : str;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: 'شماره تماس الزامی است.' });
    }

    try {
        const doc = await getDoc();
        const sheet = doc.sheetsByTitle[FREE_SHEET_TITLE];
        if (!sheet) {
            return res.status(500).json({ success: false, error: 'شیت تست رایگان یافت نشد.' });
        }

        await sheet.loadHeaderRow(1);
        const rows = await sheet.getRows();

        // 💡 اصلاح ۱: ایجاد نسخه امن شماره تلفن برای ذخیره در گوگل شیت
        // افزودن کوتیشن تکی (') باعث می‌شود گوگل شیت آن را حتماً به عنوان متن ذخیره کند.
        const safePhone = phone ? `'${phone}` : '';
        
        // 💡 اصلاح ۲: نرمال‌سازی شماره ورودی برای مقایسه تکراری (برای سازگاری با داده‌های قدیمی)
        const normalizedInputPhone = normalizePhone(phone);

        // 1. بررسی تکراری بودن شماره با استفاده از نرمال‌سازی
        const existingRow = rows.find(row => {
            const storedPhone = row.get('phone');
            if (!storedPhone) return false;
            
            // نرمال‌سازی مقدار ذخیره‌شده نیز
            const normalizedStoredPhone = normalizePhone(storedPhone);
            
            // مقایسه مقادیر نرمال‌سازی شده
            return normalizedStoredPhone === normalizedInputPhone;
        });
        
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
        const trackingId = 'FreeWeb-' + Date.now();
        const link = availableRow.get('link');

        availableRow.set('status', 'used');
        // 💡 اصلاح ۳: استفاده از safePhone برای ذخیره‌سازی صحیح با '0' ابتدایی
        availableRow.set('phone', safePhone); 
        availableRow.set('purchaseDate', today);
        availableRow.set('trackingId', trackingId);
        availableRow.set('platform', 'web');

        await availableRow.save();

        return res.status(200).json({
            success: true,
            link: link,
            message: 'لینک اشتراک تست با موفقیت برای شما ارسال شد.'
        });

    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ success: false, error: 'خطای سرور.' });
    }
};
