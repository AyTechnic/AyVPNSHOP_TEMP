const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL;
const bot = new TelegramBot(TOKEN);

// --- داده های ربات (هماهنگ شده با index.html) ---
const plans = {
    unlimited: [
        { text: '💎 ۱ ماهه - ۱۲۰,۰۰۰ تومان', requestedPlan: '1M', amount: 120000 },
        { text: '🚀 ۲ ماهه - ۲۲۰,۰۰۰ تومان', requestedPlan: '2M', amount: 220000 },
        { text: '🌟 ۳ ماهه - ۳۴۰,۰۰۰ تومان', requestedPlan: '3M', amount: 340000 },
        { text: '🔥 ۶ ماهه - ۶۰۰,۰۰۰ تومان', requestedPlan: '6M', amount: 600000 },
        { text: '🛡️ ۱ ساله - ۱,۰۰۰,۰۰۰ تومان', requestedPlan: '1Y', amount: 1000000 },
        { text: '👑 ۲ ساله - ۲,۰۰۰,۰۰۰ تومان', requestedPlan: '2Y', amount: 2000000 },
    ],
    national: [
        { text: '🇮🇷 ۱ ماهه - ۴۰۰,۰۰۰ تومان', requestedPlan: 'N1M', amount: 400000 },
        { text: '🇮🇷 ۲ ماهه - ۷۰۰,۰۰۰ تومان', requestedPlan: 'N2M', amount: 700000 },
        { text: '🇮🇷 ۳ ماهه - ۱،۰۰۰,۰۰۰ تومان', requestedPlan: 'N3M', amount: 1000000 },
        { text: '🇮🇷 ۶ ماهه - ۱,۸۰۰,۰۰۰ تومان', requestedPlan: 'N6M', amount: 1800000 },
        { text: '🇮🇷 ۱ ساله - ۲,۸۰۰,۰۰۰ تومان', requestedPlan: 'N1Y', amount: 2800000 },
        { text: '🇮🇷 ۲ ساله - ۴,۰۰۰,۰۰۰ تومان', requestedPlan: 'N2Y', amount: 4000000 },
    ]
};

const apps = {
    android: [
        { text: 'Ay VPN Plus', messageUrl: 'https://shammay.ir/Tg-AyVplus', downloadUrl: 'https://t.me/Ay_VPN/62' },
        { text: 'v2rayNG', messageUrl: 'https://shammay.ir/Tg-V2RayNG', downloadUrl: 'https://t.me/Ay_VPN/58' },
        { text: 'NapsternetV', messageUrl: 'https://shammay.ir/Tg-NapsternetV', downloadUrl: 'https://t.me/Ay_VPN/57' },
        { text: 'OneClick', messageUrl: 'https://shammay.ir/Tg-OneClick', downloadUrl: 'https://t.me/Ay_VPN/59' },
    ],
    ios: [
        { text: 'Streisand', messageUrl: 'https://apps.apple.com/app/streisand/id6450534064', downloadUrl: 'https://t.me/Ay_VPN/48' },
        { text: 'V2Box', messageUrl: 'https://apps.apple.com/app/v2box-v2ray-client/id6446814690', downloadUrl: 'https://t.me/Ay_VPN/50' },
        { text: 'hApp', messageUrl: 'https://apps.apple.com/us/app/happ-proxy-utility/id6504287215', downloadUrl: 'https://apps.apple.com/us/app/happ-proxy-utility/id6504287215' },
    ],
    windows: [
        { text: 'Nekoray', messageUrl: 'https://shammay.ir/Tg-Nekoray', downloadUrl: 'https://t.me/Ay_VPN/43' },
        { text: 'V2RayN', messageUrl: 'https://shammay.ir/Tg-V2RayN', downloadUrl: 'https://t.me/Ay_VPN/46' },
        { text: 'Clash', messageUrl: 'https://shammay.ir/Tg-Clash4Win', downloadUrl: 'https://t.me/Ay_VPN/42' },
    ]
};


// --- توابع کمکی ---
const formatPrice = (price) => price.toLocaleString('fa-IR');
const calculateMultiUserPrice = (basePrice, users) => {
    if (users <= 1) return basePrice;
    const multiplier = 1 + (users - 1) * 0.5; // 50% extra for each additional user
    return Math.round(basePrice * multiplier / 1000) * 1000;
};

