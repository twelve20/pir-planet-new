require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || 'https://pir-planet.ru';

// Инициализация базы данных
db.initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздаем только папку public (НЕ весь проект!)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для красивых URL без .html
app.use((req, res, next) => {
    // Если запрос уже обработан или это API/статические файлы, пропускаем
    if (req.path.includes('.') || req.path.startsWith('/api/')) {
        return next();
    }

    // Пытаемся найти соответствующий HTML файл
    const possiblePaths = [
        path.join(__dirname, 'public', req.path + '.html'),
        path.join(__dirname, 'public', req.path, 'index.html')
    ];

    const fs = require('fs');
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }

    next();
});

// Middleware для HTTP Basic Authentication админ-панели
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [username, password] = credentials.split(':');

        const validUsername = process.env.ADMIN_USERNAME || 'admin';
        const validPassword = process.env.ADMIN_PASSWORD || 'changeme';

        if (username === validUsername && password === validPassword) {
            next();
        } else {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
            return res.status(401).json({
                success: false,
                message: 'Неверный логин или пароль'
            });
        }
    } catch (error) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).json({
            success: false,
            message: 'Ошибка авторизации'
        });
    }
}

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
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка чистых URL для всех страниц
const pages = ['catalog', 'gallery', 'blog', 'contacts', 'privacy', 'reviews', 'industrial', 'cart', 'checkout'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// Обработка маршрутов для статей блога
app.get('/blog/pir-explanation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-pir-explanation.html'));
});

app.get('/blog/banya-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-banya-insulation.html'));
});

app.get('/blog/floor-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-floor-insulation.html'));
});

app.get('/blog/facade-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-facade-insulation.html'));
});

app.get('/blog/roof-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-roof-insulation.html'));
});

app.get('/blog/mansard-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-mansard-insulation.html'));
});

app.get('/blog/balcony-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-balcony-insulation.html'));
});

app.get('/blog/banya-winter-preparation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-banya-winter-preparation.html'));
});

app.get('/blog/wall-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-wall-insulation.html'));
});

app.get('/blog/garage-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-garage-insulation.html'));
});

app.get('/blog/frame-house-insulation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-frame-house-insulation.html'));
});

// Обработка маршрутов для страниц товаров
app.get('/product/logicpir-banya-30', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-logicpir-banya-30.html'));
});

app.get('/product/logicpir-banya-40', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-logicpir-banya-40.html'));
});

app.get('/product/logicpir-banya-50', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-logicpir-banya-50.html'));
});

app.get('/product/logicpir-prof-80', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-logicpir-prof-80.html'));
});

app.get('/product/logicpir-prof-100', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-logicpir-prof-100.html'));
});

app.get('/product/alu-tape', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-alu-tape.html'));
});

app.get('/product/techno-glue', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-techno-glue.html'));
});

// ===== API ДЛЯ ЗАКАЗОВ =====

