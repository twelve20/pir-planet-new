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
    }

    createCartItem(item) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.dataset.sku = item.sku;

        const subtotal = item.price * item.quantity;

        // Формируем информацию об упаковке
        const packInfo = item.packSize ? `
            <div class="cart-item-pack-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
                </svg>
                <span>${Math.floor(item.quantity / item.packSize)} упак. × ${item.packSize} шт</span>
            </div>
        ` : '';

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
