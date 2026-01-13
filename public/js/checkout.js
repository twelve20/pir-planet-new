// ===== CHECKOUT PAGE LOGIC =====

class CheckoutPage {
    constructor() {
        this.form = document.getElementById('checkoutForm');
        this.orderItems = document.getElementById('orderItems');
        this.orderTotalItems = document.getElementById('orderTotalItems');
        this.orderSubtotal = document.getElementById('orderSubtotal');
        this.orderTotal = document.getElementById('orderTotal');

        this.init();
    }

    init() {
        // Проверяем, есть ли товары в корзине
        if (cart.items.length === 0) {
            window.location.href = '/cart';
            return;
        }

        this.renderOrderSummary();
        this.setupFormHandlers();
        this.setupPhoneMask();
    }

    renderOrderSummary() {
        // Очищаем список
        this.orderItems.innerHTML = '';

        // Рендерим товары
        cart.items.forEach(item => {
            const orderItem = this.createOrderItem(item);
            this.orderItems.appendChild(orderItem);
        });

        // Обновляем итоги
        const totalItems = cart.getTotalItems();
        const totalPrice = cart.getTotalPrice();

        this.orderTotalItems.textContent = totalItems;
        this.orderSubtotal.textContent = this.formatPrice(totalPrice) + ' ₽';
        this.orderTotal.textContent = this.formatPrice(totalPrice) + ' ₽';
    }

    createOrderItem(item) {
        const div = document.createElement('div');
        div.className = 'order-item';

        div.innerHTML = `
            <div class="order-item-image">
                <img src="${item.image || 'images/placeholder.webp'}" alt="${item.name}">
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-quantity">${item.quantity} шт.</div>
            </div>
            <div class="order-item-price">${this.formatPrice(item.price * item.quantity)} ₽</div>
        `;

        return div;
    }

    setupFormHandlers() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupPhoneMask() {
        const phoneInput = document.getElementById('customerPhone');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length === 0) {
                e.target.value = '';
                return;
            }

            if (value[0] === '8') {
                value = '7' + value.slice(1);
            }

            if (value[0] !== '7') {
                value = '7' + value;
            }

            let formatted = '+7';

            if (value.length > 1) {
                formatted += ' (' + value.slice(1, 4);
            }
            if (value.length >= 5) {
                formatted += ') ' + value.slice(4, 7);
            }
            if (value.length >= 8) {
                formatted += '-' + value.slice(7, 9);
            }
            if (value.length >= 10) {
                formatted += '-' + value.slice(9, 11);
            }

            e.target.value = formatted;
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitButton = document.getElementById('submitOrder');
        submitButton.disabled = true;
        submitButton.textContent = 'Оформление...';

        try {
            // Собираем данные формы
            const formData = new FormData(this.form);
            const deliveryMethod = formData.get('deliveryMethod');
            const paymentMethod = formData.get('paymentMethod');

            const orderData = {
                customer: {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    email: formData.get('email') || null
                },
                delivery: {
                    method: deliveryMethod,
                    city: formData.get('city'),
                    address: formData.get('address'),
                    postcode: formData.get('postcode') || null
                },
                payment: {
                    method: paymentMethod
                },
                items: cart.items,
                comment: formData.get('comment') || null,
                totalPrice: cart.getTotalPrice()
            };

            // Отправляем заказ на сервер
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Успешное создание заказа
                const orderId = result.orderId;

                // Очищаем корзину
                cart.clear();

                // Если выбрана онлайн-оплата, перенаправляем на платежную форму
                if (paymentMethod === 'card' || paymentMethod === 'sbp') {
                    // TODO: Интеграция с Альфа-Банк
                    // Пока просто перенаправляем на страницу заказа
                    window.location.href = `/order/${orderId}`;
                } else {
                    // Для оплаты наличными сразу перенаправляем на страницу заказа
                    window.location.href = `/order/${orderId}`;
                }
            } else {
                throw new Error(result.message || 'Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.');

            submitButton.disabled = false;
            submitButton.textContent = 'Оформить заказ';
        }
    }

    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new CheckoutPage();
});
