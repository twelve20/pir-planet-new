// ===== CART PAGE LOGIC =====

class CartPage {
    constructor() {
        this.emptyCart = document.getElementById('emptyCart');
        this.cartContent = document.getElementById('cartContent');
        this.cartItemsList = document.getElementById('cartItemsList');
        this.summaryTotalItems = document.getElementById('summaryTotalItems');
        this.summarySubtotal = document.getElementById('summarySubtotal');
        this.summaryTotal = document.getElementById('summaryTotal');

        this.init();
    }

    init() {
        this.renderCart();
        // Подписываемся на изменения в корзине
        window.addEventListener('storage', () => this.renderCart());
    }

    renderCart() {
        const items = cart.items;

        if (items.length === 0) {
            this.showEmptyCart();
        } else {
            this.showCartContent(items);
        }

        this.updateSummary();
    }

    showEmptyCart() {
        this.emptyCart.style.display = 'block';
        this.cartContent.style.display = 'none';
    }

    showCartContent(items) {
        this.emptyCart.style.display = 'none';
        this.cartContent.style.display = 'block';

        // Очищаем список
        this.cartItemsList.innerHTML = '';

        // Рендерим каждый товар
        items.forEach(item => {
            const cartItem = this.createCartItem(item);
            this.cartItemsList.appendChild(cartItem);
        });

        // Добавляем рекомендации после списка товаров
        this.renderRecommendations();
    }

    createCartItem(item) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.dataset.sku = item.sku;

        const subtotal = item.price * item.quantity;

        // Формируем информацию об упаковке (штуки кратны упаковке)
        let packInfo = '';
        if (item.packSize && item.packSize > 1) {
            const packs = Math.floor(item.quantity / item.packSize);
            packInfo = `
                <div class="cart-item-pack-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
                    </svg>
                    <span>${packs} упак. × ${item.packSize} шт</span>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'images/placeholder.webp'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.name}</h3>
                <div class="cart-item-price">${this.formatPrice(item.price)} ₽ <span class="price-per-unit">за шт</span></div>
                ${packInfo}
                <div class="cart-item-quantity">
                    <button class="quantity-decrease" data-sku="${item.sku}">−</button>
                    <input type="number"
                           value="${item.quantity}"
                           min="${item.packSize || 1}"
                           max="999"
                           step="${item.packSize || 1}"
                           class="quantity-input"
                           data-sku="${item.sku}">
                    <button class="quantity-increase" data-sku="${item.sku}">+</button>
                </div>
            </div>
            <div class="cart-item-actions">
                <div class="cart-item-subtotal">${this.formatPrice(subtotal)} ₽</div>
                <button class="cart-item-remove" data-sku="${item.sku}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Удалить
                </button>
            </div>
        `;

        // Обработчики событий
        const decreaseBtn = div.querySelector('.quantity-decrease');
        const increaseBtn = div.querySelector('.quantity-increase');
        const quantityInput = div.querySelector('.quantity-input');
        const removeBtn = div.querySelector('.cart-item-remove');

        decreaseBtn.addEventListener('click', () => this.decreaseQuantity(item.sku));
        increaseBtn.addEventListener('click', () => this.increaseQuantity(item.sku));
        quantityInput.addEventListener('change', (e) => this.updateQuantityInput(item.sku, e.target.value));
        removeBtn.addEventListener('click', () => this.removeItem(item.sku));

        return div;
    }

