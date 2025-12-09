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

    const message = `
🔔 <b>Новая заявка с сайта Планета ПИР</b>

👤 <b>Имя:</b> ${data.name}
📞 <b>Телефон:</b> ${data.phone}
${data.comment ? `💬 <b>Комментарий:</b> ${data.comment}` : ''}

📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
    `.trim();

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

    return errors;
}

// API endpoint для отправки формы
app.post('/api/send-order', async (req, res) => {
    try {
        const { name, phone, comment } = req.body;

        // Валидация
        const errors = validateFormData({ name, phone, comment });
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
            comment: comment ? comment.trim() : ''
        };

        // Отправка в Telegram
        const telegramSent = await sendToTelegram(cleanData);

        // Логирование заявки
        console.log('📝 Новая заявка:', cleanData);

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
const pages = ['catalog', 'gallery', 'blog', 'contacts', 'privacy', 'reviews'];
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