// --- منوهای دکمه‌ای ---
// **اصلاح ۲.۳: افزودن دکمه اشتراک تست رایگان به منوی اصلی (کیبورد اینلاین)**
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '💎 اشتراک نامحدود | ثابت 💎', callback_data: 'menu_buy_unlimited' }],
            [{ text: '🇮🇷 اشتراک اینترنت ملی 🇮🇷', callback_data: 'menu_buy_national' }],
            [{ text: '🎁 اشتراک تست ۱ روزه', callback_data: 'buy_free_test' }], // دکمه جدید
            [{ text: '🔄 تمدید اشتراک قبلی', callback_data: 'menu_renew' }],
            [{ text: '🧾 سفارشات من', callback_data: 'menu_my_orders' }],
            [{ text: '📱 برنامه های اتصال', callback_data: 'menu_apps' }],
            [{ text: '🌐 وب سایت', url: 'https://shammay.ir' }]
        ]
    }
};

const appsMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '🤖 اندروید', callback_data: 'apps_android' }, { text: '🍏 آیفون', callback_data: 'apps_ios' }],
            [{ text: '💻 ویندوز', callback_data: 'apps_windows' }],
            [{ text: '🎓 آموزش اتصال', url: 'https://t.me/Ay_VPN' }],
            [{ text: '⬅️ بازگشت به منوی اصلی', callback_data: 'menu_main' }],
        ]
    }
};

// **اصلاح ۲.۳: افزودن دکمه اشتراک تست رایگان به کیبورد دائمی**
const mainReplyKeyboard = {
    reply_markup: {
        keyboard: [
            ['💎 اشتراک نامحدود | ثابت 💎'],
            ['🇮🇷 اشتراک اینترنت ملی 🇮🇷'],
            ['🎁 اشتراک تست', '👤 پشتیبانی هوشمند'], // دکمه جدید
            ['🔄 تمدید اشتراک قبلی', '🧾 سفارشات من'],
            ['📱 برنامه های اتصال', '🌐 وب سایت']
        ],
        resize_keyboard: true
    }
};

const backToMainMenuBtn = [[{ text: '⬅️ بازگشت به منوی اصلی', callback_data: 'menu_main' }]];

// --- متغیر برای مدیریت وضعیت گفتگو ---
let userStates = {};

// --- تابع اصلی ربات ---
module.exports = async (req, res) => {
    const update = req.body;

    try {
        if (update.message) {
            await handleMessage(update.message);
        }
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
        }
    } catch (error) {
        console.error('Bot Main Handler Error:', error);
    }
    res.status(200).send('OK');
};

