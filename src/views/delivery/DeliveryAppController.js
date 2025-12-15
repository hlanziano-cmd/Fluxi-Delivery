import { AuthService } from '../../services/auth.service.js';
import { OrderService } from '../../services/order.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { FormatterUtil } from '../../core/utils/formatter.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { Modal } from '../../components/modal/Modal.js';

/**
 * Delivery App Controller
 * Mobile-optimized controller for delivery personnel
 */
export class DeliveryAppController {
    constructor() {
        this.authService = new AuthService();
        this.orderService = new OrderService();
        this.deliveryService = new DeliveryService();
        this.currentUser = null;
        this.orders = [];
        this.refreshInterval = null;
        this.currentTab = 'active';

        this.initializeView();
    }

    /**
     * Initialize delivery app view
     */
    async initializeView() {
        try {
            // Check authentication
            const session = this.authService.getCurrentUser();
            if (!session || session.rol !== 'domiciliario') {
                window.location.href = '/';
                return;
            }

            this.currentUser = session;

            // Display user info
            this.displayUserInfo();

            // Initialize events
            this.initializeEvents();

            // Load orders
            await this.loadOrders();

            // Setup auto-refresh (every 15 seconds)
            this.setupAutoRefresh();

            if (APP_CONFIG.enableDebug) {
                console.info('[DeliveryAppController] Initialized successfully');
            }
        } catch (error) {
            console.error('[DeliveryAppController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar la aplicación');
        }
    }

    /**
     * Display user information
     */
    displayUserInfo() {
        document.getElementById('delivery-user-name').textContent = this.currentUser.nombre;
        document.getElementById('menu-user-name').textContent = this.currentUser.nombre;
        document.getElementById('menu-user-phone').textContent = FormatterUtil.formatPhone(
            this.currentUser.telefono
        );

        // Update status indicator
        this.updateStatusIndicator('disponible');
    }

    /**
     * Update status indicator
     */
    updateStatusIndicator(status) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');

        indicator.className = `status-indicator ${status}`;

        const statusLabels = {
            disponible: 'Disponible',
            ocupado: 'Ocupado',
            inactivo: 'Inactivo',
        };

