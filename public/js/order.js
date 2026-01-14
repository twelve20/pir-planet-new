// ===== ORDER PAGE LOGIC =====

class OrderPage {
    constructor() {
        this.orderId = this.getOrderIdFromUrl();
        this.loadingState = document.getElementById('loadingState');
        this.errorState = document.getElementById('errorState');
        this.orderContent = document.getElementById('orderContent');

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

        // Оплата (используем поле из старой структуры, если есть, иначе показываем способ оплаты из данных заказа)
        const paymentMethod = order.payment_method || 'Не указан';
        document.getElementById('paymentMethod').textContent = this.getPaymentMethodName(paymentMethod);

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
    }

    renderStatus(status) {
        const statusBadge = document.getElementById('orderStatus');
        const statusDescription = document.getElementById('statusDescription');

        const statusMap = {
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

        const statusInfo = statusMap[status] || statusMap['pending'];

        statusBadge.className = `status-badge ${statusInfo.class}`;
        statusBadge.querySelector('.status-text').textContent = statusInfo.text;
        statusDescription.textContent = statusInfo.description;
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

    getDeliveryMethodName(method) {
        const methods = {
            'courier': 'Курьерская доставка',
            'pickup': 'Самовывоз',
            'transport': 'Транспортная компания'
        };
        return methods[method] || method;
    }

    getPaymentMethodName(method) {
        const methods = {
            'card': 'Банковская карта',
            'sbp': 'СБП (Система Быстрых Платежей)',
            'cash': 'Наличными при получении'
        };
        return methods[method] || method;
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
