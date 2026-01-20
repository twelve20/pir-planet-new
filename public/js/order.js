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
        // Оплата полной суммы (карта + СБП в одном виджете)
        const payFullBtn = document.getElementById('payFullBtn');
        if (payFullBtn) {
            payFullBtn.addEventListener('click', () => this.initiatePayment('full'));
        }

        // Оплата доставки (карта + СБП в одном виджете)
        const payDeliveryBtn = document.getElementById('payDeliveryBtn');
        if (payDeliveryBtn) {
            payDeliveryBtn.addEventListener('click', () => this.initiatePayment('delivery'));
        }

        // Отслеживание закрытия виджета оплаты
        this.setupPaymentCloseHandler();
    }

    setupPaymentCloseHandler() {
        const widgetContainer = document.getElementById('alfa-payment-container');

        // Проверяем несколькими способами
        const checkAndUnlock = () => {
            const modal = document.querySelector('.alfa-widget-modal');
            const overlay = document.querySelector('.alfa-widget-overlay');

            // Проверяем, есть ли видимый модал или оверлей
            const isModalVisible = modal && getComputedStyle(modal).display !== 'none' && getComputedStyle(modal).visibility !== 'hidden';
            const isOverlayVisible = overlay && getComputedStyle(overlay).display !== 'none';

            if (!isModalVisible && !isOverlayVisible) {
                // Виджет точно закрыт - разблокируем всё
                document.body.classList.remove('payment-modal-open');
                if (widgetContainer) {
                    widgetContainer.style.display = 'none';
                }
            }
        };

        // Периодически проверяем
        setInterval(checkAndUnlock, 200);

        // Слушаем клики по overlay (закрытие виджета)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('alfa-widget-overlay')) {
                setTimeout(checkAndUnlock, 100);
            }
        });

        // Слушаем escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                setTimeout(checkAndUnlock, 100);
            }
        });

        // Слушаем изменения в DOM (когда виджет удаляет модал)
        const observer = new MutationObserver(() => {
            checkAndUnlock();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    initiatePayment(type) {
        if (!this.order) return;

        const subtotal = this.order.subtotal || 0;
        const deliveryCost = this.order.delivery_cost || 0;

        // Определяем сумму к оплате
        let amount;
        let description;

        if (type === 'full') {
            // Используем сумму со скидкой 5%
            amount = this.discountedTotal || Math.round((this.order.total || subtotal) * 0.95);
            description = `Оплата заказа №${this.order.order_number} (скидка 5%)`;
        } else if (type === 'delivery') {
            amount = deliveryCost;
            description = `Оплата доставки заказа №${this.order.order_number}`;
        }

        // Заполняем скрытые поля для виджета
        const widgetOrderNumber = `${this.order.order_number}-${type}-${Date.now()}`;

        // Email обязателен для Альфа-Банка, используем дефолтный если не указан или невалиден
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = this.order.customer_email && emailRegex.test(this.order.customer_email);

        const customerEmail = isValidEmail
            ? this.order.customer_email
            : 'noreply@pir-planet.ru';

        document.getElementById('hiddenClientName').value = this.order.customer_name;
        document.getElementById('hiddenClientEmail').value = customerEmail;
        document.getElementById('hiddenOrderNumber').value = widgetOrderNumber;
        document.getElementById('hiddenTotalAmount').value = Math.round(amount * 100); // в копейках

        // Предупреждаем, если используем фолбэк email
        if (!isValidEmail && this.order.customer_email) {
            console.warn(`Email "${this.order.customer_email}" невалиден, используем фолбэк: ${customerEmail}`);
        }

        console.log('Данные для виджета:', {
            name: this.order.customer_name,
            email: customerEmail,
            emailUsed: isValidEmail ? 'customer' : 'fallback',
            orderNumber: widgetOrderNumber,
            amount: Math.round(amount * 100)
        });

        // Показываем контейнер виджета
        const widgetContainer = document.getElementById('alfa-payment-container');
        if (!widgetContainer) {
            console.error('Контейнер виджета не найден');
            alert('Ошибка: контейнер виджета не найден');
            return;
        }

        widgetContainer.style.display = 'block';
        console.log('Инициирую оплату. Сумма:', amount, 'Тип:', type);

        // Даём виджету время на инициализацию
        setTimeout(() => {
            // Ждём инициализации виджета
            let attempts = 0;
            const checkWidget = setInterval(() => {
                attempts++;
                const widgetButton = document.querySelector('#alfa-payment-button button');
                console.log(`Попытка ${attempts}: кнопка виджета`, widgetButton ? 'найдена' : 'не найдена');

                if (widgetButton) {
                    clearInterval(checkWidget);
                    console.log('Виджет инициализирован, открываю форму оплаты');
                    document.body.classList.add('payment-modal-open');
                    widgetButton.click();
                } else if (attempts > 20) {
                    clearInterval(checkWidget);
                    console.error('Виджет не инициализировался после 20 попыток');
                    alert('Не удалось загрузить форму оплаты. Попробуйте обновить страницу.');
                }
            }, 300);
        }, 100);
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
