// Admin Order Page
class AdminOrderPage {
    constructor() {
        this.orderId = null;
        this.order = null;
        this.editedItems = [];

        this.loadingState = document.getElementById('loadingState');
        this.errorState = document.getElementById('errorState');
        this.orderContent = document.getElementById('orderContent');

        this.init();
    }

    init() {
        // Get order ID from URL
        const params = new URLSearchParams(window.location.search);
        this.orderId = params.get('id');

        if (!this.orderId) {
            this.showError();
            return;
        }

        // Load order
        this.loadOrder();

        // Setup form submit handler
        document.getElementById('statusForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateOrder();
        });
    }

    async loadOrder() {
        try {
            this.showLoading();

            const response = await fetch(`/api/admin/order/${this.orderId}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (response.ok && data.success) {
                this.order = data.order;
                this.renderOrder(data.order);
                this.showContent();
            } else {
                throw new Error(data.message || 'Ошибка загрузки заказа');
            }
        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            this.showError();
        }
    }

    renderOrder(order) {
        // Order number
        document.getElementById('orderNumber').textContent = `#${order.order_number}`;

        // Customer info
        const customerTypes = {
            'individual': 'Физическое лицо',
            'legal': 'Юридическое лицо'
        };

        document.getElementById('customerInfo').innerHTML = `
            <div class="info-row">
                <div class="info-label">Имя:</div>
                <div class="info-value">${this.escapeHtml(order.customer_name)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Телефон:</div>
                <div class="info-value">${this.escapeHtml(order.customer_phone)}</div>
            </div>
            ${order.customer_email ? `
            <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${this.escapeHtml(order.customer_email)}</div>
            </div>
            ` : ''}
            <div class="info-row">
                <div class="info-label">Тип клиента:</div>
                <div class="info-value">${customerTypes[order.customer_type] || order.customer_type || 'Не указан'}</div>
            </div>
        `;

        // Delivery info
        const deliveryTypes = {
            'delivery': 'Доставка курьером',
            'courier': 'Курьерская доставка',
            'pickup': 'Самовывоз',
            'transport': 'Транспортная компания'
        };

        document.getElementById('deliveryInfo').innerHTML = `
            <div class="info-row">
                <div class="info-label">Способ доставки:</div>
                <div class="info-value">${deliveryTypes[order.delivery_type] || order.delivery_type || 'Не указан'}</div>
            </div>
            ${order.delivery_city ? `
            <div class="info-row">
                <div class="info-label">Город:</div>
                <div class="info-value">${this.escapeHtml(order.delivery_city)}</div>
            </div>
            ` : ''}
            ${order.delivery_address ? `
            <div class="info-row">
                <div class="info-label">Адрес:</div>
                <div class="info-value">${this.escapeHtml(order.delivery_address)}</div>
            </div>
            ` : ''}
            ${order.pickup_location ? `
            <div class="info-row">
                <div class="info-label">Пункт выдачи:</div>
                <div class="info-value">${this.escapeHtml(order.pickup_location)}</div>
            </div>
            ` : ''}
        `;

        // Items
        const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
        this.editedItems = items.map((item, index) => ({
            id: item.id,
            product_name: item.product_name || item.name,
            product_image: item.product_image || item.image,
            quantity: item.quantity,
            unit_price: item.unit_price || item.price || item.product_price || 0,
            tempId: item.id || `temp_${index}`
        }));
        this.renderItems();

        // Status form
        document.getElementById('orderStatus').value = order.status;
        document.getElementById('deliveryCost').value = order.delivery_cost || 0;
        document.getElementById('managerComment').value = order.manager_comment || '';

        // Order meta
        document.getElementById('orderMeta').innerHTML = `
            <div class="info-row">
                <div class="info-label">Текущий статус:</div>
                <div class="info-value">${this.renderStatusBadge(order.status)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Дата создания:</div>
                <div class="info-value">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
            </div>
            ${order.updated_at ? `
            <div class="info-row">
                <div class="info-label">Последнее обновление:</div>
                <div class="info-value">${new Date(order.updated_at).toLocaleString('ru-RU')}</div>
            </div>
            ` : ''}
        `;
    }

    renderItems() {
        const container = document.getElementById('itemsContainer');

        if (this.editedItems.length === 0) {
            container.innerHTML = '<p class="no-items">Нет товаров в заказе</p>';
        } else {
            container.innerHTML = `
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Название</th>
                            <th>Кол-во</th>
                            <th>Цена</th>
                            <th>Сумма</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.editedItems.map((item, index) => `
                            <tr>
                                <td class="item-name-cell">${this.escapeHtml(item.product_name)}</td>
                                <td>
                                    <input type="number" class="item-quantity-input"
                                           value="${item.quantity}" min="1"
                                           onchange="orderPage.updateItemQuantity(${index}, this.value)">
                                </td>
                                <td>
                                    <input type="number" class="item-price-input"
                                           value="${item.unit_price}" min="0" step="1"
                                           onchange="orderPage.updateItemPrice(${index}, this.value)">
                                </td>
                                <td class="item-total">${(item.unit_price * item.quantity).toLocaleString('ru-RU')} ₽</td>
                                <td>
                                    <button type="button" class="btn-delete-item" onclick="orderPage.deleteItem(${index})">✕</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        this.updateTotalsDisplay();
    }

    updateTotalsDisplay() {
        const subtotal = this.calculateSubtotal();
        const deliveryCost = parseFloat(document.getElementById('deliveryCost')?.value) || 0;
        const total = subtotal + deliveryCost;

        document.getElementById('orderTotals').innerHTML = `
            <div class="totals-grid">
                <div class="total-line">
                    <span>Товары:</span>
                    <span>${subtotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div class="total-line">
                    <span>Доставка:</span>
                    <span>${deliveryCost > 0 ? deliveryCost.toLocaleString('ru-RU') + ' ₽' : 'Не рассчитана'}</span>
                </div>
                <div class="total-line total-final">
                    <span>Итого:</span>
                    <span>${total.toLocaleString('ru-RU')} ₽</span>
                </div>
            </div>
        `;
    }

    calculateSubtotal() {
        return this.editedItems.reduce((sum, item) => {
            return sum + (item.unit_price * item.quantity);
        }, 0);
    }

    updateItemQuantity(index, value) {
        const quantity = parseInt(value) || 1;
        this.editedItems[index].quantity = quantity;
        this.renderItems();
    }

    updateItemPrice(index, value) {
        const price = parseFloat(value) || 0;
        this.editedItems[index].unit_price = price;
        this.renderItems();
    }

    deleteItem(index) {
        if (this.editedItems.length === 1) {
            alert('Нельзя удалить последний товар из заказа');
            return;
        }
        if (confirm('Удалить этот товар?')) {
            this.editedItems.splice(index, 1);
            this.renderItems();
        }
    }

    addNewItem() {
        const nameInput = document.getElementById('newItemName');
        const quantityInput = document.getElementById('newItemQuantity');
        const priceInput = document.getElementById('newItemPrice');

        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value) || 1;
        const price = parseFloat(priceInput.value) || 0;

        if (!name) {
            alert('Введите название товара');
            nameInput.focus();
            return;
        }

        if (price <= 0) {
            alert('Введите цену товара');
            priceInput.focus();
            return;
        }

        this.editedItems.push({
            product_name: name,
            product_image: null,
            quantity: quantity,
            unit_price: price,
            tempId: `new_${Date.now()}`
        });

        // Clear form
        nameInput.value = '';
        quantityInput.value = '1';
        priceInput.value = '';

        this.renderItems();
    }

    async updateOrder() {
        const submitButton = document.querySelector('#statusForm button[type="submit"]');
        const originalText = submitButton.textContent;

        try {
            // Disable button and show loading
            submitButton.disabled = true;
            submitButton.textContent = 'Сохранение...';

            const form = document.getElementById('statusForm');
            const formData = new FormData(form);

            const newStatus = formData.get('status');
            const deliveryCost = parseFloat(formData.get('deliveryCost')) || 0;
            const comment = formData.get('comment');

            // Update items
            const itemsResponse = await fetch(`/api/order/${this.orderId}/items`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: this.editedItems.map(item => ({
                        name: item.product_name,
                        quantity: item.quantity,
                        price: item.unit_price,
                        image: item.product_image || null
                    }))
                })
            });

            if (!itemsResponse.ok) {
                const itemsData = await itemsResponse.json();
                throw new Error(itemsData.message || 'Ошибка обновления товаров');
            }

            // Update delivery cost
            const deliveryResponse = await fetch(`/api/order/${this.orderId}/delivery`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deliveryCost: deliveryCost, comment: comment })
            });

            if (!deliveryResponse.ok) {
                throw new Error('Ошибка обновления стоимости доставки');
            }

            // Update status
            const statusResponse = await fetch(`/api/order/${this.orderId}/status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, comment: comment })
            });

            if (!statusResponse.ok) {
                throw new Error('Ошибка обновления статуса');
            }

            alert('✅ Заказ успешно обновлен');
            this.loadOrder(); // Reload order

        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            alert('❌ Ошибка при обновлении заказа: ' + error.message);
        } finally {
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    async deleteOrder() {
        if (!confirm(`Вы уверены, что хотите удалить заказ #${this.order.order_number}?\n\nЭто действие необратимо!`)) {
            return;
        }

        try {
            const response = await fetch(`/api/order/${this.orderId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert('Заказ удалён');
                window.location.href = '/admin/orders.html';
            } else {
                throw new Error(data.message || 'Ошибка удаления заказа');
            }
        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
            alert('Ошибка при удалении заказа: ' + error.message);
        }
    }

    renderStatusBadge(status) {
        const statusMap = {
            'new': { text: 'Новый', class: 'status-new' },
            'processing': { text: 'В обработке', class: 'status-processing' },
            'confirmed': { text: 'Подтвержден', class: 'status-confirmed' },
            'paid': { text: 'Оплачен', class: 'status-paid' },
            'delivery_paid': { text: 'Доставка оплачена', class: 'status-delivery-paid' },
            'shipping': { text: 'В доставке', class: 'status-shipping' },
            'completed': { text: 'Выполнен', class: 'status-completed' },
            'cancelled': { text: 'Отменен', class: 'status-cancelled' }
        };

        const statusInfo = statusMap[status] || { text: status, class: 'status-new' };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    showLoading() {
        this.loadingState.style.display = 'block';
        this.errorState.style.display = 'none';
        this.orderContent.style.display = 'none';
    }

    showError() {
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'block';
        this.orderContent.style.display = 'none';
    }

    showContent() {
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'none';
        this.orderContent.style.display = 'block';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize page
let orderPage;
document.addEventListener('DOMContentLoaded', () => {
    orderPage = new AdminOrderPage();
});
