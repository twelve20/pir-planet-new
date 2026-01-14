const Database = require('better-sqlite3');
const path = require('path');

// Инициализация базы данных
const db = new Database(path.join(__dirname, 'orders.db'));

// Устанавливаем UTF-8 кодировку
db.pragma('encoding = "UTF-8"');

// Создание таблиц
function initDatabase() {
    // Таблица заказов
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            order_number INTEGER UNIQUE,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            customer_type TEXT NOT NULL DEFAULT 'individual',
            delivery_type TEXT NOT NULL,
            delivery_address TEXT,
            delivery_city TEXT,
            pickup_location TEXT,
            payment_method TEXT,
            access_token TEXT,
            status TEXT NOT NULL DEFAULT 'new',
            subtotal REAL NOT NULL,
            delivery_cost REAL DEFAULT 0,
            total REAL NOT NULL,
            manager_comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Миграция: добавляем поле payment_method если его нет
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT`);
        console.log('✅ Добавлено поле payment_method в таблицу orders');
    } catch (e) {
        // Поле уже существует, игнорируем ошибку
    }

    // Миграция: добавляем поле access_token если его нет
    try {
        db.exec(`ALTER TABLE orders ADD COLUMN access_token TEXT`);
        console.log('✅ Добавлено поле access_token в таблицу orders');
    } catch (e) {
        // Поле уже существует, игнорируем ошибку
    }

    // Таблица товаров в заказе
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            product_sku TEXT,
            product_image TEXT,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);

    // Миграция: добавляем поле product_image если его нет
    try {
        db.exec(`ALTER TABLE order_items ADD COLUMN product_image TEXT`);
        console.log('✅ Добавлено поле product_image в таблицу order_items');
    } catch (e) {
        // Поле уже существует, игнорируем ошибку
    }

    // Таблица истории статусов
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            status TEXT NOT NULL,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);

    // Создаем счетчик для номеров заказов
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_counter (
            id INTEGER PRIMARY KEY DEFAULT 1,
            current_number INTEGER DEFAULT 1000
        )
    `);

    // Инициализируем счетчик если его нет
    const counter = db.prepare('SELECT * FROM order_counter WHERE id = 1').get();
    if (!counter) {
        db.prepare('INSERT INTO order_counter (id, current_number) VALUES (1, 1000)').run();
    }

    console.log('✅ База данных инициализирована');
}

// Получить следующий номер заказа
function getNextOrderNumber() {
    const stmt = db.prepare('UPDATE order_counter SET current_number = current_number + 1 WHERE id = 1');
    stmt.run();
    const result = db.prepare('SELECT current_number FROM order_counter WHERE id = 1').get();
    return result.current_number;
}

// Создать новый заказ
function createOrder(orderData) {
    const { v4: uuidv4 } = require('uuid');
    const crypto = require('crypto');

    const orderId = uuidv4();
    const orderNumber = getNextOrderNumber();
    // Генерируем безопасный токен доступа (32 байта в hex = 64 символа)
    const accessToken = crypto.randomBytes(32).toString('hex');

    const stmt = db.prepare(`
        INSERT INTO orders (
            id, order_number, customer_name, customer_phone, customer_email,
            customer_type, delivery_type, delivery_address, delivery_city,
            pickup_location, payment_method, access_token, status, subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        orderId,
        orderNumber,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.customer_email || null,
        orderData.customer_type,
        orderData.delivery_type,
        orderData.delivery_address || null,
        orderData.delivery_city || null,
        orderData.pickup_location || null,
        orderData.payment_method || null,
        accessToken,
        'new',
        orderData.subtotal,
        orderData.subtotal
    );

    // Добавляем товары
    const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_name, product_sku, product_image, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of orderData.items) {
        itemStmt.run(
            orderId,
            item.name,
            item.sku || null,
            item.image || null,
            item.quantity,
            item.price,
            item.price * item.quantity
        );
    }

    // Добавляем первую запись в историю статусов
    addStatusHistory(orderId, 'new', 'Заказ создан');

    return { orderId, orderNumber, accessToken };
}

// Получить заказ по ID
function getOrderById(orderId) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return null;

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC').all(orderId);

    return { ...order, items, history };
}

// Получить все заказы
function getAllOrders(limit = 100, offset = 0) {
    return db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

// Обновить статус заказа
function updateOrderStatus(orderId, status, comment = null) {
    const stmt = db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, orderId);
    addStatusHistory(orderId, status, comment);
}

// Обновить стоимость доставки
function updateDeliveryCost(orderId, deliveryCost, comment = null) {
    const order = db.prepare('SELECT subtotal FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new Error('Заказ не найден');

    const newTotal = order.subtotal + deliveryCost;
    const stmt = db.prepare('UPDATE orders SET delivery_cost = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(deliveryCost, newTotal, orderId);

    if (comment) {
        addStatusHistory(orderId, null, comment);
    }
}

// Добавить комментарий менеджера
function addManagerComment(orderId, comment) {
    const stmt = db.prepare('UPDATE orders SET manager_comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(comment, orderId);
}

// Добавить запись в историю статусов
function addStatusHistory(orderId, status = null, comment = null) {
    if (!status && !comment) return;

    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);
    const currentStatus = status || order.status;

    const stmt = db.prepare('INSERT INTO order_status_history (order_id, status, comment) VALUES (?, ?, ?)');
    stmt.run(orderId, currentStatus, comment);
}

// Получить статистику заказов
function getOrderStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all();

    return {
        total: total.count,
        byStatus: byStatus.reduce((acc, item) => {
            acc[item.status] = item.count;
            return acc;
        }, {})
    };
}

module.exports = {
    initDatabase,
    createOrder,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    updateDeliveryCost,
    addManagerComment,
    getOrderStats
};