// Создание нового заказа
app.post('/api/create-order', async (req, res) => {
    try {
        const { customer, delivery, payment, items } = req.body;

        // Валидация
        if (!customer || !customer.name || !customer.phone) {
            return res.status(400).json({ success: false, message: 'Не указаны обязательные поля клиента' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Корзина пуста' });
        }

        if (!delivery || !delivery.method) {
            return res.status(400).json({ success: false, message: 'Не указан способ доставки' });
        }

        // Расчет суммы заказа
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Подготовка данных для БД
        const orderData = {
            customer_name: customer.name.trim(),
            customer_phone: customer.phone.trim(),
            customer_email: customer.email ? customer.email.trim() : null,
            customer_type: customer.type || 'individual',
            delivery_type: delivery.method,
            delivery_address: delivery.address ? delivery.address.trim() : null,
            delivery_city: delivery.city ? delivery.city.trim() : null,
            pickup_location: delivery.pickupLocation || null,
            payment_method: payment ? payment.method : null,
            subtotal: subtotal,
            items: items
        };

        // Создаем заказ
        const { orderId, orderNumber, accessToken } = db.createOrder(orderData);

        // Отправляем уведомление в Telegram
        const telegramMessage = `
🛒 <b>Новый заказ #${orderNumber}</b>

👤 <b>Клиент:</b> ${customer.name}
📞 <b>Телефон:</b> ${customer.phone}
${customer.email ? `📧 <b>Email:</b> ${customer.email}` : ''}
🏢 <b>Тип:</b> ${customer.type === 'legal' ? 'Юридическое лицо' : 'Физическое лицо'}

📦 <b>Товары:</b>
${items.map(item => `• ${item.name} x ${item.quantity} шт. = ${(item.price * item.quantity).toLocaleString('ru-RU')} ₽`).join('\n')}

💰 <b>Сумма без доставки:</b> ${subtotal.toLocaleString('ru-RU')} ₽

🚚 <b>Доставка:</b> ${delivery.method === 'pickup' ? 'Самовывоз' : delivery.method === 'transport' ? 'Транспортная компания' : 'Курьерская доставка'}
${delivery.method !== 'pickup' ? `📍 <b>Адрес:</b> ${delivery.city || ''}, ${delivery.address || ''}` : ''}
${delivery.method === 'pickup' ? `📍 <b>Пункт выдачи:</b> ${delivery.pickupLocation || 'Люберцы / Солнечногорск'}` : ''}

📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}

🔗 <b>Ссылка на заказ:</b> ${SITE_URL}/order/${orderId}
        `.trim();

        if (bot) {
            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, telegramMessage, { parse_mode: 'HTML' });
        }

        res.json({
            success: true,
            orderId: orderId,
            orderNumber: orderNumber,
            accessToken: accessToken,
            message: 'Заказ успешно создан'
        });

    } catch (error) {
        console.error('❌ Ошибка создания заказа:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при создании заказа'
        });
    }
});

