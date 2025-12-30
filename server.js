require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Telegram Bot
let bot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('✅ Telegram бот инициализирован');
} else {
    console.warn('⚠️  Telegram не настроен. Создайте файл .env с токеном бота и chat_id');
}

// Функция отправки в Telegram
async function sendToTelegram(data) {
    if (!bot) {
        console.log('Telegram не настроен, сообщение не отправлено');
        return false;
    }

    let message;

    if (data.isB2B) {
        // Сообщение для B2B заявки
        const productLabels = {
            'uncoated': 'ПИР плиты без облицовки',
            'foil': 'ПИР плиты с фольгой',
            'glass': 'ПИР плиты со стеклохолстом',
            'shells': 'ПИР скорлупы для труб',
            'all': 'Вся номенклатура'
        };

        message = `
🏭 <b>Новая B2B заявка с сайта Планета ПИР</b>

🏢 <b>Компания:</b> ${data.company}
👤 <b>Контактное лицо:</b> ${data.name}
📞 <b>Телефон:</b> ${data.phone}
${data.email ? `📧 <b>Email:</b> ${data.email}` : ''}
📦 <b>Интересующая продукция:</b> ${productLabels[data.product] || data.product}
${data.comment ? `💬 <b>Дополнительная информация:</b> ${data.comment}` : ''}

📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
        `.trim();
    } else {
        // Стандартное сообщение для B2C заявки
        message = `
🔔 <b>Новая заявка с сайта Планета ПИР</b>

👤 <b>Имя:</b> ${data.name}
📞 <b>Телефон:</b> ${data.phone}
${data.comment ? `💬 <b>Комментарий:</b> ${data.comment}` : ''}

📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
        `.trim();
    }

    try {
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
        console.log('✅ Сообщение отправлено в Telegram');
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error.message);
        return false;
    }
}

// Валидация данных формы
function validateFormData(data) {
    const errors = [];

    // Проверка имени
    if (!data.name || data.name.trim().length < 2) {
        errors.push('Имя должно содержать минимум 2 символа');
    }

    // Проверка телефона
    const phoneRegex = /^[\d\s\(\)\-\+]+$/;
    if (!data.phone || !phoneRegex.test(data.phone)) {
        errors.push('Неверный формат телефона');
    }

    // Проверка длины комментария
    if (data.comment && data.comment.length > 500) {
        errors.push('Комментарий не должен превышать 500 символов');
    }

    // Дополнительная валидация для B2B заявок
    if (data.isB2B) {
        if (!data.company || data.company.trim().length < 2) {
            errors.push('Название компании должно содержать минимум 2 символа');
        }
        if (!data.product) {
            errors.push('Выберите интересующую продукцию');
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Неверный формат email');
        }
    }

    return errors;
}

// API endpoint для отправки формы
app.post('/api/send-order', async (req, res) => {
    try {
        const { name, phone, comment, isB2B, company, email, product } = req.body;

        // Подготовка данных для валидации
        const validationData = { name, phone, comment, isB2B, company, email, product };

        // Валидация
        const errors = validateFormData(validationData);
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: errors
            });
        }

        // Очистка данных
        const cleanData = {
            name: name.trim(),
            phone: phone.trim(),
            comment: comment ? comment.trim() : '',
            isB2B: !!isB2B
        };

        // Добавление B2B полей если это B2B заявка
        if (isB2B) {
            cleanData.company = company.trim();
            cleanData.email = email ? email.trim() : '';
            cleanData.product = product;
        }

        // Отправка в Telegram
        const telegramSent = await sendToTelegram(cleanData);

        // Логирование заявки
        console.log(isB2B ? '🏭 Новая B2B заявка:' : '📝 Новая заявка:', cleanData);

        res.json({
            success: true,
            message: 'Заявка успешно отправлена',
            telegramSent: telegramSent
        });

    } catch (error) {
        console.error('❌ Ошибка обработки заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при отправке заявки'
        });
    }
});

// Проверка статуса сервера
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        telegram: !!bot,
        timestamp: new Date().toISOString()
    });
});

// Обработка корневого маршрута
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка чистых URL для всех страниц
const pages = ['catalog', 'gallery', 'blog', 'contacts', 'privacy', 'reviews', 'industrial'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Обработка маршрутов для статей блога
app.get('/blog/pir-explanation', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-pir-explanation.html'));
});

app.get('/blog/banya-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-banya-insulation.html'));
});

app.get('/blog/floor-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-floor-insulation.html'));
});

app.get('/blog/facade-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-facade-insulation.html'));
});

app.get('/blog/roof-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-roof-insulation.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Статические файлы: ${__dirname}`);
    if (bot) {
        console.log('📱 Telegram уведомления включены');
    }
});

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('❌ Необработанная ошибка:', error);
});