        statusText.textContent = statusLabels[status] || status;
    }

    /**
     * Initialize event listeners
     */
    initializeEvents() {
        // Menu toggle
        const menuBtn = document.getElementById('btn-delivery-menu');
        const menu = document.getElementById('delivery-menu');
        const closeMenuBtn = document.getElementById('btn-close-menu');
        const menuOverlay = document.querySelector('.menu-overlay');

        menuBtn?.addEventListener('click', () => {
            menu.classList.add('active');
        });

        closeMenuBtn?.addEventListener('click', () => {
            menu.classList.remove('active');
        });

        menuOverlay?.addEventListener('click', () => {
            menu.classList.remove('active');
        });

        // Toggle status
        const toggleStatusBtn = document.getElementById('btn-toggle-status');
        toggleStatusBtn?.addEventListener('click', () => this.toggleStatus());

        // Refresh orders
        const refreshBtn = document.getElementById('btn-refresh-orders');
        refreshBtn?.addEventListener('click', () => this.refreshOrders());

        // Logout
        const logoutBtn = document.getElementById('menu-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    /**
     * Load orders for current delivery person
     */
    async loadOrders() {
        try {
            // Get all orders assigned to this delivery person
            const allOrders = await this.orderService.getAllOrders();
            this.orders = allOrders.filter(
                (order) => order.domiciliario_id === this.currentUser.userId
            );

            // Update stats
            this.updateStats();

            // Render orders
            this.renderOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[DeliveryAppController] Loaded orders:', this.orders.length);
            }
        } catch (error) {
            console.error('[DeliveryAppController] Error loading orders:', error);
            this.showAlert('danger', 'Error al cargar pedidos');
        }
    }

    /**
     * Update statistics
     */
    updateStats() {
        const assigned = this.orders.filter((o) => o.estado === 'asignado').length;
        const inProgress = this.orders.filter((o) => o.estado === 'en_camino').length;
        const completed = this.orders.filter((o) => o.estado === 'entregado').length;

        document.getElementById('stat-assigned').textContent = assigned;
        document.getElementById('stat-in-progress').textContent = inProgress;
        document.getElementById('stat-completed').textContent = completed;

        // Update badges
        document.getElementById('badge-active').textContent = assigned + inProgress;
        document.getElementById('badge-completed').textContent = completed;
    }

    /**
     * Render orders in lists
     */
    renderOrders() {
        const activeOrders = this.orders.filter((o) =>
            ['asignado', 'en_camino'].includes(o.estado)
        );
        const completedOrders = this.orders.filter((o) => o.estado === 'entregado');

        this.renderOrdersList('active-orders-list', activeOrders, true);
        this.renderOrdersList('completed-orders-list', completedOrders, false);
    }

    /**
     * Render orders list
     */
    renderOrdersList(containerId, orders, showActions) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${showActions ? '📭' : '📋'}</div>
                    <p>${showActions ? 'No tienes pedidos activos' : 'No hay pedidos completados hoy'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders
            .map((order) => this.renderOrderCard(order, showActions))
            .join('');

        // Add event listeners to action buttons
        if (showActions) {
            orders.forEach((order) => {
                const startBtn = document.getElementById(`start-${order.id}`);
                const completeBtn = document.getElementById(`complete-${order.id}`);
                const viewBtn = document.getElementById(`view-${order.id}`);
                const callBtn = document.getElementById(`call-${order.id}`);

                startBtn?.addEventListener('click', () => this.startDelivery(order));
                completeBtn?.addEventListener('click', () => this.completeDelivery(order));
                viewBtn?.addEventListener('click', () => this.viewOrderDetails(order));
                callBtn?.addEventListener('click', () => this.callClient(order));
            });
        }
    }

    /**
     * Render order card
     */
    renderOrderCard(order, showActions) {
        const statusLabel = FormatterUtil.formatOrderStatus(order.estado);

        return `
            <div class="order-card ${order.estado}">
                <div class="order-header">
                    <div class="order-id">#${order.consecutivo || order.id}</div>
                    <div class="order-status-badge ${order.estado}">
                        ${statusLabel}
                    </div>
                </div>

                <div class="order-info">
                    <div class="order-info-row">
                        <span class="order-info-icon">👤</span>
                        <div class="order-info-text">
                            <div class="order-info-label">Cliente</div>
                            ${order.cliente}
                        </div>
                    </div>

                    <div class="order-info-row">
                        <span class="order-info-icon">📍</span>
                        <div class="order-info-text">
                            <div class="order-info-label">Dirección</div>
                            ${order.direccion}
                        </div>
                    </div>

                    <div class="order-info-row">
                        <span class="order-info-icon">📞</span>
                        <div class="order-info-text">
                            <div class="order-info-label">Teléfono</div>
                            ${FormatterUtil.formatPhone(order.telefono_cliente)}
                        </div>
                    </div>

                    <div class="order-info-row">
                        <span class="order-info-icon">💰</span>
                        <div class="order-info-text">
                            <div class="order-info-label">Valor</div>
                            ${FormatterUtil.formatCurrency(order.valor_domicilio)}
                        </div>
                    </div>

                    ${
                        order.notas
                            ? `
                        <div class="order-info-row">
                            <span class="order-info-icon">📝</span>
                            <div class="order-info-text">
                                <div class="order-info-label">Notas</div>
                                ${order.notas}
                            </div>
                        </div>
                    `
                            : ''
                    }
                </div>

                ${
                    showActions
                        ? `
                    <div class="order-actions">
                        <button class="order-btn order-btn-secondary" id="call-${order.id}">
                            📞 Llamar
                        </button>
                        ${
                            order.estado === 'asignado'
                                ? `<button class="order-btn order-btn-primary" id="start-${order.id}">
                                🚴 Iniciar
                            </button>`
                                : ''
                        }
                        ${
                            order.estado === 'en_camino'
                                ? `<button class="order-btn order-btn-success" id="complete-${order.id}">
                                ✅ Entregar
                            </button>`
                                : ''
                        }
                    </div>
                `
                        : ''
                }
            </div>
        `;
    }

    /**
     * Start delivery
     */
    async startDelivery(order) {
        Modal.confirm(
            'Iniciar Entrega',
            `¿Confirmas que vas a iniciar la entrega del pedido #${order.consecutivo || order.id}?`,
            async () => {
                try {
                    await this.orderService.updateStatus(order.id, 'en_camino');
                    this.showAlert('success', 'Entrega iniciada');
                    await this.refreshOrders();

                    if (APP_CONFIG.enableDebug) {
                        console.info('[DeliveryAppController] Delivery started:', order.id);
                    }
                } catch (error) {
                    console.error('[DeliveryAppController] Error starting delivery:', error);
                    this.showAlert('danger', 'Error al iniciar entrega');
                }
            }
        );
    }

    /**
     * Complete delivery
     */
    async completeDelivery(order) {
        const confirmHTML = `
            <div>
                <p style="margin-bottom: 16px;">¿Confirmas que has entregado el pedido?</p>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="confirm-delivered" required>
                        He entregado el pedido y recibido el pago
                    </label>
                </div>
            </div>
        `;

        Modal.open({
            title: `Completar Pedido #${order.consecutivo || order.id}`,
            content: confirmHTML,
            size: 'small',
            confirmText: 'Confirmar Entrega',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                const confirmed = document.getElementById('confirm-delivered')?.checked;
                if (!confirmed) {
                    this.showAlert('warning', 'Debes confirmar la entrega');
                    return;
                }

                try {
                    await this.orderService.updateStatus(order.id, 'entregado');
                    this.showAlert('success', '¡Pedido entregado exitosamente!');
                    await this.refreshOrders();

                    if (APP_CONFIG.enableDebug) {
                        console.info('[DeliveryAppController] Delivery completed:', order.id);
                    }
                } catch (error) {
                    console.error('[DeliveryAppController] Error completing delivery:', error);
                    this.showAlert('danger', 'Error al completar entrega');
                }
            },
        });
    }

    /**
     * View order details
     */
    viewOrderDetails(order) {
        const detailsHTML = `
            <div class="order-details">
                <div class="order-detail-row">
                    <span class="order-detail-label">ID:</span>
                    <span class="order-detail-value">#${order.consecutivo || order.id}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Cliente:</span>
                    <span class="order-detail-value">${order.cliente}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Teléfono:</span>
                    <span class="order-detail-value">${FormatterUtil.formatPhone(order.telefono_cliente)}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Dirección:</span>
                    <span class="order-detail-value">${order.direccion}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Valor:</span>
                    <span class="order-detail-value">${FormatterUtil.formatCurrency(order.valor_domicilio)}</span>
                </div>
                ${
                    order.distancia_km
                        ? `
                    <div class="order-detail-row">
                        <span class="order-detail-label">Distancia:</span>
                        <span class="order-detail-value">${order.distancia_km} km</span>
                    </div>
                `
                        : ''
                }
                ${
                    order.notas
                        ? `
                    <div class="order-detail-row">
                        <span class="order-detail-label">Notas:</span>
                        <span class="order-detail-value">${order.notas}</span>
                    </div>
                `
                        : ''
                }
            </div>
        `;

        Modal.open({
            title: `Detalles del Pedido #${order.consecutivo || order.id}`,
            content: detailsHTML,
            size: 'medium',
            showFooter: false,
        });
    }

    /**
     * Call client
     */
    callClient(order) {
        if (confirm(`¿Deseas llamar a ${order.cliente}?`)) {
            window.location.href = `tel:${order.telefono_cliente}`;
        }
    }

    /**
     * Switch tabs
     */
    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach((content) => {
            content.classList.toggle('active', content.id === `tab-${tab}`);
        });
    }

    /**
     * Toggle delivery status
     */
    async toggleStatus() {
        const statusOptions = [
            { value: 'disponible', label: 'Disponible' },
            { value: 'ocupado', label: 'Ocupado' },
            { value: 'inactivo', label: 'Inactivo' },
        ];

        const statusHTML = `
            <div class="form-group">
                <label for="new-status">Selecciona tu estado:</label>
                <select id="new-status" class="filter-select" style="width: 100%;">
                    ${statusOptions.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                </select>
            </div>
        `;

        Modal.open({
            title: 'Cambiar Estado',
            content: statusHTML,
            size: 'small',
            confirmText: 'Cambiar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                const newStatus = document.getElementById('new-status')?.value;
                if (newStatus) {
                    try {
                        // TODO: Update delivery status in backend
                        this.updateStatusIndicator(newStatus);
                        this.showAlert('success', 'Estado actualizado');

                        if (APP_CONFIG.enableDebug) {
                            console.info('[DeliveryAppController] Status changed:', newStatus);
                        }
                    } catch (error) {
                        console.error('[DeliveryAppController] Error updating status:', error);
                        this.showAlert('danger', 'Error al actualizar estado');
                    }
                }
            },
        });
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        // Refresh every 15 seconds
        this.refreshInterval = setInterval(() => {
            this.loadOrders();
        }, 15000);
    }

    /**
     * Refresh orders
     */
    async refreshOrders() {
        await this.loadOrders();
        this.showAlert('success', 'Pedidos actualizados');
    }

    /**
     * Handle logout
     */
    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.authService.logout();
            window.location.href = '/';
        }
    }

    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertContainer = document.getElementById('delivery-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

        // Auto-hide messages
        setTimeout(() => {
            alertContainer.classList.add('hidden');
        }, 3000);
    }

    /**
     * Cleanup when navigating away
     */
    destroy() {
        // Clear auto-refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[DeliveryAppController] Destroyed');
        }
    }
}
