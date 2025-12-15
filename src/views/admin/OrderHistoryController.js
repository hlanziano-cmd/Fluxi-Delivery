import { AuthService } from '../../services/auth.service.js';
import { OrderService } from '../../services/order.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { FormatterUtil } from '../../core/utils/formatter.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { Table } from '../../components/table/Table.js';

/**
 * Order History Controller
 * Manages historical order queries with filters
 */
export class OrderHistoryController {
    constructor() {
        this.authService = new AuthService();
        this.orderService = new OrderService();
        this.deliveryService = new DeliveryService();
        this.table = null;
        this.orders = [];
        this.deliveries = [];
        this.filters = {
            startDate: '',
            endDate: '',
            status: '',
            deliveryId: '',
            client: '',
        };

        this.initializeView();
    }

    /**
     * Initialize view
     */
    async initializeView() {
        try {
            const session = this.authService.getCurrentUser();
            if (!session) {
                window.location.href = '/';
                return;
            }

            this.displayUserInfo(session);
            this.initializeEvents();
            await this.loadDeliveries();
            this.populateDeliveryFilter();
            this.setDefaultDates();
            this.initializeTable();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrderHistoryController] Initialized successfully');
            }
        } catch (error) {
            console.error('[OrderHistoryController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar la vista');
        }
    }

    displayUserInfo(session) {
        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');

        if (nameEl) nameEl.textContent = session.nombre;
        if (roleEl) roleEl.textContent = this.getRoleLabel(session.rol);
    }

    getRoleLabel(rol) {
        const roles = {
            admin: 'Administrador',
            dispatcher: 'Despachador',
            domiciliario: 'Domiciliario',
            superadmin: 'Super Administrador',
        };
        return roles[rol] || rol;
    }

    initializeEvents() {
        const logoutBtn = document.getElementById('btn-history-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        const applyBtn = document.getElementById('btn-apply-filters');
        applyBtn?.addEventListener('click', () => this.applyFilters());

        const resetBtn = document.getElementById('btn-reset-filters');
        resetBtn?.addEventListener('click', () => this.resetFilters());

        const exportBtn = document.getElementById('btn-export');
        exportBtn?.addEventListener('click', () => this.exportToCSV());

        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (
                window.innerWidth <= 768 &&
                !e.target.closest('.sidebar') &&
                !e.target.closest('.mobile-menu-toggle')
            ) {
                sidebar?.classList.remove('open');
            }
        });
    }

    /**
     * Set default date range (last 30 days)
     */
    setDefaultDates() {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setDate(lastMonth.getDate() - 30);

        document.getElementById('filter-start-date').value = lastMonth.toISOString().split('T')[0];
        document.getElementById('filter-end-date').value = today.toISOString().split('T')[0];
    }

    async loadDeliveries() {
        try {
            this.deliveries = await this.deliveryService.getAllDeliveries();
        } catch (error) {
            console.error('[OrderHistoryController] Error loading deliveries:', error);
        }
    }

    populateDeliveryFilter() {
        const select = document.getElementById('filter-delivery');
        if (!select) return;

        this.deliveries.forEach((delivery) => {
            const option = document.createElement('option');
            // Use the delivery name as value since your structure stores names directly
            option.value = delivery.nombre || delivery.id;
            option.textContent = delivery.nombre || `Domiciliario ${delivery.id}`;
            select.appendChild(option);
        });
    }

    initializeTable() {
        this.table = new Table({
            containerId: 'history-table-container',
            columns: [
                {
                    key: 'consecutivo',
                    label: 'Consecutivo',
                    sortable: true,
                },
                {
                    key: 'fecha_pedido',
                    label: 'Fecha',
                    sortable: true,
                    render: (value) => new Date(value).toLocaleString('es-CO'),
                },
                {
                    key: 'cliente_nombre',
                    label: 'Cliente',
                    sortable: true,
                },
                {
                    key: 'cliente_telefono',
                    label: 'Teléfono',
                },
                {
                    key: 'cliente_direccion',
                    label: 'Dirección',
                },
                {
                    key: 'domiciliario_nombre',
                    label: 'Domiciliario',
                    render: (value, row) => row.domiciliarios?.usuarios?.nombre || 'Sin asignar',
                },
                {
                    key: 'total',
                    label: 'Total',
                    sortable: true,
                    render: (value) => FormatterUtil.formatCurrency(value),
                },
                {
                    key: 'estado',
                    label: 'Estado',
                    sortable: true,
                    render: (value) => this.getStatusBadge(value),
                },
            ],
            actions: [
                {
                    name: 'view',
                    label: 'Ver Detalles',
                    icon: '👁️',
                    variant: 'info',
                    handler: (id, order) => this.viewOrderDetails(order),
                },
            ],
            data: this.orders,
        });

        this.table.render();
    }

    getStatusBadge(status) {
        const badges = {
            pendiente: '<span class="status-badge warning">Pendiente</span>',
            asignado: '<span class="status-badge info">Asignado</span>',
            en_camino: '<span class="status-badge primary">En Camino</span>',
            entregado: '<span class="status-badge active">Entregado</span>',
            cancelado: '<span class="status-badge inactive">Cancelado</span>',
        };
        return badges[status] || status;
    }

    async applyFilters() {
        try {
            this.filters = {
                startDate: document.getElementById('filter-start-date').value,
                endDate: document.getElementById('filter-end-date').value,
                status: document.getElementById('filter-status').value,
                deliveryId: document.getElementById('filter-delivery').value,
                client: document.getElementById('filter-client').value,
            };

            await this.searchOrders();
        } catch (error) {
            console.error('[OrderHistoryController] Error applying filters:', error);
            this.showAlert('danger', 'Error al aplicar filtros');
        }
    }

    async searchOrders() {
        try {
            // Get all orders
            let allOrders = await this.orderService.getAllOrders();

            // Apply filters
            this.orders = allOrders.filter((order) => {
                // Date range filter
                if (this.filters.startDate && this.filters.endDate) {
                    const orderDate = new Date(order.fecha_pedido);
                    const startDate = new Date(this.filters.startDate);
                    const endDate = new Date(this.filters.endDate);
                    endDate.setHours(23, 59, 59, 999);

                    if (orderDate < startDate || orderDate > endDate) {
                        return false;
                    }
                }

                // Status filter
                if (this.filters.status && order.estado !== this.filters.status) {
                    return false;
                }

                // Delivery filter - search by name since your structure stores names directly
                if (this.filters.deliveryId) {
                    const deliveryMatch = order.domiciliario_nombre === this.filters.deliveryId;
                    if (!deliveryMatch) {
                        return false;
                    }
                }

                // Client filter
                if (this.filters.client) {
                    const searchTerm = this.filters.client.toLowerCase();
                    const nameMatch = order.cliente_nombre?.toLowerCase().includes(searchTerm);
                    const phoneMatch = order.cliente_telefono?.includes(searchTerm);
                    if (!nameMatch && !phoneMatch) {
                        return false;
                    }
                }

                return true;
            });

            // Update table
            if (this.table) {
                this.table.updateData(this.orders);
            }

            // Update results count
            const countEl = document.getElementById('results-count');
            if (countEl) {
                countEl.textContent = `${this.orders.length} pedido${
                    this.orders.length !== 1 ? 's' : ''
                } encontrado${this.orders.length !== 1 ? 's' : ''}`;
            }

            if (APP_CONFIG.enableDebug) {
                console.info('[OrderHistoryController] Found orders:', this.orders.length);
            }
        } catch (error) {
            console.error('[OrderHistoryController] Error searching orders:', error);
            this.showAlert('danger', 'Error al buscar pedidos');
        }
    }

    resetFilters() {
        this.setDefaultDates();
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-delivery').value = '';
        document.getElementById('filter-client').value = '';

        this.orders = [];
        if (this.table) {
            this.table.updateData(this.orders);
        }

        const countEl = document.getElementById('results-count');
        if (countEl) {
            countEl.textContent = '0 pedidos encontrados';
        }
    }

    viewOrderDetails(order) {
        const details = `
            <div class="order-details">
                <p><strong>Consecutivo:</strong> ${order.consecutivo}</p>
                <p><strong>Fecha:</strong> ${new Date(order.fecha_pedido).toLocaleString('es-CO')}</p>
                <p><strong>Cliente:</strong> ${order.cliente_nombre}</p>
                <p><strong>Teléfono:</strong> ${order.cliente_telefono}</p>
                <p><strong>Dirección:</strong> ${order.cliente_direccion}</p>
                <p><strong>Domiciliario:</strong> ${order.domiciliarios?.usuarios?.nombre || 'Sin asignar'}</p>
                <p><strong>Valor Pedido:</strong> ${FormatterUtil.formatCurrency(order.valor)}</p>
                <p><strong>Costo Domicilio:</strong> ${FormatterUtil.formatCurrency(order.costo_domicilio)}</p>
                <p><strong>Total:</strong> ${FormatterUtil.formatCurrency(order.total)}</p>
                <p><strong>Estado:</strong> ${order.estado}</p>
                ${order.observaciones ? `<p><strong>Observaciones:</strong> ${order.observaciones}</p>` : ''}
            </div>
        `;

        alert(details.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n'));
    }

    exportToCSV() {
        try {
            if (this.orders.length === 0) {
                alert('No hay datos para exportar');
                return;
            }

            const csvData = this.orders.map((order) => ({
                Consecutivo: order.consecutivo,
                Fecha: new Date(order.fecha_pedido).toLocaleString('es-CO'),
                Cliente: order.cliente_nombre,
                Teléfono: order.cliente_telefono,
                Dirección: order.cliente_direccion,
                Domiciliario: order.domiciliarios?.usuarios?.nombre || 'Sin asignar',
                'Valor Pedido': order.valor,
                'Costo Domicilio': order.costo_domicilio,
                Total: order.total,
                Estado: order.estado,
            }));

            const headers = Object.keys(csvData[0]);
            const csvRows = [];

            csvRows.push(headers.join(','));

            for (const row of csvData) {
                const values = headers.map((header) => {
                    const value = row[header] || '';
                    const escaped = String(value).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            }

            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute(
                'download',
                `pedidos-historicos-${new Date().toISOString().split('T')[0]}.csv`
            );
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('[OrderHistoryController] Error exporting:', error);
            this.showAlert('danger', 'Error al exportar datos');
        }
    }

    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.authService.logout();
            window.location.href = '/';
        }
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('history-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(() => {
                alertContainer.classList.add('hidden');
            }, 3000);
        }
    }
}