    renderRecommendations() {
        // Проверяем, есть ли уже блок рекомендаций
        let recommendationsBlock = document.getElementById('cartRecommendations');

        // Если блока нет, создаём его
        if (!recommendationsBlock) {
            recommendationsBlock = document.createElement('div');
            recommendationsBlock.id = 'cartRecommendations';
            recommendationsBlock.className = 'cart-recommendations';

            // Вставляем после списка товаров, но перед итогами
            this.cartItemsList.parentNode.insertBefore(recommendationsBlock, this.cartItemsList.nextSibling);
        }

        // Очищаем содержимое
        recommendationsBlock.innerHTML = '';

        // Данные рекомендуемых товаров
        const recommendedProducts = [
            {
                id: 17,
                sku: 'alu-tape',
                name: 'Алюминиевая клейкая лента 48мм×50м',
                price: 1200,
                image: 'images/lenta.webp'
            },
            {
                id: 20,
                sku: 'techno-glue',
                name: 'Клей-пена монтажная Технониколь LOGICPIR, 1000 мл',
                price: 1200,
                image: 'images/pena_techno.webp'
            }
        ];

        // Фильтруем товары, которых ещё нет в корзине
        const itemsNotInCart = recommendedProducts.filter(product => {
            return !cart.items.find(item => item.sku === product.sku);
        });

        // Если все рекомендуемые товары уже в корзине, не показываем блок
        if (itemsNotInCart.length === 0) {
            recommendationsBlock.style.display = 'none';
            return;
        }

        recommendationsBlock.style.display = 'block';

        // Создаём заголовок
        const title = document.createElement('h3');
        title.className = 'recommendations-title';
        title.textContent = 'Рекомендуем к заказу';
        recommendationsBlock.appendChild(title);

        // Создаём контейнер для карточек
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'recommendations-grid';
        recommendationsBlock.appendChild(cardsContainer);

        // Создаём карточки для товаров
        itemsNotInCart.forEach(product => {
            const card = this.createRecommendationCard(product);
            cardsContainer.appendChild(card);
        });
    }

    createRecommendationCard(product) {
        const card = document.createElement('div');
        card.className = 'recommendation-card';

        card.innerHTML = `
            <div class="recommendation-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="recommendation-details">
                <h4 class="recommendation-name">${product.name}</h4>
                <div class="recommendation-price">${this.formatPrice(product.price)} ₽</div>
            </div>
            <button class="recommendation-add-btn" data-sku="${product.sku}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a1 1 0 0 0 0 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 15 2H9z"></path>
                    <line x1="12" y1="9" x2="12" y2="17"></line>
                    <line x1="8" y1="13" x2="16" y2="13"></line>
                </svg>
                Добавить
            </button>
        `;

        // Обработчик добавления в корзину
        const addBtn = card.querySelector('.recommendation-add-btn');
        addBtn.addEventListener('click', () => {
            cart.addItem({
                sku: product.sku,
                name: product.name,
                price: product.price,
                quantity: 1,
                packSize: null,
                image: product.image
            });
            this.renderCart(); // Перерисовываем корзину (обновит рекомендации)
        });

        return card;
    }

    decreaseQuantity(sku) {
        const item = cart.items.find(i => i.sku === sku);
        if (item) {
            const packSize = item.packSize || 1;
            const minQty = packSize;

            if (item.quantity > minQty) {
                cart.updateQuantity(sku, item.quantity - packSize);
                this.renderCart();
            } else {
                // Если это последняя упаковка - удаляем товар
                this.removeItem(sku);
            }
        }
    }

    increaseQuantity(sku) {
        const item = cart.items.find(i => i.sku === sku);
        if (item && item.quantity < 999) {
            const packSize = item.packSize || 1;
            cart.updateQuantity(sku, item.quantity + packSize);
            this.renderCart();
        }
    }

    updateQuantityInput(sku, value) {
        const item = cart.items.find(i => i.sku === sku);
        if (!item) return;

        const quantity = parseInt(value);
        const packSize = item.packSize || 1;

        if (quantity >= packSize && quantity <= 999) {
            // Округляем до кратности упаковки
            const adjustedQuantity = Math.round(quantity / packSize) * packSize;
            cart.updateQuantity(sku, adjustedQuantity);
            this.renderCart();
        } else if (quantity < packSize) {
            // Если меньше минимума - ставим минимум
            cart.updateQuantity(sku, packSize);
            this.renderCart();
        }
    }

    removeItem(sku) {
        if (confirm('Удалить товар из корзины?')) {
            cart.removeItem(sku);
            this.renderCart();
            cart.showNotification('Товар удален из корзины', 'success');
        }
    }

    updateSummary() {
        const totalItems = cart.getTotalItems();
        const totalPrice = cart.getTotalPrice();

        this.summaryTotalItems.textContent = totalItems;
        this.summarySubtotal.textContent = this.formatPrice(totalPrice) + ' ₽';
        this.summaryTotal.textContent = this.formatPrice(totalPrice) + ' ₽';
    }

    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new CartPage();
});
