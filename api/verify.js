const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

// --- متغیرهای محیطی ----
const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = '5976170456'; // آیدی ادمین

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

const RENEW_SHEET_TITLE = 'Renew';
const COUPON_SHEET_TITLE = 'Coupen';

// --- تابع کمکی برای اتصال به گوگل شیت ---
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

// --- تابع کمکی برای نمایش قیمت به تومان ---
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('fa-IR') + ' تومان';
}

// 💡 تابع جدید: ساخت صفحه HTML برای خطاها، شکست‌ها و موارد ناموفق
function generateFailurePage(title, message, details = null) {
    const color = '#dc3545'; // رنگ قرمز برای خطا
    
    return `
    <!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @font-face {
            font-family: 'Vazirmatn';
            src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Medium.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
        }
        body{font-family: Vazirmatn, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; text-align: center; margin: 0;} 
        .container{background: #fff; padding: 40px 20px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 450px; width: 90%; margin: 20px; border-top: 8px solid #f8d7da;} 
        h1{color: ${color}; font-size: 1.8rem;} 
        .message-box{background: #f8d7da; color: #212529; padding: 15px; border-radius: 10px; margin: 20px 0; border-right: 5px solid ${color}; line-height: 1.8;}
        p { line-height: 1.8; }
        .details-code { display: block; font-size: 0.9rem; color: #6c757d; margin-top: 15px; word-break: break-all;}
        .button { background: ${color}; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; margin-top: 25px; display: inline-block; font-weight: bold; }
    </style></head><body><div class="container">
        <h1>${title}</h1>
        <div class="message-box">${message}</div>
        ${details ? `<span class="details-code">شناسه: ${details}</span>` : ''}
        <a href="/" class="button">بازگشت به صفحه اصلی</a>
    </div></body></html>`;
}