// Получить заказ по ID (требуется токен доступа)
app.get('/api/order/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        const { token } = req.query;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Требуется токен доступа' });
        }

        const order = db.getOrderById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Заказ не найден' });
        }

        if (order.access_token !== token) {
            console.warn(`⚠️ Попытка доступа к заказу ${orderId} с неверным токеном`);
            return res.status(403).json({ success: false, message: 'Неверный токен доступа' });
        }

        // Удаляем токен из ответа (не показываем клиенту)
        delete order.access_token;

        res.json({ success: true, order });
    } catch (error) {
        console.error('❌ Ошибка получения заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить заказ для админа (требуется авторизация)
app.get('/api/admin/order/:orderId', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;
        const order = db.getOrderById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Заказ не найден' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('❌ Ошибка получения заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить все заказы (для админки)
app.get('/api/orders', requireAuth, (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const orders = db.getAllOrders(parseInt(limit), parseInt(offset));
        const stats = db.getOrderStats();

        res.json({ success: true, orders, stats });
    } catch (error) {
        console.error('❌ Ошибка получения заказов:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Обновить статус заказа (для админки)
app.post('/api/order/:orderId/status', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, comment } = req.body;

        const validStatuses = ['new', 'processing', 'confirmed', 'paid', 'delivery_paid', 'shipping', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Неверный статус' });
        }

        if (comment && comment.length > 1000) {
            return res.status(400).json({ success: false, message: 'Комментарий не должен превышать 1000 символов' });
        }

        db.updateOrderStatus(orderId, status, comment);

        // Уведомляем в Telegram об изменении статуса
        const order = db.getOrderById(orderId);
        if (bot && order) {
            const statusNames = {
                'new': '🆕 Новый',
                'processing': '⏳ На согласовании',
                'confirmed': '✅ Подтвержден',
                'paid': '💳 Оплачен',
                'delivery_paid': '🚚💳 Доставка оплачена',
                'shipping': '🚚 В доставке',
                'completed': '✔️ Выполнен',
                'cancelled': '❌ Отменен'
            };

            const message = `
📦 <b>Обновление заказа #${order.order_number}</b>

Статус изменен на: ${statusNames[status]}
${comment ? `\n💬 Комментарий: ${comment}` : ''}

🔗 <b>Ссылка:</b> ${SITE_URL}/order/${orderId}
            `.trim();

            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
        }

        res.json({ success: true, message: 'Статус обновлен' });
    } catch (error) {
        console.error('❌ Ошибка обновления статуса:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Обновить стоимость доставки (для админки)
app.post('/api/order/:orderId/delivery', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;
        const { deliveryCost, comment } = req.body;

        if (typeof deliveryCost !== 'number' || deliveryCost < 0 || deliveryCost > 1000000) {
            return res.status(400).json({ success: false, message: 'Стоимость доставки должна быть от 0 до 1000000' });
        }

        if (comment && comment.length > 1000) {
            return res.status(400).json({ success: false, message: 'Комментарий не должен превышать 1000 символов' });
        }

        db.updateDeliveryCost(orderId, deliveryCost, comment);
        res.json({ success: true, message: 'Стоимость доставки обновлена' });
    } catch (error) {
        console.error('❌ Ошибка обновления доставки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Добавить комментарий менеджера (для админки)
app.post('/api/order/:orderId/comment', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;
        const { comment } = req.body;

        if (!comment) {
            return res.status(400).json({ success: false, message: 'Комментарий не может быть пустым' });
        }

        db.addManagerComment(orderId, comment);
        res.json({ success: true, message: 'Комментарий добавлен' });
    } catch (error) {
        console.error('❌ Ошибка добавления комментария:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ===== API ДЛЯ РЕДАКТИРОВАНИЯ ТОВАРОВ =====

// Обновить все товары в заказе (для админки)
app.put('/api/order/:orderId/items', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Неверный формат товаров' });
        }

        if (items.length === 0) {
            return res.status(400).json({ success: false, message: 'Заказ должен содержать хотя бы один товар' });
        }

        if (items.length > 100) {
            return res.status(400).json({ success: false, message: 'Заказ не может содержать более 100 товаров' });
        }

        // Проверяем что все товары имеют нужные поля
        for (const item of items) {
            if (!item.product_name && !item.name) {
                return res.status(400).json({ success: false, message: 'Каждый товар должен иметь название' });
            }

            const quantity = parseInt(item.quantity);
            if (!quantity || quantity <= 0 || quantity > 100000) {
                return res.status(400).json({ success: false, message: 'Количество товара должно быть от 1 до 100000' });
            }

            const price = parseFloat(item.unit_price || item.price);
            if (isNaN(price) || price < 0 || price > 10000000) {
                return res.status(400).json({ success: false, message: 'Цена товара должна быть от 0 до 10000000' });
            }

            const name = (item.product_name || item.name).trim();
            if (name.length < 1 || name.length > 500) {
                return res.status(400).json({ success: false, message: 'Название товара должно быть от 1 до 500 символов' });
            }
        }

        db.updateOrderItems(orderId, items);
        const updatedOrder = db.getOrderById(orderId);

        res.json({
            success: true,
            message: 'Товары обновлены',
            order: {
                subtotal: updatedOrder.subtotal,
                delivery_cost: updatedOrder.delivery_cost,
                total: updatedOrder.total,
                items: updatedOrder.items
            }
        });
    } catch (error) {
        console.error('❌ Ошибка обновления товаров:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Добавить товар в заказ (для админки)
app.post('/api/order/:orderId/item', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;
        const item = req.body;

        if (!item.product_name && !item.name) {
            return res.status(400).json({ success: false, message: 'Укажите название товара' });
        }
        if (!item.quantity || item.quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Количество должно быть больше 0' });
        }
        if ((!item.unit_price && !item.price) || (item.unit_price || item.price) < 0) {
            return res.status(400).json({ success: false, message: 'Укажите цену товара' });
        }

        const itemId = db.addOrderItem(orderId, item);
        const updatedOrder = db.getOrderById(orderId);

        res.json({
            success: true,
            message: 'Товар добавлен',
            itemId,
            order: {
                subtotal: updatedOrder.subtotal,
                delivery_cost: updatedOrder.delivery_cost,
                total: updatedOrder.total,
                items: updatedOrder.items
            }
        });
    } catch (error) {
        console.error('❌ Ошибка добавления товара:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Удалить товар из заказа (для админки)
app.delete('/api/order/:orderId/item/:itemId', requireAuth, (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        db.deleteOrderItem(orderId, parseInt(itemId));
        const updatedOrder = db.getOrderById(orderId);

        res.json({
            success: true,
            message: 'Товар удален',
            order: {
                subtotal: updatedOrder.subtotal,
                delivery_cost: updatedOrder.delivery_cost,
                total: updatedOrder.total,
                items: updatedOrder.items
            }
        });
    } catch (error) {
        console.error('❌ Ошибка удаления товара:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Удалить заказ полностью (для админки)
app.delete('/api/order/:orderId', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;

        // Получаем информацию о заказе перед удалением (для логирования)
        const order = db.getOrderById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Заказ не найден' });
        }

        const deleted = db.deleteOrder(orderId);

        if (deleted) {
            console.log(`🗑️ Заказ #${order.order_number} удалён`);

            // Уведомляем в Telegram об удалении заказа
            if (bot) {
                const message = `
🗑️ <b>Заказ удалён</b>

Номер: #${order.order_number}
Клиент: ${order.customer_name}
Телефон: ${order.customer_phone}
Сумма: ${(order.total || order.subtotal || 0).toLocaleString('ru-RU')} ₽
                `.trim();

                bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' }).catch(console.error);
            }

            res.json({ success: true, message: 'Заказ удалён' });
        } else {
            res.status(404).json({ success: false, message: 'Заказ не найден' });
        }
    } catch (error) {
        console.error('❌ Ошибка удаления заказа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ===== ALFA-BANK PAYMENT API =====

const ALFABANK_API_URL = process.env.ALFABANK_API_URL || 'https://payment.alfabank.ru/payment/rest';
const ALFABANK_USERNAME = process.env.ALFABANK_USERNAME;
const ALFABANK_PASSWORD = process.env.ALFABANK_PASSWORD;

// Регистрация заказа в Альфа-Банке и получение ссылки на оплату
app.post('/api/payment/create', async (req, res) => {
    try {
        const { orderId, paymentType, token } = req.body;

        // Получаем заказ из БД
        const order = db.getOrderById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Заказ не найден' });
        }

        // Проверяем токен доступа
        if (!token || order.access_token !== token) {
            return res.status(403).json({ success: false, message: 'Неверный токен доступа' });
        }

        // Проверяем статус заказа
        if (order.status !== 'confirmed') {
            return res.status(400).json({ success: false, message: 'Заказ не подтверждён для оплаты' });
        }

        // Проверяем учётные данные банка
        if (!ALFABANK_USERNAME || !ALFABANK_PASSWORD) {
            console.error('❌ Не настроены учётные данные Альфа-Банка');
            return res.status(500).json({ success: false, message: 'Платёжная система не настроена' });
        }

        // Определяем сумму к оплате
        const subtotal = order.subtotal || 0;
        const deliveryCost = order.delivery_cost || 0;
        const total = order.total || subtotal;
        let amount;
        let description;

        if (paymentType === 'full') {
            // Полная оплата со скидкой 5%
            amount = Math.round(total * 0.95);
            description = `Оплата заказа №${order.order_number} (скидка 5%)`;
        } else if (paymentType === 'delivery') {
            // Только доставка
            amount = deliveryCost;
            description = `Оплата доставки заказа №${order.order_number}`;
        } else {
            return res.status(400).json({ success: false, message: 'Неверный тип оплаты' });
        }

        if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'Сумма оплаты должна быть больше 0' });
        }

        // Сумма в копейках
        const amountInKopecks = Math.round(amount * 100);

        // Уникальный номер заказа для банка
        const bankOrderNumber = `${order.order_number}-${paymentType}-${Date.now()}`;

        // Формируем returnUrl - банк перенаправит сюда после оплаты
        // Используем internalId вместо orderId, т.к. банк сам добавит параметр orderId (свой)
        const returnUrl = `${SITE_URL}/api/payment/callback?internalId=${orderId}&paymentType=${paymentType}`;

        // Формируем параметры запроса к API Альфа-Банка
        const params = new URLSearchParams({
            userName: ALFABANK_USERNAME,
            password: ALFABANK_PASSWORD,
            orderNumber: bankOrderNumber,
            amount: amountInKopecks.toString(),
            returnUrl: returnUrl,
            description: description,
            language: 'ru'
        });

        // Добавляем email если есть
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (order.customer_email && emailRegex.test(order.customer_email)) {
            params.append('email', order.customer_email);
        }

        console.log(`💳 Регистрация платежа в Альфа-Банке: заказ #${order.order_number}, сумма ${amount} ₽, тип: ${paymentType}`);

        // Вызываем register.do
        const response = await fetch(`${ALFABANK_API_URL}/register.do`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const result = await response.json();

        if (result.orderId && result.formUrl) {
            console.log(`✅ Платёж зарегистрирован: bankOrderId=${result.orderId}`);

            // Отправляем ссылку на оплату клиенту
            res.json({
                success: true,
                formUrl: result.formUrl,
                bankOrderId: result.orderId
            });
        } else {
            console.error(`❌ Ошибка регистрации платежа:`, result);
            res.status(400).json({
                success: false,
                message: result.errorMessage || 'Ошибка при создании платежа'
            });
        }

    } catch (error) {
        console.error('❌ Ошибка создания платежа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при создании платежа' });
    }
});

// Callback от Альфа-Банка после оплаты (returnUrl)
// Банк перенаправляет сюда и добавляет свой параметр orderId (ID заказа в банке)
app.get('/api/payment/callback', async (req, res) => {
    try {
        const internalId = req.query.internalId; // наш ID заказа
        const paymentType = req.query.paymentType;
        const bankOrderId = req.query.orderId; // ID заказа в Альфа-Банке (банк добавляет автоматически)

        if (!internalId) {
            console.error('❌ Callback без internalId');
            return res.redirect('/payment/fail');
        }

        const order = db.getOrderById(internalId);
        if (!order) {
            console.error(`❌ Заказ ${internalId} не найден`);
            return res.redirect('/payment/fail');
        }

        let paymentSuccess = false;

        if (bankOrderId && ALFABANK_USERNAME && ALFABANK_PASSWORD) {
            // Проверяем статус платежа в банке
            const params = new URLSearchParams({
                userName: ALFABANK_USERNAME,
                password: ALFABANK_PASSWORD,
                orderId: bankOrderId
            });

            const response = await fetch(`${ALFABANK_API_URL}/getOrderStatusExtended.do`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            const result = await response.json();
            // orderStatus: 2 = оплата подтверждена (DEPOSITED)
            paymentSuccess = result.orderStatus === 2;

            console.log(`💳 Callback: bankOrderId=${bankOrderId}, orderStatus=${result.orderStatus}, success=${paymentSuccess}`);
        }

        if (paymentSuccess) {
            // Обновляем статус заказа
            if (paymentType === 'full') {
                db.updateOrderStatus(internalId, 'paid', 'Заказ оплачен онлайн через Альфа-Банк');
            } else if (paymentType === 'delivery') {
                db.updateOrderStatus(internalId, 'delivery_paid', 'Доставка оплачена онлайн через Альфа-Банк');
            }

            // Уведомляем в Telegram
            if (bot) {
                const statusText = paymentType === 'full' ? 'Заказ полностью оплачен' : 'Доставка оплачена';
                const message = `
💰 <b>${statusText}</b>

📦 Заказ: #${order.order_number}
👤 Клиент: ${order.customer_name}
📞 Телефон: ${order.customer_phone}
💳 Способ: Онлайн (Альфа-Банк)

🔗 <b>Ссылка:</b> ${SITE_URL}/order/${internalId}
                `.trim();

                await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' }).catch(console.error);
            }

            // Перенаправляем на страницу успешной оплаты
            res.redirect(`/payment/success?orderId=${internalId}`);
        } else {
            // Оплата не подтверждена - возвращаем на страницу заказа
            res.redirect(`/order/${internalId}?payment=failed`);
        }

    } catch (error) {
        console.error('❌ Ошибка обработки callback оплаты:', error);
        res.redirect('/payment/fail');
    }
});

// Проверка статуса оплаты (для клиентской части)
app.post('/api/payment/check-status', async (req, res) => {
    try {
        const { bankOrderId } = req.body;

        if (!bankOrderId || !ALFABANK_USERNAME || !ALFABANK_PASSWORD) {
            return res.status(400).json({ success: false, message: 'Недостаточно данных' });
        }

        const params = new URLSearchParams({
            userName: ALFABANK_USERNAME,
            password: ALFABANK_PASSWORD,
            orderId: bankOrderId
        });

        const response = await fetch(`${ALFABANK_API_URL}/getOrderStatusExtended.do`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const result = await response.json();

        res.json({
            success: true,
            orderStatus: result.orderStatus,
            actionCode: result.actionCode,
            actionCodeDescription: result.actionCodeDescription
        });

    } catch (error) {
        console.error('❌ Ошибка проверки статуса платежа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Страница заказа для клиента
app.get('/order/:orderId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

// Страницы результата оплаты
app.get('/payment/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
});

app.get('/payment/fail', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-fail.html'));
});

// Админ-панель
app.get('/admin/orders', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-orders.html'));
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