// --- مدیریت پیام‌های متنی ---
async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const state = userStates[chatId];

    if (text === '/start') {
        delete userStates[chatId]; // Clear state on start
        // ارسال هر دو منو با هم
        await bot.sendMessage(chatId, '🚀 به ربات فروش اشتراک Ay Technic خوش آمدید!', mainReplyKeyboard);
        return bot.sendMessage(chatId, 'لطفاً از منوی زیر سرویس مورد نظر خود را انتخاب کنید:', mainMenu);
    }
    
    // **اصلاح ۲.۳: مدیریت دکمه‌های کیبورد دائمی**
    switch(text) {
        case '💎 اشتراک نامحدود | ثابت 💎':
            return showPlanMenu(chatId, null, 'unlimited');
        case '🇮🇷 اشتراک اینترنت ملی 🇮🇷':
            return showPlanMenu(chatId, null, 'national');
        case '🎁 اشتراک تست':
             return handleFreeTest(chatId, message.message_id, true);
        case '👤 پشتیبانی هوشمند':
            return bot.sendMessage(chatId, '👤 ارتباط با ربات هوشمند آی تکنیک:\n@AyVPN_LiveBot', {
                reply_markup: { inline_keyboard: [[{ text: '🗨️ شروع گفتگو', url: 'https://t.me/AyVPN_LiveBot' }]] }
            });
        case '🔄 تمدید اشتراک قبلی':
            return startRenewalProcess(chatId, null);
        case '🧾 سفارشات من':
            return showMyOrders(chatId, null);
        case '📱 برنامه های اتصال':
            return showAppsMenu(chatId, null);
        case '🌐 وب سایت':
            return bot.sendMessage(chatId, '🌐 آدرس وب‌سایت ما:\nhttps://shammay.ir', {
                reply_markup: { inline_keyboard: [[{ text: '🚀 باز کردن سایت', url: 'https://shammay.ir' }]] }
            });
    }

    if (!state) return;

    // مدیریت فرآیندهای چند مرحله‌ای
    switch (state.step) {
        case 'awaiting_renewal_id':
            userStates[chatId] = { ...state, step: 'awaiting_plan_type', identifier: text };
            const renewalTypeMenu = {
                reply_markup: { inline_keyboard: [
                    [{ text: '💎 نامحدود', callback_data: 'renew_type_unlimited' }, { text: '🇮🇷 ملی', callback_data: 'renew_type_national' }],
                    ...backToMainMenuBtn
                ]}
            };
            return bot.sendMessage(chatId, '✅ مشخصات دریافت شد.\n\nحالا لطفاً نوع اشتراکی که می‌خواهید تمدید کنید را انتخاب نمایید:', renewalTypeMenu);

        case 'awaiting_tracking_id':
            delete userStates[chatId];
            await bot.sendMessage(chatId, `⏳ در حال جستجو برای شناسه: \`${text}\`...`, { parse_mode: 'Markdown' });
            return await findAndDisplayOrders(chatId, null, text);

        case 'awaiting_coupon_code':
            const couponCode = text.trim();
            const originalAmount = state.finalAmount; // Price with multi-user calculation
            await bot.sendMessage(chatId, `⏳ در حال بررسی کد تخفیف: \`${couponCode}\`...`, { parse_mode: 'Markdown'});
            
            try {
                const response = await fetch(`${APP_URL}/api/check-coupon`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coupenCode: couponCode, originalAmount: originalAmount })
                });
                const data = await response.json();

                if (!response.ok) throw new Error(data.error || 'کد تخفیف نامعتبر است.');
                
                userStates[chatId].finalAmount = data.finalAmount;
                userStates[chatId].couponCode = couponCode;
                userStates[chatId].discountAmount = data.discountAmount;
                
                const planName = state.plan.text.split(' - ')[0];
                const newText = `✅ کد تخفیف با موفقیت اعمال شد.\n\n` +
                                `▫️ پلن: *${planName}*\n` +
                                `▫️ تعداد کاربر: *${state.users} نفر*\n` +
                                `▫️ مبلغ اولیه: ~${formatPrice(originalAmount)} تومان~\n` +
                                `▫️ تخفیف: *${formatPrice(data.discountAmount)} تومان*\n\n` +
                                `💵 مبلغ نهایی قابل پرداخت: *${formatPrice(data.finalAmount)} تومان*`;
                
                const paymentMenu = { reply_markup: { inline_keyboard: [
                    [{ text: `💳 پرداخت ${formatPrice(data.finalAmount)} تومان`, callback_data: 'create_payment_link' }],
                    [{ text: '⬅️ بازگشت به انتخاب کاربر', callback_data: `back_to_users_${state.plan.type}` }]
                ]}};

                return bot.sendMessage(chatId, newText, { ...paymentMenu, parse_mode: 'Markdown' });

            } catch(error) {
                const backCallback = `select_users_${state.users}`; // Callback to go back to the price confirmation screen
                 const errorMenu = { reply_markup: { inline_keyboard: [
                    [{ text: 'دوباره تلاش کن', callback_data: 'apply_coupon' }],
                    [{ text: '⬅️ بازگشت', callback_data: backCallback }]
                ]}};
                return bot.sendMessage(chatId, `❌ خطا: ${error.message}`, errorMenu);
            }
    }
}