// --- تابع ساخت صفحه HTML موفقیت ---
function generateSuccessPage(details) {
    const { trackingId, userLink, name, requestedUsers, isRenewal, renewalIdentifier } = details;
    const color = '#28a745'; // رنگ سبز برای موفقیت

    if (isRenewal) {
        return `
        <!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>درخواست تمدید ثبت شد</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @font-face { font-family: 'Vazirmatn'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Medium.woff2') format('woff2'); font-weight: 500; font-display: swap; }
            body{font-family: Vazirmatn, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; text-align: center; margin: 0;} 
            .container{background: #fff; padding: 40px 20px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 450px; width: 90%; margin: 20px; border-top: 8px solid #007bff;} 
            .icon { padding-top: 10px; animation: pop 0.5s ease-out; width: 70px; height: 60px; background-color: #007bff; color: white; border-radius: 50%; display: inline-flex; justify-content: center; align-items: center; font-size: 3rem; margin-bottom: 5px; line-height: 70px; }
            h1{color: #007bff; font-size: 1.8rem;} 
            code{display: block; background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; word-break: break-all;}
            .success-msg { color: ${color}; font-weight: bold; margin-top: 20px; }
            .button { background: ${color}; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; margin-top: 25px; display: inline-block; font-weight: bold; }
        </style></head><body><div class="container">
            <div class="icon">✓</div>
            <h1>درخواست تمدید ثبت شد!</h1>
            <p>درخواست شما با موفقیت ثبت گردید و به زودی توسط تیم پشتیبانی بررسی خواهد شد.</p>
            <p><strong>شناسه/لینک شما:</strong> <code>${renewalIdentifier}</code></p>
            <p>کد پیگیری: <strong>${trackingId}</strong></p>
            <p class="success-msg">نتیجه تمدید و فعالسازی مجدد اشتراک شما اطلاع‌رسانی خواهد شد.</p>
            <a href="/" class="button">بازگشت به صفحه اصلی</a>
        </div></body></html>`;
    }

    return `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>پرداخت موفق - Ay Technic</title>
        <style>
            @font-face { font-family: 'Vazirmatn'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Bold.woff2') format('woff2'); font-weight: bold; }
            @font-face { font-family: 'Vazirmatn'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Regular.woff2') format('woff2'); font-weight: normal; }
            :root { --primary-color: #007bff; --success-color: #28a745; --bg-color: #f0f2f5; --card-bg: #ffffff; --text-color: #333; --border-color: #e0e0e0; }
            body { font-family: 'Vazirmatn', sans-serif; background: var(--bg-color); display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
            .container { background: var(--card-bg); border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 100%; max-width: 500px; padding: 30px; text-align: center; border-top: 8px solid var(--success-color); }
            .icon { padding-top: 10px; animation: pop 0.5s ease-out; width: 70px; height: 60px; background-color: #28a745; color: white; border-radius: 50%; display: inline-flex; justify-content: center; align-items: center; font-size: 3rem; margin-bottom: 5px; line-height: 70px; }
            @keyframes pop { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }
            h1 { color: #28a745; font-weight: bold; margin: 20px 0 10px; }
            p { color: #666; font-size: 1.1rem; }
            .subscription-box { background: #f8f9fa; border: 1px dashed var(--border-color); border-radius: 12px; padding: 20px; margin-top: 30px; position: relative; }
            .subscription-link { font-family: monospace; font-size: 1.2rem; word-break: break-all; color: var(--primary-color); font-weight: bold; }
            .actions { display: flex; justify-content: center; gap: 15px; margin-top: 20px; }
			.actions button { background: none; border: 2px solid #28a745; height: 45px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; flex-grow: 1; padding: 0 10px; font-size: 1rem; font-weight: bold; }
            .actions button:hover { background: #28a745; border-color: #ffffff; }
            .actions button svg { width: 22px; height: 22px; }
			#copyBtn { max-width: 45px; flex-grow: 0; border: 2px solid #007bff; border-radius: 50%; color: #007bff; }
            #copyBtn:hover { background: #28a745; color: #ffffff; border: 2px solid #ffffff;  }
			#openBtn { background: #28a745; border-radius: 12px; color: #ffffff; display: flex; flex-direction: row-reverse; gap: 8px; }
            #openBtn:hover { background: #007bff; color: #ffffff; border: 2px solid #ffffff; }
            .timer { margin-top: 30px; }
            .timer-svg { width: 80px; height: 80px; transform: rotate(-90deg); }
            .timer-svg circle { transition: stroke-dashoffset 1s linear; }
            .timer-text { font-size: 1.8rem; font-weight: bold; color: var(--primary-color); position: relative; top: -67px; }
            .footer-nav { margin-top: 5px; }
            .footer-nav a { text-decoration: none; margin: 0 10px; font-size: 0.9rem; background: #007bff; border: 2px solid; border-color: #007bff; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; margin-top: 25px; display: inline-block; font-weight: bold; }
            .footer-nav a:hover { background: none; color: #007bff; border: 2px solid; border-color: #007bff; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">✓</div>
            <h1>پرداخت موفق</h1>
            <p>${name ? `کاربر گرامی <span style="color: #000;">${name}</span>` : ''}<br>از خرید شما سپاسگزاریم</p>
            <p style="font-size:1rem; color:#000;">تعداد کاربران: <strong> ${requestedUsers} نفر</strong></p>
            <p style="font-size:1rem; color:#000;">کد پیگیری: <strong>${trackingId}</strong></p>

            <div class="subscription-box">
                <code class="subscription-link" id="subLink">${userLink}</code>
                <div class="actions">
                    <button id="openBtn" title="باز کردن لینک"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path></svg><span>نصب</span></button>
                    <button id="copyBtn" title="کپی لینک"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg></button>
                </div>
            </div>

            <div class="timer">
                <svg class="timer-svg">
                    <circle r="35" cx="40" cy="40" fill="transparent" stroke="#e0e0e0" stroke-width="8"></circle>
                    <circle id="timer-circle" r="35" cx="40" cy="40" fill="transparent" stroke="var(--primary-color)" stroke-width="8" stroke-linecap="round" stroke-dasharray="219.9" stroke-dashoffset="0"></circle>
                </svg>
                <div id="timer-text" class="timer-text">5</div>
             <p style="position: relative; top: -45px;">در حال هدایت به صفحه اشتراک شما ...</p>
           </div>
            <div class="footer-nav">
                <a href="https://shaammy.ir">بازگشت به فروشگاه</a>
            </div>
        </div>

        <script>
            const subLink = document.getElementById('subLink').innerText;
            const copyBtn = document.getElementById('copyBtn');
            const openBtn = document.getElementById('openBtn');

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(subLink).then(() => {
                    copyBtn.title = 'کپی شد!';
                    setTimeout(() => { copyBtn.title = 'کپی لینک'; }, 2000);
                });
            });

            openBtn.addEventListener('click', () => {
                window.open(subLink, '_blank');
            });

            let timeLeft = 5;
            const timerText = document.getElementById('timer-text');
            const timerCircle = document.getElementById('timer-circle');
            const circumference = 2 * Math.PI * 35;

            const interval = setInterval(() => {
                timeLeft--;
                timerText.innerText = timeLeft;
                const offset = circumference - (timeLeft / 5) * circumference;
                timerCircle.style.strokeDashoffset = offset;

                if (timeLeft <= 0) {
                    clearInterval(interval);
                    window.open(subLink, '_blank');
                }
            }, 1000);
        <\/script>
    </body></html>`;
}


