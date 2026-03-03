// ===== ORDER PAGE LOGIC =====

class OrderPage {
    constructor() {
        this.orderId = this.getOrderIdFromUrl();
        this.order = null;
        this.loadingState = document.getElementById('loadingState');
        this.errorState = document.getElementById('errorState');
        this.orderContent = document.getElementById('orderContent');

        // Payment elements
        this.paymentSection = document.getElementById('paymentSection');
        this.paymentWaiting = document.getElementById('paymentWaiting');
        this.paymentOptions = document.getElementById('paymentOptions');
        this.paymentPaid = document.getElementById('paymentPaid');
        this.paymentDeliveryPaid = document.getElementById('paymentDeliveryPaid');

        this.init();
    }

    getOrderIdFromUrl() {
        const path = window.location.pathname;
        const match = path.match(/\/order\/([^\/]+)/);
        return match ? match[1] : null;
    }

    async init() {
        if (!this.orderId) {
            this.showError();
            return;
        }

        await this.loadOrder();
        this.setupPaymentHandlers();
    }

    async loadOrder() {
        try {
            // Получаем токен доступа из localStorage
            const accessToken = localStorage.getItem('orderAccessToken');

            if (!accessToken) {
                console.error('Токен доступа не найден');
                this.showError();
                return;
            }

            // Добавляем токен в query параметры
            const response = await fetch(`/api/order/${this.orderId}?token=${accessToken}`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.order = data.order;
                this.renderOrder(data.order);
            } else {
                console.error('Ошибка:', data.message);
                this.showError();
            }
        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            this.showError();
        }
    }

    renderOrder(order) {
        // Скрываем loading, показываем контент
        this.loadingState.style.display = 'none';
        this.orderContent.style.display = 'block';

        // Номер заказа (показываем order_number, а не UUID)
        document.getElementById('orderNumber').textContent = order.order_number || order.id;

        // Статус
        this.renderStatus(order.status);

        // Контактная информация
        document.getElementById('customerName').textContent = order.customer_name;
        document.getElementById('customerPhone').textContent = order.customer_phone;

        if (order.customer_email) {
            document.getElementById('customerEmailBlock').style.display = 'block';
            document.getElementById('customerEmail').textContent = order.customer_email;
        }

        // Доставка (delivery_type из БД)
        document.getElementById('deliveryMethod').textContent = this.getDeliveryMethodName(order.delivery_type);
        document.getElementById('deliveryAddress').textContent = `${order.delivery_city || ''}, ${order.delivery_address || ''}`.trim();

        // Комментарий
        if (order.comment || order.manager_comment) {
            document.getElementById('commentBlock').style.display = 'block';
            document.getElementById('orderComment').textContent = order.comment || order.manager_comment;
        }

        // Товары
        this.renderItems(order.items);

        // Итоги (используем subtotal и total из БД)
        const subtotal = order.subtotal || 0;
        const deliveryCost = order.delivery_cost || 0;
        const total = order.total || subtotal;

        document.getElementById('orderSubtotal').textContent = this.formatPrice(subtotal) + ' ₽';

        if (deliveryCost > 0) {
            document.getElementById('orderDeliveryCost').textContent = this.formatPrice(deliveryCost) + ' ₽';
        } else {
            document.getElementById('orderDeliveryCost').textContent = 'Рассчитывается';
        }

        document.getElementById('orderTotalPrice').textContent = this.formatPrice(total) + ' ₽';

        // Показываем секцию оплаты
        this.renderPaymentSection(order);
    }

    renderStatus(status) {
        const statusBadge = document.getElementById('orderStatus');
        const statusDescription = document.getElementById('statusDescription');

        const statusMap = {
            'new': {
                text: 'Новый',
                description: 'Ваш заказ принят и ожидает обработки',
                class: 'status-new'
            },
            'pending': {
                text: 'Новый',
                description: 'Ваш заказ принят и ожидает обработки',
                class: 'status-pending'
            },
            'processing': {
                text: 'В обработке',
                description: 'Ваш заказ обрабатывается менеджером',
                class: 'status-processing'
            },
            'confirmed': {
                text: 'Подтверждён',
                description: 'Заказ подтверждён, ожидает оплаты',
                class: 'status-confirmed'
            },
            'paid': {
                text: 'Оплачен',
                description: 'Заказ оплачен, готовится к отправке',
                class: 'status-paid'
            },
            'delivery_paid': {
                text: 'Доставка оплачена',
                description: 'Доставка оплачена, товар оплачивается при получении',
                class: 'status-delivery-paid'
            },
            'shipping': {
                text: 'В доставке',
                description: 'Заказ передан в службу доставки',
                class: 'status-shipping'
            },
            'completed': {
                text: 'Выполнен',
                description: 'Ваш заказ успешно выполнен',
                class: 'status-completed'
            },
            'cancelled': {
                text: 'Отменен',
                description: 'Заказ был отменен',
                class: 'status-cancelled'
            }
        };

        const statusInfo = statusMap[status] || statusMap['new'];

        statusBadge.className = `status-badge ${statusInfo.class}`;
        statusBadge.querySelector('.status-text').textContent = statusInfo.text;
        statusDescription.textContent = statusInfo.description;
    }

