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
            const response = await fetch(`/api/order/${this.orderId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.renderOrder(data.order);
            } else {
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

        // Номер заказа
        document.getElementById('orderNumber').textContent = order.id;

        // Статус
        this.renderStatus(order.status);

        // Контактная информация
        document.getElementById('customerName').textContent = order.customer_name;
        document.getElementById('customerPhone').textContent = order.customer_phone;

        if (order.customer_email) {
            document.getElementById('customerEmailBlock').style.display = 'block';
            document.getElementById('customerEmail').textContent = order.customer_email;
        }

        // Доставка
        document.getElementById('deliveryMethod').textContent = this.getDeliveryMethodName(order.delivery_method);
        document.getElementById('deliveryAddress').textContent = `${order.delivery_city}, ${order.delivery_address}`;

        // Оплата
        document.getElementById('paymentMethod').textContent = this.getPaymentMethodName(order.payment_method);

        // Комментарий
        if (order.comment) {
            document.getElementById('commentBlock').style.display = 'block';
            document.getElementById('orderComment').textContent = order.comment;
        }

        // Товары
        this.renderItems(order.items);

        // Итоги
        document.getElementById('orderSubtotal').textContent = this.formatPrice(order.total_price) + ' ₽';
        document.getElementById('orderTotalPrice').textContent = this.formatPrice(order.total_price) + ' ₽';
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

        div.innerHTML = `
            <div class="order-item-image">
                <img src="${item.image || 'images/placeholder.webp'}" alt="${item.name}">
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-quantity">${item.quantity} шт. × ${this.formatPrice(item.price)} ₽</div>
                <div class="order-item-price">${this.formatPrice(item.price * item.quantity)} ₽</div>
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
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new OrderPage();
});