// --- تابع برای جستجو و نمایش سفارشات ---
async function findAndDisplayOrders(chatId, messageId, identifier) {
    const options = messageId ? { chat_id: chatId, message_id: messageId } : {};
    if (!messageId) {
        await bot.sendMessage(chatId, '⏳ در حال جستجوی سفارشات...');
    } else {
        await bot.editMessageText('⏳ در حال جستجوی سفارشات...', options);
    }

    try {
        const response = await fetch(`${APP_URL}/api/track?identifier=${encodeURIComponent(identifier)}`);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                const text = 'هیچ سفارشی با اطلاعات شما یافت نشد.\nمی‌توانید با یک شناسه دیگر جستجو کنید:';
                const keyboard = { reply_markup: { inline_keyboard: [
                    [{ text: '🔍 جستجو با کد پیگیری/شناسه', callback_data: 'track_by_identifier' }],
                    ...backToMainMenuBtn
                ]}};
                return messageId 
                    ? bot.editMessageText(text, { ...options, ...keyboard })
                    : bot.sendMessage(chatId, text, keyboard);
            }
            throw new Error(data.error || 'خطای سرور');
        }

        let resultText = '📜 **سفارشات یافت شده:**\n\n';
        data.forEach((item, index) => {
            const planDisplay = item.plan === 'Renew' ? 'درخواست تمدید' : item.plan;
            resultText += `--- سفارش ${index + 1} ---\n` +
                        `▫️ **پلن:** ${planDisplay}\n` +
                        `▫️ **تاریخ:** ${item.date || 'نامشخص'}\n` +
                        `▫️ **کد رهگیری:** \`${item.trackingId}\`\n`;
            if (item.link) {
                resultText += `▫️ **لینک:** \`${item.link}\`\n`;
            }
            resultText += `▫️ **وضعیت:** موفق\n\n`;
        });
        
        const keyboard = { reply_markup: { inline_keyboard: [
            [{ text: '🔍 جستجوی مجدد با شناسه دیگر', callback_data: 'track_by_identifier' }],
            ...backToMainMenuBtn
        ]}};
        return messageId 
            ? bot.editMessageText(resultText, { ...options, parse_mode: 'Markdown', ...keyboard })
            : bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        const errorText = `❌ خطایی رخ داد: ${error.message}`;
        return messageId 
            ? bot.editMessageText(errorText, options)
            : bot.sendMessage(chatId, errorText);
    }
}


// --- توابع کمکی برای نمایش منوها (برای جلوگیری از تکرار کد) ---
function showPlanMenu(chatId, messageId, type) {
    const planList = plans[type];
    const keyboard = planList.map(p => ([{ text: p.text, callback_data: `buy_${p.requestedPlan}` }]));
    const text = `🛍️ لطفاً پلن اشتراک ${type === 'unlimited' ? 'نامحدود' : 'ملی'} مورد نظر خود را انتخاب کنید:`;
    const options = { reply_markup: { inline_keyboard: [...keyboard, ...backToMainMenuBtn] } };

    if (messageId) {
        return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
    }
    return bot.sendMessage(chatId, text, options);
}

function startRenewalProcess(chatId, messageId) {
    userStates[chatId] = { step: 'awaiting_renewal_id', isRenewal: true };
    const text = '🔄 برای تمدید، لطفاً یکی از مشخصات اشتراک قبلی خود را ارسال کنید (مانند لینک اشتراک، ایمیل و...):';
    const options = { reply_markup: { inline_keyboard: backToMainMenuBtn } };
    if (messageId) {
        return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
    }
    return bot.sendMessage(chatId, text, options);
}

function showMyOrders(chatId, messageId) {
    return findAndDisplayOrders(chatId, messageId, chatId.toString());
}

function showAppsMenu(chatId, messageId) {
    const text = '📱 لطفاً سیستم عامل خود را برای دریافت برنامه‌های اتصال انتخاب کنید:';
    if (messageId) {
        return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...appsMenu });
    }
    return bot.sendMessage(chatId, text, appsMenu);
}

