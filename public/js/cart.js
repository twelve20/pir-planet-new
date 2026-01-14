// ===== УПРАВЛЕНИЕ КОРЗИНОЙ =====

class Cart {
    constructor() {
        this.items = this.loadCart();
        this.updateCartIcon();
    }

    // Загрузить корзину из localStorage
    loadCart() {
        const savedCart = localStorage.getItem('pirplanet_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    }

    // Сохранить корзину в localStorage
    saveCart() {
        localStorage.setItem('pirplanet_cart', JSON.stringify(this.items));
        this.updateCartIcon();
    }

    // Добавить товар в корзину
    addItem(product) {
        // Проверяем, есть ли уже такой товар
        const existingItem = this.items.find(item => item.sku === product.sku);

        if (existingItem) {
            existingItem.quantity += product.quantity || 1;
        } else {
            this.items.push({
                sku: product.sku,
                name: product.name,
                price: product.price,
                quantity: product.quantity || 1,
                image: product.image || null
            });
        }

        this.saveCart();
        this.showNotification('Товар добавлен в корзину');
    }

    // Удалить товар из корзины
    removeItem(sku) {
        this.items = this.items.filter(item => item.sku !== sku);
        this.saveCart();
    }

    // Обновить количество товара
    updateQuantity(sku, quantity) {
        const item = this.items.find(item => item.sku === sku);
        if (item) {
            item.quantity = Math.max(1, quantity);
            this.saveCart();
        }
    }

    // Очистить корзину
    clear() {
        this.items = [];
        this.saveCart();
    }

    // Получить общее количество товаров
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Получить общую сумму
    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Обновить иконку корзины в шапке
    updateCartIcon() {
        const cartCount = document.querySelector('.cart-count');
        const totalItems = this.getTotalItems();

        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    // Показать уведомление
    showNotification(message, type = 'success') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.textContent = message;

        // Добавляем на страницу
        document.body.appendChild(notification);

        // Показываем с анимацией
        setTimeout(() => notification.classList.add('show'), 10);

        // Скрываем через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Инициализируем корзину
const cart = new Cart();

// Функция для добавления товара в корзину (вызывается из HTML)
function addToCart(button) {
    const productCard = button.closest('.catalog-item');

    if (!productCard) {
        console.error('Не найдена карточка товара');
        return;
    }

    const product = {
        sku: productCard.dataset.sku || `product-${Date.now()}`,
        name: productCard.dataset.name || productCard.querySelector('h3')?.textContent || 'Товар',
        price: parseFloat(productCard.dataset.price) || 0,
        quantity: 1,
        image: productCard.dataset.image || productCard.querySelector('img')?.src || null
    };

    cart.addItem(product);

    // Переключаем отображение на счетчик
    updateCardDisplay(productCard);
}

// Увеличение количества товара
function increaseQuantity(button) {
    const productCard = button.closest('.catalog-item');
    if (!productCard) return;

    const sku = productCard.dataset.sku;
    const existingItem = cart.items.find(item => item.sku === sku);

    if (existingItem) {
        existingItem.quantity++;
        cart.save();
        cart.updateCounter();
        updateCardDisplay(productCard);
    }
}

// Уменьшение количества товара
function decreaseQuantity(button) {
    const productCard = button.closest('.catalog-item');
    if (!productCard) return;

    const sku = productCard.dataset.sku;
    const existingItem = cart.items.find(item => item.sku === sku);

    if (existingItem) {
        if (existingItem.quantity > 1) {
            existingItem.quantity--;
            cart.save();
            cart.updateCounter();
            updateCardDisplay(productCard);
        } else {
            // Удаляем товар из корзины
            cart.removeItem(sku);
            updateCardDisplay(productCard);
        }
    }
}

// Обновление отображения карточки товара
function updateCardDisplay(productCard) {
    const sku = productCard.dataset.sku;
    const existingItem = cart.items.find(item => item.sku === sku);

    const addButton = productCard.querySelector('.btn-add-to-cart');
    const cartAddedControls = productCard.querySelector('.cart-added-controls');
    const qtyValue = productCard.querySelector('.qty-value');

    if (existingItem && existingItem.quantity > 0) {
        // Товар в корзине - показываем счетчик + кнопку перехода
        addButton.style.display = 'none';
        cartAddedControls.style.display = 'flex';
        qtyValue.textContent = existingItem.quantity;
    } else {
        // Товара нет в корзине - показываем кнопку "В корзину"
        addButton.style.display = 'block';
        cartAddedControls.style.display = 'none';
    }
}

// Обновление всех карточек при загрузке страницы
function updateAllCards() {
    const productCards = document.querySelectorAll('.catalog-item');
    productCards.forEach(card => {
        if (card.dataset.sku) {
            updateCardDisplay(card);
        }
    });
}

// Экспортируем для использования в других скриптах
window.cart = cart;
window.addToCart = addToCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.updateAllCards = updateAllCards;

// Обновляем отображение карточек при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllCards);
} else {
    updateAllCards();
}