// --- تابع اصلی API ---
module.exports = async (req, res) => {
    const { Authority, Status, amount, chat_id, name, email, phone, renewalIdentifier, requestedPlan, coupenCode, telegramUsername, telegramId, users, description, coupon100 } = req.query;
    
    // 💡 اضافه کردن کوتیشن تکی (') به ابتدای شماره تلفن برای مجبور کردن گوگل شیت به ذخیره به صورت متن
    const safePhone = phone ? `'${phone}` : '';
    
    // --- تبدیل مبلغ ---
    const amountToman = Number(amount); 
    const amountRial = amountToman * 10; 
    // ---
    
    const isTelegram = chat_id && chat_id !== 'none';
    const isRenewal = renewalIdentifier && renewalIdentifier.length > 0;
    const isFreeCoupon = coupon100 === 'true'; 
    
    // ❌ ۱. کنترل وضعیت ناموفق اولیه از درگاه پرداخت
    if (Status !== 'OK' && !isFreeCoupon) {
        if (isTelegram) await bot.sendMessage(chat_id, '❌ پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.');
        
        // 💡 استفاده از generateFailurePage
        const failurePage = generateFailurePage(
            '❌ پرداخت ناموفق',
            'متاسفانه عملیات پرداخت شما تایید نشد. ممکن است به دلیل لغو تراکنش توسط شما، یا خطای موقت در درگاه پرداخت باشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
            Authority
        );
        return res.status(400).send(failurePage);
    }

    try {
        let trackingId = Authority;

        // **دور زدن زرین‌پال اگر کوپن ۱۰۰٪ باشد**
        if (!isFreeCoupon) {
            const verificationResponse = await fetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchant_id: ZARINPAL_MERCHANT_ID, amount: amountRial, authority: Authority }),
            });
            
            const verificationResult = await verificationResponse.json();
            
            // ❌ ۲. کنترل خطای تایید پرداخت زرین‌پال (اصلاح شده برای پذیرش کد 101)
            const isSuccess = verificationResult.data && (verificationResult.data.code === 100 || verificationResult.data.code === 101);
            if (verificationResult.errors.length > 0 || !isSuccess) {
                console.error('ZarinPal Verification Error JSON:', JSON.stringify(verificationResult, null, 2));
                const errorSource = verificationResult.errors[0] || verificationResult.data;
                const errorMsg = errorSource.message || `کد خطا: ${errorSource.code || 'نامشخص'}`;
                
                // 💡 استفاده از generateFailurePage
                const verificationErrorPage = generateFailurePage(
                    '⚠️ خطای تایید پرداخت',
                    `خطا در تایید پرداخت توسط درگاه (احتمالاً تراکنش نامعتبر، پرداخت تکراری، یا خطای سرور). جزئیات: ${errorMsg}`,
                    Authority
                );
                return res.status(400).send(verificationErrorPage);
            }

            // اختصاص trackingId (در صورت کد 101 ممکن است ref_id خالی باشد)
            trackingId = (verificationResult.data && verificationResult.data.ref_id) 
                ? verificationResult.data.ref_id.toString() 
                : Authority;
        } else {
            trackingId = Authority;
        }

        const doc = await getDoc();
        let currentLink = '';
        const today = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });

        if (isRenewal) {
            // --- منطق تمدید ---
            const renewSheet = doc.sheetsByTitle[RENEW_SHEET_TITLE];
            
            if (!renewSheet) {
                 const errorMsg = `خطا: شیت '${RENEW_SHEET_TITLE}' یافت نشد.`;
                 await bot.sendMessage(ADMIN_CHAT_ID, errorMsg);
                 return res.status(500).send(generateFailurePage('❌ خطای پیکربندی سرور', 'شیت مورد نظر یافت نشد.'));
            }
            
            // --- محاسبه تخفیف کوپن برای تمدید ---
            let discountAmount = 0;
            if (coupenCode) {
                const couponSheet = doc.sheetsByTitle[COUPON_SHEET_TITLE];
                if (couponSheet) {
                    const cRows = await couponSheet.getRows();
                    const cRow = cRows.find(r => r.get('coupen') && r.get('coupen').toLowerCase() === coupenCode.toLowerCase());
                    if (cRow) {
                        const percent = parseInt(cRow.get('percent')) || 0;
                        if(percent > 0) discountAmount = Math.round((amountToman / (1 - percent / 100)) * (percent / 100));
                    }
                }
            }

            await renewSheet.addRow({
                renewalIdentifier,
                requestedPlan,
                name,
                email,
                phone: safePhone, 
                telegramUsername,
                chat_id: isTelegram ? chat_id : '',
                telegramId,
                requestDate: today,
                users,
                description,
                amount: amountToman, 
                coupenCode: coupenCode || '',
                discountAmount,
                trackingId
            });

            const adminMessage = `🚨 درخواست تمدید جدید (${isFreeCoupon ? 'تخفیف کامل' : 'پرداخت'}) 🚨\n\nشناسه/لینک: \`${renewalIdentifier}\`\nپلن درخواستی: ${requestedPlan}\nنام: ${name}\nپیگیری: ${trackingId}\nزمان: ${today}`;
            await bot.sendMessage(ADMIN_CHAT_ID, adminMessage, { parse_mode: 'Markdown' });

        } else {
            // --- منطق خرید جدید ---
            const sheet = doc.sheetsByTitle[requestedPlan];
            if (!sheet) {
                await bot.sendMessage(ADMIN_CHAT_ID, `خطا: شیت پلن '${requestedPlan}' یافت نشد.`);
                return res.status(500).send(generateFailurePage('❌ خطای پیکربندی', 'پلن انتخاب شده معتبر نیست.'));
            }
            
            await sheet.loadHeaderRow(1);
            const rows = await sheet.getRows();

            // 🔍 جلوگیری از رفرش: جستجوی تراکنش در ردیف‌هایی که قبلاً ثبت شده‌اند
            const duplicateRow = rows.find(row => row.get('trackingId') === trackingId || row.get('trackingId') === Authority);
            
            if (duplicateRow) {
                // اگر تراکنش قبلاً ثبت شده، همان لینک قبلی را نمایش بده و دیگر سطر جدید مصرف نکن
                currentLink = duplicateRow.get('link');
                const dupUsers = duplicateRow.get('users') || users;
                
                if (isTelegram) {
                    await bot.sendMessage(chat_id, `لینک اشتراک شما (مجدد): \n${currentLink}`, { parse_mode: 'Markdown' });
                    return res.status(200).send('OK');
                }
                return res.status(200).send(generateSuccessPage({ trackingId, userLink: currentLink, name, requestedUsers: dupUsers, isRenewal: false }));
            }

            // اگر تراکنش جدید بود، اولین لینک خالی را پیدا کن
            const availableRow = rows.find(row => !row.get('status') || row.get('status').toLowerCase() !== 'used');

            if (!availableRow) {
                const adminMsg = `❌ تکمیل ظرفیت پلن ${requestedPlan} ❌\n\nتراکنش با شناسه ${trackingId} انجام شد اما لینکی برای تحویل موجود نیست.`;
                await bot.sendMessage(ADMIN_CHAT_ID, adminMsg);
                
                return res.status(503).send(generateFailurePage(
                    '⚠️ تکمیل ظرفیت',
                    `متاسفانه ظرفیت پلن ${requestedPlan} در حال حاضر تکمیل شده است. مبلغ از حساب شما کسر شده و تراکنش با موفقیت ثبت گردیده، اما لینکی برای تحویل موجود نبود. لطفاً برای دریافت لینک دستی با پشتیبانی تماس بگیرید.`,
                    trackingId
                ));
            }

            // محاسبه تخفیف برای ثبت در شیت
            let discountAmount = 0;
            let couponRowToUpdate = null;
            if (coupenCode) {
                const couponSheet = doc.sheetsByTitle[COUPON_SHEET_TITLE];
                if (couponSheet) {
                    const cRows = await couponSheet.getRows();
                    const cRow = cRows.find(r => r.get('coupen') && r.get('coupen').toLowerCase() === coupenCode.toLowerCase());
                    if (cRow) {
                        couponRowToUpdate = cRow;
                        const percent = parseInt(cRow.get('percent')) || 0;
                        if(percent > 0) discountAmount = Math.round((amountToman / (1 - percent / 100)) * (percent / 100));
                    }
                }
            }

            currentLink = availableRow.get('link');
            availableRow.set('status', 'used');
            availableRow.set('trackingId', trackingId);
            availableRow.set('purchaseDate', today);
            availableRow.set('name', name);
            availableRow.set('email', email);
            availableRow.set('chat_id', isTelegram ? chat_id : '');
            availableRow.set('phone', safePhone); 
            availableRow.set('coupen', coupenCode ? `${coupenCode} (-${discountAmount})` : '');
            availableRow.set('users', users);
            availableRow.set('renewalCount', 0); 
            await availableRow.save();

            // به‌روزرسانی تعداد استفاده از کوپن (اگر محدود بود)
            if (couponRowToUpdate) {
                const manyTimes = couponRowToUpdate.get('manyTimes');
                if (manyTimes && manyTimes !== 'unlimited') {
                    const remaining = parseInt(manyTimes, 10) - 1;
                    if (remaining >= 0) {
                        couponRowToUpdate.set('manyTimes', remaining.toString());
                        await couponRowToUpdate.save();
                    }
                }
            }

            const adminMessage = `🛍️ خرید جدید (${isFreeCoupon ? 'تخفیف کامل' : 'پرداخت'}) 🛍️\n\n` +
                `📋 پلن: ${requestedPlan}\n` +
                `👤 نام: ${name}\n` +
                `📧 ایمیل: ${email || 'ثبت نشده'}\n` +
                `📞 تماس: ${phone || 'ثبت نشده'}\n` +
                `👥 تعداد کاربر: ${users} نفر\n` +
                `🎟️ کد تخفیف: ${coupenCode || 'ندارد'}\n` +
                `💰 مبلغ پرداختی: ${amountToman.toLocaleString('fa-IR')} تومان\n` +
                `🔗 لینک تحویل شده: \`${currentLink}\`\n` +
                `🆔 پیگیری: ${trackingId}\n` +
                `⏰ زمان: ${today}`;
            await bot.sendMessage(ADMIN_CHAT_ID, adminMessage, { parse_mode: 'Markdown' });
        }

        // --- پاسخ نهایی به کاربر ---
        if (isTelegram) {
            const message = isRenewal
                ? `📝 *درخواست تمدید شما با موفقیت ثبت شد!*\n\n` +
                  `👤 نام: ${name}\n` +
                  `📋 پلن: ${requestedPlan}\n` +
                  `🆔 شناسه/لینک: \`${renewalIdentifier}\`\n` +
                  `🔢 شماره پیگیری: **${trackingId}**\n\n` +
                  `⏳ به زودی توسط تیم پشتیبانی بررسی و اعمال خواهد شد.`
                : `🎉 *پرداخت موفق!*\n\n` +
                  `👤 نام: ${name}\n` +
                  `📋 پلن: ${requestedPlan}\n` +
                  `👥 تعداد کاربر: ${users} نفر\n` +
                  `🔢 شماره پیگیری: **${trackingId}**\n\n` +
                  `🔗 لینک اشتراک اختصاصی شما:\n\`${currentLink}\``;
            
            const options = { parse_mode: 'Markdown' };
            if (!isRenewal) {
                options.reply_markup = {
                    inline_keyboard: [[{ text: '👁️ مشاهده اشتراک', url: currentLink }]]
                };
            }
            
            await bot.sendMessage(chat_id, message, options);
            return res.status(200).send('OK');
        } else {
            const pageHtml = generateSuccessPage({
                trackingId,
                userLink: currentLink,
                name,
                requestedUsers: users,
                isRenewal,
                renewalIdentifier,
            });
            return res.status(200).send(pageHtml);
        }

    } catch (error) {
        // ❌ ۶. کنترل خطاهای عمومی سرور
        console.error('Verify API Error:', error.message);
        const adminMsg = `⚠️ خطای سرور در Verify ⚠️\nAuthority: ${Authority}\nError: ${error.message}`;
        await bot.sendMessage(ADMIN_CHAT_ID, adminMsg);
        
        if (isTelegram) await bot.sendMessage(chat_id, `❌ خطای سرور: ${error.message}. لطفاً با پشتیبانی تماس بگیرید.`);
        
        // 💡 استفاده از generateFailurePage
        const serverErrorPage = generateFailurePage(
            '❌ خطای داخلی سرور',
            `در پردازش درخواست شما یک خطای غیرمنتظره رخ داد. جزئیات: ${error.message}. لطفاً با پشتیبانی تماس بگیرید.`,
            Authority
        );
        return res.status(500).send(serverErrorPage);
    }
};