// **اصلاح ۲.۳: تابع جدید برای مدیریت دریافت اشتراک تست رایگان**
async function handleFreeTest(chatId, messageId, isNewMessage = false) {
    const loadingText = '⏳ در حال بررسی وضعیت و دریافت اشتراک تست...';
    
    if (isNewMessage) {
        await bot.sendMessage(chatId, loadingText);
    } else {
        await bot.editMessageText(loadingText, { chat_id: chatId, message_id: messageId });
    }

    try {
        const response = await fetch(`${APP_URL}/api/get-free-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId })
        });
        
        const data = await response.json();

        if (response.ok && data.success) {
            const successText = `🎁 **اشتراک تست ۱ روزه شما آماده است!**\n\n` +
                                `🔗 لینک اشتراک:\n\`${data.link}\`\n\n` +
                                `✅ از این لینک در نرم‌افزار V2Ray استفاده کنید.`;
            
            const keyboard = {
                reply_markup: { inline_keyboard: [
                     [{ text: '🚀 باز کردن لینک (کپی خودکار)', url: data.link }], // لینک برای باز کردن مستقیم در برخی کلاینت ها
                     ...backToMainMenuBtn 
                ]}
            };
            
            // اگر پیام جدید بود، پیام قبلی (در حال بارگذاری) را حذف نمی‌کنیم چون کاربر متن دستور را دیده، 
            // اما اگر ادیت بود باید ادیت شود. برای سادگی اینجا همیشه پیام جدید می‌فرستیم یا ادیت می‌کنیم.
             if (isNewMessage) {
                return bot.sendMessage(chatId, successText, { parse_mode: 'Markdown', ...keyboard });
            } else {
                return bot.editMessageText(successText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', ...keyboard });
            }

        } else {
            throw new Error(data.error || 'خطا در دریافت اشتراک.');
        }

    } catch (error) {
        const errorText = `❌ خطا: ${error.message}`;
        if (isNewMessage) {
            return bot.sendMessage(chatId, errorText);
        } else {
             return bot.editMessageText(errorText, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: backToMainMenuBtn } });
        }
    }
}


