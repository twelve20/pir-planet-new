// Admin Orders Page
class AdminOrdersPage {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentOrder = null;

        this.loadingState = document.getElementById('loadingState');
        this.errorState = document.getElementById('errorState');
        this.ordersContent = document.getElementById('ordersContent');
        this.emptyState = document.getElementById('emptyState');
        this.ordersTableBody = document.getElementById('ordersTableBody');

        this.filterStatus = document.getElementById('filterStatus');
        this.filterSearch = document.getElementById('filterSearch');
        this.btnRefresh = document.getElementById('btnRefresh');

        this.modal = document.getElementById('orderModal');
        this.modalClose = document.getElementById('modalClose');

        this.init();
    }

    init() {
        // Event listeners
        this.filterStatus.addEventListener('change', () => this.applyFilters());
        this.filterSearch.addEventListener('input', () => this.applyFilters());
        this.btnRefresh.addEventListener('click', () => this.loadOrders());
        this.modalClose.addEventListener('click', () => this.closeModal());

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Load orders
        this.loadOrders();
    }

    async loadOrders() {
        try {
            this.showLoading();

            const response = await fetch('/api/orders?limit=100');
            const data = await response.json();

            if (response.ok && data.success) {
                this.orders = data.orders;
                this.updateStatistics(data.stats);
                this.applyFilters();
                this.showContent();
            } else {
                throw new Error(data.message || 'Ошибка загрузки заказов');
            }
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            this.showError();
        }
    }

    updateStatistics(stats) {
        document.getElementById('statTotal').textContent = stats.total || 0;
        document.getElementById('statNew').textContent = stats.new || 0;
        document.getElementById('statProcessing').textContent = stats.processing || 0;
        document.getElementById('statCompleted').textContent = stats.completed || 0;
    }

    applyFilters() {
        const statusFilter = this.filterStatus.value;
        const searchFilter = this.filterSearch.value.toLowerCase().trim();

        this.filteredOrders = this.orders.filter(order => {
            // Status filter
            if (statusFilter !== 'all' && order.status !== statusFilter) {
                return false;
            }

            // Search filter
            if (searchFilter) {
                const searchableText = [
                    order.order_number,
                    order.customer_name,
                    order.customer_phone,
                    order.customer_email
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchFilter)) {
                    return false;
                }
            }

            return true;
        });

        this.renderOrders();
    }

    renderOrders() {
        if (this.filteredOrders.length === 0) {
            this.ordersTableBody.innerHTML = '';
            this.emptyState.style.display = 'block';
            return;
        }

        this.emptyState.style.display = 'none';

        this.ordersTableBody.innerHTML = this.filteredOrders.map(order => {
            const total = (order.subtotal || 0) + (order.delivery_cost || 0);
            const date = new Date(order.created_at).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr>
                    <td><strong>#${order.order_number}</strong></td>
                    <td>${date}</td>
                    <td>${this.escapeHtml(order.customer_name)}</td>
                    <td>${this.escapeHtml(order.customer_phone)}</td>
                    <td><strong>${total.toLocaleString('ru-RU')} ₽</strong></td>
                    <td>${this.renderStatusBadge(order.status)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-view" onclick="adminOrders.viewOrder('${order.id}')">
                                Просмотр
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderStatusBadge(status) {
        const statusMap = {
            'new': { text: 'Новый', class: 'status-new' },
            'processing': { text: 'В обработке', class: 'status-processing' },
            'confirmed': { text: 'Подтвержден', class: 'status-confirmed' },
            'paid': { text: 'Оплачен', class: 'status-paid' },
            'shipping': { text: 'В доставке', class: 'status-shipping' },
            'completed': { text: 'Выполнен', class: 'status-completed' },
            'cancelled': { text: 'Отменен', class: 'status-cancelled' }
        };

        const statusInfo = statusMap[status] || { text: status, class: 'status-new' };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    async viewOrder(orderId) {
        try {
            const response = await fetch(`/api/order/${orderId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.currentOrder = data.order;
                this.showOrderModal(data.order);
            } else {
                alert('Ошибка загрузки заказа');
            }
        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            alert('Ошибка загрузки заказа');
        }
    }

    showOrderModal(order) {
        const items = JSON.parse(order.items || '[]');
        const total = (order.subtotal || 0) + (order.delivery_cost || 0);

        const deliveryTypes = {
            'delivery': 'Доставка курьером',
            'pickup': 'Самовывоз'
        };

        const customerTypes = {
            'individual': 'Физическое лицо',
            'legal': 'Юридическое лицо'
        };

        document.getElementById('modalOrderNumber').textContent = order.order_number;

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <!-- Customer Info -->
            <div class="order-detail-section">
                <h3>Информация о клиенте</h3>
                <div class="detail-row">
                    <div class="detail-label">Имя:</div>
                    <div class="detail-value">${this.escapeHtml(order.customer_name)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Телефон:</div>
                    <div class="detail-value">${this.escapeHtml(order.customer_phone)}</div>
                </div>
                ${order.customer_email ? `
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${this.escapeHtml(order.customer_email)}</div>
                </div>
                ` : ''}
                <div class="detail-row">
                    <div class="detail-label">Тип клиента:</div>
                    <div class="detail-value">${customerTypes[order.customer_type] || order.customer_type}</div>
                </div>
            </div>

            <!-- Delivery Info -->
            <div class="order-detail-section">
                <h3>Доставка</h3>
                <div class="detail-row">
                    <div class="detail-label">Способ доставки:</div>
                    <div class="detail-value">${deliveryTypes[order.delivery_type] || order.delivery_type}</div>
                </div>
                ${order.delivery_city ? `
                <div class="detail-row">
                    <div class="detail-label">Город:</div>
                    <div class="detail-value">${this.escapeHtml(order.delivery_city)}</div>
                </div>
                ` : ''}
                ${order.delivery_address ? `
                <div class="detail-row">
                    <div class="detail-label">Адрес:</div>
                    <div class="detail-value">${this.escapeHtml(order.delivery_address)}</div>
                </div>
                ` : ''}
                ${order.pickup_location ? `
                <div class="detail-row">
                    <div class="detail-label">Пункт выдачи:</div>
                    <div class="detail-value">${this.escapeHtml(order.pickup_location)}</div>
                </div>
                ` : ''}
                <div class="detail-row">
                    <div class="detail-label">Стоимость доставки:</div>
                    <div class="detail-value">
                        ${order.delivery_cost ? `${order.delivery_cost.toLocaleString('ru-RU')} ₽` : 'Не рассчитана'}
                    </div>
                </div>
            </div>

            <!-- Items -->
            <div class="order-detail-section">
                <h3>Товары</h3>
                <ul class="items-list">
                    ${items.map(item => `
                        <li>
                            <div class="item-info">
                                <div class="item-name">${this.escapeHtml(item.name)}</div>
                                <div class="item-details">${item.quantity} шт. × ${item.price.toLocaleString('ru-RU')} ₽</div>
                            </div>
                            <div class="item-price">${(item.price * item.quantity).toLocaleString('ru-RU')} ₽</div>
                        </li>
                    `).join('')}
                </ul>
                <div class="total-row">
                    <span>Итого:</span>
                    <span>${total.toLocaleString('ru-RU')} ₽</span>
                </div>
            </div>

            <!-- Status and Comments -->
            <div class="order-detail-section">
                <h3>Статус заказа</h3>
                <div class="detail-row">
                    <div class="detail-label">Текущий статус:</div>
                    <div class="detail-value">${this.renderStatusBadge(order.status)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Дата создания:</div>
                    <div class="detail-value">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
                </div>
                ${order.manager_comment ? `
                <div class="detail-row">
                    <div class="detail-label">Комментарий менеджера:</div>
                    <div class="detail-value">${this.escapeHtml(order.manager_comment)}</div>
                </div>
                ` : ''}
            </div>

            <!-- Status Change Form -->
            <div class="order-detail-section">
                <h3>Управление заказом</h3>
                <form class="status-change-form" id="statusChangeForm">
                    <div class="form-group">
                        <label for="newStatus">Изменить статус:</label>
                        <select id="newStatus" name="status" required>
                            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новый</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Подтвержден</option>
                            <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Оплачен</option>
                            <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>В доставке</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Выполнен</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="deliveryCost">Стоимость доставки (₽):</label>
                        <input type="number" id="deliveryCost" name="deliveryCost"
                               value="${order.delivery_cost || 0}" min="0" step="1">
                    </div>

                    <div class="form-group">
                        <label for="managerComment">Комментарий:</label>
                        <textarea id="managerComment" name="comment">${order.manager_comment || ''}</textarea>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Сохранить изменения</button>
                        <button type="button" class="btn-secondary" onclick="adminOrders.closeModal()">Отмена</button>
                    </div>
                </form>
            </div>
        `;

        // Add form submit handler
        document.getElementById('statusChangeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateOrder(order.id);
        });

        this.modal.classList.add('active');
    }

    async updateOrder(orderId) {
        try {
            const form = document.getElementById('statusChangeForm');
            const formData = new FormData(form);

            const newStatus = formData.get('status');
            const deliveryCost = parseFloat(formData.get('deliveryCost')) || 0;
            const comment = formData.get('comment');

            // Update status
            const statusResponse = await fetch(`/api/order/${orderId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, comment: comment })
            });

            if (!statusResponse.ok) {
                throw new Error('Ошибка обновления статуса');
            }

            // Update delivery cost if changed
            if (deliveryCost !== this.currentOrder.delivery_cost) {
                const deliveryResponse = await fetch(`/api/order/${orderId}/delivery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deliveryCost: deliveryCost, comment: comment })
                });

                if (!deliveryResponse.ok) {
                    throw new Error('Ошибка обновления стоимости доставки');
                }
            }

            alert('Заказ успешно обновлен');
            this.closeModal();
            this.loadOrders(); // Reload orders

        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            alert('Ошибка при обновлении заказа: ' + error.message);
        }
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.currentOrder = null;
    }

    showLoading() {
        this.loadingState.style.display = 'block';
        this.errorState.style.display = 'none';
        this.ordersContent.style.display = 'none';
    }

    showError() {
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'block';
        this.ordersContent.style.display = 'none';
    }

    showContent() {
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'none';
        this.ordersContent.style.display = 'block';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin panel
let adminOrders;
document.addEventListener('DOMContentLoaded', () => {
    adminOrders = new AdminOrdersPage();
});
