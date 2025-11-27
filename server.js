require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs').promises;

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

// ===== ADMIN API =====
// Helper function to read JSON file
async function readJSONFile(filename) {
    try {
        const filePath = path.join(__dirname, 'data', filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Helper function to write JSON file
async function writeJSONFile(filename, data) {
    const filePath = path.join(__dirname, 'data', filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// === PRODUCTS API ===
// Get all products
app.get('/api/admin/products', async (req, res) => {
    try {
        const products = await readJSONFile('products.json');
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Error reading products:', error);
        res.status(500).json({ success: false, message: 'Ошибка чтения товаров' });
    }
});

// Add product
app.post('/api/admin/products', async (req, res) => {
    try {
        const products = await readJSONFile('products.json');
        const newProduct = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        await writeJSONFile('products.json', products);
        res.json({ success: true, data: newProduct });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: 'Ошибка добавления товара' });
    }
});

// Update product
app.put('/api/admin/products/:id', async (req, res) => {
    try {
        const products = await readJSONFile('products.json');
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Товар не найден' });
        }
        products[index] = {
            ...products[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        await writeJSONFile('products.json', products);
        res.json({ success: true, data: products[index] });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Ошибка обновления товара' });
    }
});

// Delete product
app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        const products = await readJSONFile('products.json');
        const filtered = products.filter(p => p.id !== req.params.id);
        await writeJSONFile('products.json', filtered);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления товара' });
    }
});

// === BLOG API ===
// Get all blog posts
app.get('/api/admin/blog', async (req, res) => {
    try {
        const posts = await readJSONFile('blog.json');
        res.json({ success: true, data: posts });
    } catch (error) {
        console.error('Error reading blog posts:', error);
        res.status(500).json({ success: false, message: 'Ошибка чтения статей' });
    }
});

// Add blog post
app.post('/api/admin/blog', async (req, res) => {
    try {
        const posts = await readJSONFile('blog.json');
        const newPost = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        posts.push(newPost);
        await writeJSONFile('blog.json', posts);
        res.json({ success: true, data: newPost });
    } catch (error) {
        console.error('Error adding blog post:', error);
        res.status(500).json({ success: false, message: 'Ошибка добавления статьи' });
    }
});

// Update blog post
app.put('/api/admin/blog/:id', async (req, res) => {
    try {
        const posts = await readJSONFile('blog.json');
        const index = posts.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Статья не найдена' });
        }
        posts[index] = {
            ...posts[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        await writeJSONFile('blog.json', posts);
        res.json({ success: true, data: posts[index] });
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({ success: false, message: 'Ошибка обновления статьи' });
    }
});

// Delete blog post
app.delete('/api/admin/blog/:id', async (req, res) => {
    try {
        const posts = await readJSONFile('blog.json');
        const filtered = posts.filter(p => p.id !== req.params.id);
        await writeJSONFile('blog.json', filtered);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления статьи' });
    }
});

// === GALLERY API ===
// Get all gallery images
app.get('/api/admin/gallery', async (req, res) => {
    try {
        const images = await readJSONFile('gallery.json');
        res.json({ success: true, data: images });
    } catch (error) {
        console.error('Error reading gallery:', error);
        res.status(500).json({ success: false, message: 'Ошибка чтения галереи' });
    }
});

// Add gallery image
app.post('/api/admin/gallery', async (req, res) => {
    try {
        const images = await readJSONFile('gallery.json');
        const newImage = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        images.push(newImage);
        await writeJSONFile('gallery.json', images);
        res.json({ success: true, data: newImage });
    } catch (error) {
        console.error('Error adding gallery image:', error);
        res.status(500).json({ success: false, message: 'Ошибка добавления фото' });
    }
});

// Delete gallery image
app.delete('/api/admin/gallery/:id', async (req, res) => {
    try {
        const images = await readJSONFile('gallery.json');
        const filtered = images.filter(i => i.id !== req.params.id);
        await writeJSONFile('gallery.json', filtered);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting gallery image:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления фото' });
    }
});

// Обработка корневого маршрута
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка чистых URL для всех страниц
const pages = ['catalog', 'gallery', 'blog', 'contacts', 'privacy', 'reviews', 'admin'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `${page}.html`));
    });
});

// Обработка маршрутов для статей блога
app.get('/blog/pir-explanation', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-pir-explanation.html'));
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