// --- مدیریت کلیک روی دکمه‌های اینلاین ---
async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const user = callbackQuery.from;

    await bot.answerCallbackQuery(callbackQuery.id);

    const state = userStates[chatId] || {};

    // --- مدیریت منوها ---
    if (data === 'menu_main') {
        delete userStates[chatId];
        return bot.editMessageText('لطفاً از منوی زیر سرویس مورد نظر خود را انتخاب کنید:', { chat_id: chatId, message_id: messageId, ...mainMenu });
    }
    
    if (data === 'menu_buy_unlimited') return showPlanMenu(chatId, messageId, 'unlimited');
    if (data === 'menu_buy_national') return showPlanMenu(chatId, messageId, 'national');
    if (data === 'menu_renew') return startRenewalProcess(chatId, messageId);
    if (data === 'menu_my_orders') return showMyOrders(chatId, messageId);
    if (data === 'menu_apps') return showAppsMenu(chatId, messageId);
    
    // **اصلاح ۲.۳: مدیریت کال‌بک اشتراک تست**
    if (data === 'buy_free_test') return handleFreeTest(chatId, messageId);

    if (data.startsWith('back_to_plans_') && state.isRenewal) {
        const type = data.split('_')[3];
        const planList = plans[type];
        const keyboard = planList.map(p => ([{ text: p.text, callback_data: `buy_${p.requestedPlan}` }]));
        const messageText = `تمدید برای اشتراک ${type === 'unlimited' ? 'نامحدود' : 'ملی'}. لطفاً پلن جدید را انتخاب کنید:`;
        return bot.editMessageText(messageText, {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [...keyboard, ...backToMainMenuBtn] }
        });
    }

    if (data.startsWith('renew_type_')) {
        const type = data.split('_')[2];
        if (!state || !state.isRenewal) return;
        const planList = plans[type];
        const keyboard = planList.map(p => ([{ text: p.text, callback_data: `buy_${p.requestedPlan}` }]));
        return bot.editMessageText(`تمدید برای اشتراک ${type === 'unlimited' ? 'نامحدود' : 'ملی'}. لطفاً پلن جدید را انتخاب کنید:`, {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [...keyboard, ...backToMainMenuBtn] }
        });
    }
    
    // --- سفارشات من (ادامه) ---
    if (data === 'track_by_identifier') {
        userStates[chatId] = { step: 'awaiting_tracking_id' };
        return bot.editMessageText('لطفاً کد رهگیری، ایمیل یا شماره تماس خود را برای جستجو ارسال کنید:', {
             chat_id: chatId, message_id: messageId,
             reply_markup: { inline_keyboard: [[{ text: '⬅️ بازگشت', callback_data: 'menu_my_orders' }]]}
        });
    }

    // --- برنامه های اتصال (ادامه) ---
    if (data.startsWith('apps_')) { // e.g., apps_android
        const os = data.split('_')[1];
        const appList = apps[os];
        const appButtons = appList.map(app => {
            const appIdentifier = app.text.replace(/\s+/g, ''); // Ay VPN Plus -> AyVPNPlus
            return [{ text: app.text, callback_data: `download_${os}_${appIdentifier}` }];
        });

        return bot.editMessageText(`📲 لطفاً برنامه مورد نظر برای *${os.charAt(0).toUpperCase() + os.slice(1)}* را انتخاب کنید:`, {
            chat_id: chatId, message_id: messageId, parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [ ...appButtons, [{ text: '⬅️ بازگشت به انتخاب سیستم عامل', callback_data: 'menu_apps' }] ] }
        });
    }

    if (data.startsWith('download_')) { // e.g., download_android_AyVPNPlus
        const [, os, appIdentifier] = data.split('_');
        const appData = apps[os]?.find(a => a.text.replace(/\s+/g, '') === appIdentifier);

        if (appData) {
            const messageText = `✅ لینک دانلود برنامه *${appData.text}* آماده است:\n\n${appData.messageUrl}`;
            const keyboard = {
                reply_markup: { inline_keyboard: [[{ text: '📥 دانلود', url: appData.downloadUrl }]] }
            };
            await bot.sendMessage(chatId, messageText, { parse_mode: 'Markdown', ...keyboard });
        }
        return; 
    }
    
    // --- مرحله ۱: انتخاب پلن و رفتن به انتخاب کاربر ---
    if (data.startsWith('buy_')) {
        const requestedPlan = data.substring(4);
        const allPlans = [...plans.unlimited, ...plans.national];
        const selectedPlan = allPlans.find(p => p.requestedPlan === requestedPlan);
        if (!selectedPlan) return;

        userStates[chatId] = { ...state, step: 'selecting_users', plan: selectedPlan };
        
        const basePrice = selectedPlan.amount;
        const extraUserPrice = basePrice * 0.5;
        const messageText = `**${selectedPlan.text}**\n\n` +
                            `لطفا تعداد کاربران سرویس خود را انتخاب کنید.\n\n`+
                            `▫️ قیمت پایه برای ۱ کاربر: *${formatPrice(basePrice)} تومان*\n`+
                            `▫️ هزینه هر کاربر اضافه: *${formatPrice(extraUserPrice)} تومان*\n\n`+
                            `با انتخاب تعداد کاربران، مبلغ نهایی محاسبه خواهد شد.`;
        
        const userButtons = [];
        for (let i = 1; i <= 8; i++) {
            userButtons.push({ text: `${i} کاربر`, callback_data: `select_users_${i}` });
        }
        
        const keyboard = [];
        for (let i = 0; i < userButtons.length; i += 4) {
             keyboard.push(userButtons.slice(i, i + 4));
        }
        
        const planType = plans.unlimited.some(p => p.requestedPlan === requestedPlan) ? 'unlimited' : 'national';
        keyboard.push([{ text: '⬅️ بازگشت به پلن‌ها', callback_data: `back_to_plans_${planType}` }]);

        return bot.editMessageText(messageText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    // --- مرحله ۲: انتخاب کاربر و نمایش قیمت نهایی ---
    if (data.startsWith('select_users_')) {
        if (!state.plan) return;
        const users = parseInt(data.split('_')[2]);
        const finalPrice = calculateMultiUserPrice(state.plan.amount, users);
        
        userStates[chatId] = { ...state, step: 'confirming_price', users: users, finalAmount: finalPrice, couponCode: null, discountAmount: 0 };
        
        const planName = state.plan.text.split(' - ')[0];
        const messageText = `✅ انتخاب شما:\n\n` +
                            `▫️ پلن: *${planName}*\n` +
                            `▫️ تعداد کاربر: *${users} نفر*\n\n` +
                            `💵 مبلغ قابل پرداخت: *${formatPrice(finalPrice)} تومان*`;
                            
        const keyboard = { reply_markup: { inline_keyboard: [
            [{ text: `💳 پرداخت ${formatPrice(finalPrice)} تومان`, callback_data: 'create_payment_link' }],
            [{ text: '🎁 کد تخفیف دارم', callback_data: 'apply_coupon' }],
            [{ text: '⬅️ بازگشت به انتخاب کاربر', callback_data: `buy_${state.plan.requestedPlan}` }]
        ]}};

        return bot.editMessageText(messageText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', ...keyboard });
    }

    // --- مرحله ۳: درخواست کد تخفیف ---
    if (data === 'apply_coupon') {
        if (!state.finalAmount) return;
        userStates[chatId].step = 'awaiting_coupon_code';
        return bot.editMessageText('لطفاً کد تخفیف خود را وارد کنید:', {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [[{ text: '⬅️ بازگشت', callback_data: `select_users_${state.users}` }]]}
        });
    }

    // --- مرحله نهایی: ساخت لینک پرداخت ---
    if (data === 'create_payment_link') {
        if (state.finalAmount === undefined || !state.plan) return;

        await bot.editMessageText(`⏳ در حال ساخت لینک پرداخت برای شما...`, { chat_id: chatId, message_id: messageId });

        const payload = {
            amount: state.finalAmount,
            requestedPlan: state.plan.requestedPlan,
            users: state.users,
            coupenCode: state.couponCode || '',
            description: `${state.isRenewal ? 'تمدید' : 'خرید'} اشتراک - پلن ${state.plan.requestedPlan} - ${state.users} کاربره`,
            chat_id: chatId,
            telegramId: user.id,
            telegramUsername: user.username || 'N/A',
            name: user.first_name + (user.last_name ? ' ' + user.last_name : ''),
            email: '', // Can be left empty for bot
            phone: '', // Can be left empty for bot
            renewalIdentifier: state.isRenewal ? state.identifier : ''
        };
        
        try {
            const response = await fetch(`${APP_URL}/api/start-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const responseData = await response.json();

            // **اصلاح ۱.۴: مدیریت حالت کوپن ۱۰۰٪ (redirect_url)**
            if (response.ok) {
                if (responseData.authority) {
                    const paymentLink = `https://www.zarinpal.com/pg/StartPay/${responseData.authority}`;
                    await bot.deleteMessage(chatId, messageId);
                    return bot.sendMessage(chatId, '🔗 لینک پرداخت شما آماده شد. لطفاً پرداخت را از طریق دکمه زیر تکمیل کنید:', {
                        reply_markup: { inline_keyboard: [[{ text: '💳 پرداخت آنلاین', url: paymentLink }]] }
                    });
                } else if (responseData.redirect_url) {
                     // حالت رایگان: ربات باید لینک وریفای را صدا بزند تا عملیات تخصیص انجام شود
                    await bot.editMessageText(`⏳ کوپن ۱۰۰٪ اعمال شد. در حال فعال‌سازی اشتراک...`, { chat_id: chatId, message_id: messageId });
                    
                    // فراخوانی verify برای نهایی سازی خرید
                    await fetch(responseData.redirect_url);
                    
                    // پیام نهایی توسط خود verify.js ارسال می‌شود، پس فقط پیام "در حال ساخت" را پاک می‌کنیم
                    return bot.deleteMessage(chatId, messageId);
                } else {
                     throw new Error(responseData.details || 'پاسخ نامعتبر از سرور.');
                }
            } else {
                throw new Error(responseData.details || 'سرور درگاه پرداخت پاسخ نداد.');
            }
        } catch (error) {
            console.error('Payment Error:', error);
            try { await bot.deleteMessage(chatId, messageId); } catch(e){}
            return bot.sendMessage(chatId, `❌ خطا در ایجاد لینک پرداخت: ${error.message}`);
        }
    }

    // --- بازگشت به مرحله انتخاب پلن‌ها ---
    if (data.startsWith('back_to_plans_')) {
        const type = data.split('_')[3];
        const planList = plans[type];
        const keyboard = planList.map(p => ([{ text: p.text, callback_data: `buy_${p.requestedPlan}` }]));
        
        const isRenewal = state.isRenewal || false;
        let text = `🛍️ لطفاً پلن اشتراک ${type === 'unlimited' ? 'نامحدود' : 'ملی'} مورد نظر خود را انتخاب کنید:`;
        if (isRenewal) {
            text = `تمدید برای اشتراک ${type === 'unlimited' ? 'نامحدود' : 'ملی'}. لطفاً پلن جدید را انتخاب کنید:`
        }

        return bot.editMessageText(text, {
            chat_id: chatId, message_id: messageId,
            reply_markup: { inline_keyboard: [...keyboard, ...backToMainMenuBtn] }
        });
    }
}



