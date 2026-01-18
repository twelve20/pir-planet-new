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
        this.restoreFormData();
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

    saveFormData(formData) {
        // Сохраняем данные формы в localStorage
        const formDataToSave = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email') || '',
            deliveryMethod: formData.get('deliveryMethod'),
            city: formData.get('city'),
            address: formData.get('address'),
            comment: formData.get('comment') || ''
        };

        localStorage.setItem('checkoutFormData', JSON.stringify(formDataToSave));
    }

    restoreFormData() {
        // Восстанавливаем данные формы из localStorage
        const savedData = localStorage.getItem('checkoutFormData');

        if (!savedData) {
            return;
        }

        try {
            const formData = JSON.parse(savedData);

            // Заполняем поля формы
            if (formData.name) document.getElementById('customerName').value = formData.name;
            if (formData.phone) document.getElementById('customerPhone').value = formData.phone;
            if (formData.email) document.getElementById('customerEmail').value = formData.email;
            if (formData.city) document.getElementById('deliveryCity').value = formData.city;
            if (formData.address) document.getElementById('deliveryAddress').value = formData.address;
            if (formData.comment) document.getElementById('orderComment').value = formData.comment;

            // Восстанавливаем radio buttons
            if (formData.deliveryMethod) {
                const deliveryRadio = document.querySelector(`input[name="deliveryMethod"][value="${formData.deliveryMethod}"]`);
                if (deliveryRadio) deliveryRadio.checked = true;
            }
        } catch (e) {
            console.error('Ошибка восстановления данных формы:', e);
        }
    }

    clearFormData() {
        localStorage.removeItem('checkoutFormData');
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitButton = document.getElementById('submitOrder');
        submitButton.disabled = true;
        submitButton.textContent = 'Отправка...';

        try {
            // Собираем данные формы
            const formData = new FormData(this.form);
            const deliveryMethod = formData.get('deliveryMethod');

            // Сохраняем данные формы
            this.saveFormData(formData);

            const orderData = {
                customer: {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    email: formData.get('email') || null
                },
                delivery: {
                    method: deliveryMethod,
                    city: formData.get('city'),
                    address: formData.get('address')
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
                const accessToken = result.accessToken;

                // Сохраняем orderId и токен доступа в localStorage
                localStorage.setItem('lastOrderId', orderId);
                localStorage.setItem('orderAccessToken', accessToken);

                // Яндекс Метрика - заявка отправлена
                if (typeof ym !== 'undefined') {
                    ym(104857358, 'reachGoal', 'checkout_request_sent');
                }

                // Очищаем корзину
                cart.clear();

                // Очищаем сохранённые данные формы
                this.clearFormData();

                // Перенаправляем на страницу заказа
                window.location.href = `/order/${orderId}`;
            } else {
                throw new Error(result.message || 'Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.');

            submitButton.disabled = false;
            submitButton.textContent = 'Отправить заявку';
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