    renderPaymentSection(order) {
        // Всегда показываем секцию оплаты
        this.paymentSection.style.display = 'block';

        const status = order.status;
        const subtotal = order.subtotal || 0;
        const deliveryCost = order.delivery_cost || 0;
        const total = order.total || subtotal;

        // Скрываем все внутренние блоки
        this.paymentWaiting.style.display = 'none';
        this.paymentOptions.style.display = 'none';
        this.paymentPaid.style.display = 'none';
        this.paymentDeliveryPaid.style.display = 'none';

        if (status === 'paid' || status === 'shipping' || status === 'completed') {
            // Заказ полностью оплачен
            this.paymentPaid.style.display = 'flex';
        } else if (status === 'delivery_paid') {
            // Доставка оплачена, товар наличными
            this.paymentDeliveryPaid.style.display = 'flex';
            document.getElementById('deliveryPaidProductsAmount').textContent = this.formatPrice(subtotal) + ' ₽';
        } else if (status === 'confirmed') {
            // Заказ подтверждён, показываем варианты оплаты
            this.paymentOptions.style.display = 'block';

            // Применяем скидку 5% для онлайн-оплаты
            const discountedTotal = Math.round(total * 0.95);

            // Заполняем суммы
            document.getElementById('payFullAmount').textContent = this.formatPrice(discountedTotal) + ' ₽';
            document.getElementById('cashProductsAmount').textContent = this.formatPrice(subtotal) + ' ₽';
            document.getElementById('cashDeliveryAmount').textContent = this.formatPrice(deliveryCost) + ' ₽';

            // Сохраняем суммы для использования в initiatePayment
            this.discountedTotal = discountedTotal;
            this.originalTotal = total;

            // Если доставка = 0, скрываем опцию наличных
            if (deliveryCost <= 0) {
                document.getElementById('payCashOption').style.display = 'none';
            }
        } else {
            // Новый или в обработке - ожидание
            this.paymentWaiting.style.display = 'flex';
        }
    }

    renderItems(items) {
        const itemsList = document.getElementById('orderItemsList');
        itemsList.innerHTML = '';

        items.forEach(item => {
            const orderItem = this.createOrderItem(item);
            itemsList.appendChild(orderItem);
        });
    }

    createOrderItem(item) {
        const div = document.createElement('div');
        div.className = 'order-item';

        const price = item.unit_price || item.price || 0;
        const name = item.product_name || item.name || 'Товар';
        let image = item.product_image || item.image || '/images/placeholder.webp';

        // Добавляем слеш в начало пути если его нет
        if (image && !image.startsWith('/') && !image.startsWith('http')) {
            image = '/' + image;
        }

        div.innerHTML = `
            <div class="order-item-image">
                <img src="${image}" alt="${name}" onerror="this.src='/images/placeholder.webp'">
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${name}</div>
                <div class="order-item-quantity">${item.quantity} шт. × ${this.formatPrice(price)} ₽</div>
                <div class="order-item-price">${this.formatPrice(price * item.quantity)} ₽</div>
            </div>
        `;

        return div;
    }

    setupPaymentHandlers() {
        // Оплата полной суммы
        const payFullBtn = document.getElementById('payFullBtn');
        if (payFullBtn) {
            payFullBtn.addEventListener('click', () => this.initiatePayment('full'));
        }

        // Оплата доставки
        const payDeliveryBtn = document.getElementById('payDeliveryBtn');
        if (payDeliveryBtn) {
            payDeliveryBtn.addEventListener('click', () => this.initiatePayment('delivery'));
        }

        // Проверяем, если пришли с неудачной оплатой
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment') === 'failed') {
            this.showPaymentError();
        }
    }

    showPaymentError() {
        const paymentOptions = document.getElementById('paymentOptions');
        if (!paymentOptions) return;

        // Добавляем сообщение об ошибке перед вариантами оплаты
        const errorDiv = document.createElement('div');
        errorDiv.className = 'payment-error-message';
        errorDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; color: #991b1b; font-size: 14px;">
                Оплата не прошла. Пожалуйста, попробуйте ещё раз или выберите другой способ оплаты.
            </div>
        `;
        paymentOptions.insertBefore(errorDiv, paymentOptions.firstChild);
    }

    async initiatePayment(type) {
        if (!this.order) return;

        const btn = type === 'full'
            ? document.getElementById('payFullBtn')
            : document.getElementById('payDeliveryBtn');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Подождите...';
        }

        try {
            const accessToken = localStorage.getItem('orderAccessToken');

            const response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: this.orderId,
                    paymentType: type,
                    token: accessToken
                })
            });

            const result = await response.json();

            if (response.ok && result.success && result.formUrl) {
                // Перенаправляем на платёжную страницу банка
                console.log('💳 Перенаправление на страницу оплаты:', result.formUrl);
                window.location.href = result.formUrl;
            } else {
                throw new Error(result.message || 'Ошибка при создании платежа');
            }
        } catch (error) {
            console.error('Ошибка оплаты:', error);
            alert('Произошла ошибка при создании платежа. Попробуйте ещё раз или свяжитесь с нами по телефону.');

            if (btn) {
                btn.disabled = false;
                btn.textContent = type === 'full' ? 'Оплатить' : 'Оплатить доставку';
            }
        }
    }

    getDeliveryMethodName(method) {
        const methods = {
            'courier': 'Курьерская доставка',
            'pickup': 'Самовывоз',
            'transport': 'Транспортная компания'
        };
        return methods[method] || method || 'Не указан';
    }

    showError() {
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'flex';
    }

    formatPrice(price) {
        if (price === null || price === undefined) return '0';
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new OrderPage();
});
