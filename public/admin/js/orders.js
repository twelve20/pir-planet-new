// Admin Orders Page
class AdminOrdersPage {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];

        this.loadingState = document.getElementById('loadingState');
        this.errorState = document.getElementById('errorState');
        this.ordersContent = document.getElementById('ordersContent');
        this.emptyState = document.getElementById('emptyState');
        this.ordersTableBody = document.getElementById('ordersTableBody');

        this.filterStatus = document.getElementById('filterStatus');
        this.filterSearch = document.getElementById('filterSearch');
        this.btnRefresh = document.getElementById('btnRefresh');

        this.init();
    }

    init() {
        // Event listeners
        this.filterStatus.addEventListener('change', () => this.applyFilters());
        this.filterSearch.addEventListener('input', () => this.applyFilters());
        this.btnRefresh.addEventListener('click', () => this.loadOrders());

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
                            <a href="/admin/order?id=${order.id}" class="btn-view">
                                Просмотр
                            </a>
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
