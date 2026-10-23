const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// لیست تمام شیت‌هایی که باید جستجو شوند
// **اصلاح ۲.۲: اضافه شدن شیت Free**
const SEARCHABLE_SHEETS = ['N1M', 'N2M', 'N3M', 'N6M', 'N1Y', 'N2Y', '1M', '2M', '3M', '6M', '1Y', '2Y', 'Renew', 'Free'];

module.exports = async (req, res) => {
    const { identifier } = req.query;

    if (!identifier) {
        return res.status(400).json({ error: 'شناسه پیگیری (کد رهگیری، لینک اشتراک، ایمیل یا شماره تماس) الزامی است.' });
    }

    try {
        const serviceAccountAuth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        const purchases = [];
        const lowerCaseIdentifier = identifier.toLowerCase();

        for (const sheetTitle of SEARCHABLE_SHEETS) {
            const sheet = doc.sheetsByTitle[sheetTitle];
            if (sheet) {
                await sheet.loadHeaderRow(1);
                const rows = await sheet.getRows();

                rows.forEach(row => {
                    const trackingId = row.get('trackingId') || '';
                    const email = row.get('email') || '';
                    const phone = row.get('phone') || '';
                    const chat_id = row.get('chat_id') || '';
                    const link = row.get('link') || '';
                    const name = row.get('name') || '';

                    // منطق جستجوی اصلاح شده: بررسی تمام فیلدها در تمامی شیت‌ها
                    if (
                        trackingId.toLowerCase() === lowerCaseIdentifier ||
                        email.toLowerCase() === lowerCaseIdentifier ||
                        phone.toLowerCase() === lowerCaseIdentifier ||
                        chat_id.toString().toLowerCase() === lowerCaseIdentifier ||
                        name.toLowerCase() === lowerCaseIdentifier ||
                        link.toLowerCase() === lowerCaseIdentifier
                    ) {
                        purchases.push({
                            plan: (() => {
                                if (sheetTitle === 'Free') return 'اشتراک تست رایگان';
                                if (sheetTitle === 'Renew') return 'تمدید اشتراک';
                                
                                const isNational = sheetTitle.startsWith('N');
                                const core = isNational ? sheetTitle.substring(1) : sheetTitle;
                                
                                let period = '';
                                if (core.includes('M')) {
                                    const months = core.replace('M', '');
                                    const persianNumbers = { '1': 'یک', '2': 'دو', '3': 'سه', '6': 'شش' };
                                    period = (persianNumbers[months] || months) + ' ماهه';
                                } else if (core.includes('Y')) {
                                    const years = core.replace('Y', '');
                                    const persianNumbers = { '1': 'یک', '2': 'دو' };
                                    period = (persianNumbers[years] || years) + ' ساله';
                                }

                                return isNational ? `${period} ملی` : period;
                            })(),
                            date: row.get(sheetTitle === 'Renew' ? 'requestDate' : 'purchaseDate'),
                            link: row.get('link') || null,
                            name: row.get('name'),
                            trackingId: row.get('trackingId'),
                        });
                    }
                });
            }
        }
        
        if (purchases.length > 0) {
            // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
            purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
            return res.status(200).json(purchases);
        } else {
            return res.status(404).json({ error: 'هیچ سفارشی با این شناسه یافت نشد.' });
        }

    } catch (error) {
        console.error('Tracking API Error:', error.message);
        return res.status(500).json({ error: 'خطای داخلی سرور' });
    }
};
