import { AuthService } from '../../services/auth.service.js';
import { OrderService } from '../../services/order.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { ValidationUtil } from '../../core/utils/validation.js';
import { FormatterUtil } from '../../core/utils/formatter.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { Modal } from '../../components/modal/Modal.js';
import { Table } from '../../components/table/Table.js';

/**
 * Orders Controller
 * Manages order CRUD operations and assignments
 */
export class OrdersController {
    constructor() {
        this.authService = new AuthService();
        this.orderService = new OrderService();
        this.deliveryService = new DeliveryService();
        this.table = null;
        this.orders = [];
        this.deliveries = [];
        this.filters = {
            status: '',
            deliveryId: '',
            date: '',
        };
        this.resetCheckInterval = null;

        // Expose controller globally for inline dropdown handlers
        window.ordersController = this;

        this.initializeView();
        this.initializeAutoReset();
    }

    /**
     * Initialize orders view
     */
    async initializeView() {
        try {
            // Check authentication
            const session = this.authService.getCurrentUser();
            if (!session) {
                window.location.href = '/';
                return;
            }

            // Display user info
            this.displayUserInfo(session);

            // Initialize events
            this.initializeEvents();

            // Load data
            await this.loadOrders();
            await this.loadDeliveries();

            // Initialize table
            this.initializeTable();

            // Populate filters
            this.populateDeliveryFilter();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Initialized successfully');
            }
        } catch (error) {
            console.error('[OrdersController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar la vista de pedidos');
        }
    }

    /**
     * Display user information in sidebar
     */
    displayUserInfo(session) {
        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');

        if (nameEl) nameEl.textContent = session.nombre;
        if (roleEl) roleEl.textContent = this.getRoleLabel(session.rol);
    }

    /**
     * Get role label in Spanish
     */
    getRoleLabel(rol) {
        const roles = {
            admin: 'Administrador',
            dispatcher: 'Despachador',
            domiciliario: 'Domiciliario',
        };
        return roles[rol] || rol;
    }

    /**
     * Initialize event listeners
     */
    initializeEvents() {
        // Logout button
        const logoutBtn = document.getElementById('btn-orders-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Create order button
        const createBtn = document.getElementById('btn-create-order');
        createBtn?.addEventListener('click', () => this.openCreateOrderModal());

        // Refresh button
        const refreshBtn = document.getElementById('btn-refresh-orders');
        refreshBtn?.addEventListener('click', () => this.refreshOrders());

        // Export button
        const exportBtn = document.getElementById('btn-export-orders');
        exportBtn?.addEventListener('click', () => this.exportOrders());

        // Filter buttons
        const applyFiltersBtn = document.getElementById('btn-apply-filters');
        applyFiltersBtn?.addEventListener('click', () => this.applyFilters());

        const clearFiltersBtn = document.getElementById('btn-clear-filters');
        clearFiltersBtn?.addEventListener('click', () => this.clearFilters());

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
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
     * Load orders from service (only today's orders)
     */
    async loadOrders() {
        try {
            // Get today's date in Colombia timezone (UTC-5)
            const today = new Date();
            const colombiaOffset = -5 * 60; // UTC-5 in minutes
            const localOffset = today.getTimezoneOffset();
            const colombiaTime = new Date(today.getTime() + (localOffset + colombiaOffset) * 60000);

            const startOfDay = new Date(colombiaTime);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(colombiaTime);
            endOfDay.setHours(23, 59, 59, 999);

            // Get all orders and filter for today
            const allOrders = await this.orderService.getAllOrders();
            this.orders = allOrders.filter(order => {
                const orderDate = new Date(order.fecha_pedido);
                return orderDate >= startOfDay && orderDate <= endOfDay;
            });

            this.updateStatistics();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Loaded today\'s orders:', this.orders.length);
            }
        } catch (error) {
            console.error('[OrdersController] Error loading orders:', error);
            this.showAlert('danger', 'Error al cargar pedidos');
        }
    }

    /**
     * Load deliveries from service
     */
    async loadDeliveries() {
        try {
            this.deliveries = await this.deliveryService.getAvailableDeliveries();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Loaded deliveries:', this.deliveries.length);
            }
        } catch (error) {
            console.error('[OrdersController] Error loading deliveries:', error);
        }
    }

    /**
     * Update statistics cards
     */
    updateStatistics() {
        const stats = {
            pendiente: 0,
            asignado: 0,
            en_camino: 0,
            entregado: 0,
            cancelado: 0,
        };

        this.orders.forEach((order) => {
            if (stats[order.estado] !== undefined) {
                stats[order.estado]++;
            }
        });

        document.getElementById('stat-pendiente').textContent = stats.pendiente;
        document.getElementById('stat-asignado').textContent = stats.asignado;
        document.getElementById('stat-en-camino').textContent = stats.en_camino;
        document.getElementById('stat-entregado').textContent = stats.entregado;
        document.getElementById('stat-cancelado').textContent = stats.cancelado;
    }

    /**
     * Populate delivery filter dropdown
     */
    populateDeliveryFilter() {
        const select = document.getElementById('filter-delivery');
        if (!select) return;

        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add delivery options
        this.deliveries.forEach((delivery) => {
            const option = document.createElement('option');
            option.value = delivery.id;
            option.textContent = delivery.nombre;
            select.appendChild(option);
        });
    }

    /**
     * Initialize table component
     */
    initializeTable() {
        this.table = new Table({
            containerId: 'orders-table-container',
            columns: [
                {
                    key: 'consecutivo_domiciliario',
                    label: 'ID',
                    sortable: true,
                    render: (value, row) => {
                        if (row.domiciliario_id && row.consecutivo_domiciliario) {
                            return row.consecutivo_domiciliario;
                        }
                        return `#${row.consecutivo || row.id}`;
                    },
                },
                {
                    key: 'cliente',
                    label: 'Cliente',
                    sortable: true,
                },
                {
                    key: 'direccion',
                    label: 'Dirección',
                    render: (value) => FormatterUtil.truncate(value, 35),
                },
                {
                    key: 'telefono_cliente',
                    label: 'Teléfono',
                    render: (value) => {
                        if (!value) return '-';
                        // Remove +57 prefix for display
                        return value.replace(/^\+57/, '');
                    },
                },
                {
                    key: 'valor_domicilio',
                    label: 'Valor Total',
                    sortable: true,
                    render: (value, row) => {
                        const total = (parseFloat(row.valor_pedido) || 0) + (parseFloat(row.valor_domicilio) || 0);
                        return FormatterUtil.formatCurrency(total);
                    },
                },
                {
                    key: 'metodo_pago',
                    label: 'Método Pago',
                    render: (value, row) => this.renderPaymentMethodSelect(row),
                },
                {
                    key: 'numero_datafono',
                    label: 'Datáfono',
                    render: (value, row) => this.renderDatafonoInput(row),
                },
                {
                    key: 'voucher_estado',
                    label: 'Voucher',
                    render: (value, row) => this.renderVoucherSelect(row),
                },
                {
                    key: 'estado',
                    label: 'Estado',
                    sortable: true,
                    render: (value) => `
                        <span class="order-status ${value}">
                            ${FormatterUtil.formatOrderStatus(value)}
                        </span>
                    `,
                },
                {
                    key: 'domiciliario_id',
                    label: 'Domiciliario',
                    render: (value, row) => this.renderDeliverySelect(row),
                },
            ],
            actions: [
                {
                    name: 'track',
                    label: 'Rastrear',
                    icon: '📍',
                    variant: 'success',
                    handler: (id, order) => this.trackDelivery(order),
                    visible: (order) => order.estado === 'en_camino' && order.domiciliario_id,
                },
                {
                    name: 'assign',
                    label: 'Asignar',
                    icon: '📲',
                    variant: 'primary',
                    handler: (id, order) => this.assignOrderWithWhatsApp(order),
                    visible: (order) => order.domiciliario_id != null && ['pendiente', 'asignado'].includes(order.estado),
                },
                {
                    name: 'status',
                    label: 'Estado',
                    icon: '🔄',
                    variant: 'warning',
                    handler: (id, order) => this.openStatusModal(order),
                    visible: (order) => ['asignado', 'en_camino'].includes(order.estado),
                },
                {
                    name: 'delete',
                    label: 'Eliminar',
                    icon: '🗑️',
                    variant: 'danger',
                    handler: (id, order) => this.cancelOrder(order),
                    visible: (order) => ['pendiente', 'asignado'].includes(order.estado),
                },
            ],
            data: this.getFilteredOrders(),
            searchable: true,
            sortable: true,
            pagination: true,
            pageSize: 15,
            emptyMessage: 'No hay pedidos registrados',
        });

        this.table.init();
    }

    /**
     * Get filtered orders based on current filters
     */
    getFilteredOrders() {
        let filtered = [...this.orders];

        if (this.filters.status) {
            filtered = filtered.filter((o) => o.estado === this.filters.status);
        }

        if (this.filters.deliveryId) {
            filtered = filtered.filter(
                (o) => o.domiciliario_id === parseInt(this.filters.deliveryId)
            );
        }

        if (this.filters.date) {
            filtered = filtered.filter((o) => {
                const orderDate = new Date(o.created_at).toISOString().split('T')[0];
                return orderDate === this.filters.date;
            });
        }

        return filtered;
    }

    /**
     * Apply filters
     */
    applyFilters() {
        this.filters.status = document.getElementById('filter-status')?.value || '';
        this.filters.deliveryId = document.getElementById('filter-delivery')?.value || '';
        this.filters.date = document.getElementById('filter-date')?.value || '';

        this.table.setData(this.getFilteredOrders());
    }

    /**
     * Clear filters
     */
    clearFilters() {
        this.filters = { status: '', deliveryId: '', date: '' };

        document.getElementById('filter-status').value = '';
        document.getElementById('filter-delivery').value = '';
        document.getElementById('filter-date').value = '';

        this.table.setData(this.getFilteredOrders());
    }

    /**
     * Render payment method select dropdown
     */
    renderPaymentMethodSelect(order) {
        const methods = [
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'datafono', label: 'Datáfono' },
            { value: 'rappi', label: 'Rappi' },
        ];

        const options = methods
            .map(
                (method) => `
            <option value="${method.value}" ${order.metodo_pago === method.value ? 'selected' : ''}>
                ${method.label}
            </option>
        `
            )
            .join('');

        return `
            <select
                class="inline-select"
                data-order-id="${order.id}"
                onchange="window.ordersController.updatePaymentMethod('${order.id}', this.value)"
            >
                ${options}
            </select>
        `;
    }

    /**
     * Render voucher status select dropdown
     */
    renderVoucherSelect(order) {
        const voucherStatus = order.voucher_estado || 'pendiente';
        const statuses = [
            { value: 'pendiente', label: 'Pendiente' },
            { value: 'entregado', label: 'Entregado' },
        ];

        const options = statuses
            .map(
                (status) => `
            <option value="${status.value}" ${voucherStatus === status.value ? 'selected' : ''}>
                ${status.label}
            </option>
        `
            )
            .join('');

        return `
            <select
                class="inline-select"
                data-order-id="${order.id}"
                onchange="window.ordersController.updateVoucherStatus('${order.id}', this.value)"
            >
                ${options}
            </select>
        `;
    }

    /**
     * Render datafono number input (only for datafono payment method)
     */
    renderDatafonoInput(order) {
        if (order.metodo_pago !== 'datafono') {
            return '<span class="text-muted">N/A</span>';
        }

        return `
            <input
                type="text"
                class="inline-input"
                value="${order.numero_datafono || ''}"
                placeholder="4 dígitos"
                maxlength="4"
                data-order-id="${order.id}"
                onchange="window.ordersController.updateDatafonoNumber('${order.id}', this.value)"
                style="width: 80px; text-align: center;"
            />
        `;
    }

    /**
     * Render delivery person select dropdown
     */
    renderDeliverySelect(order) {
        // Filter: estado = 'disponible' (as shown in deliveries module)
        const availableDeliveries = this.deliveries.filter(
            (d) => d.estado === 'disponible'
        );

        // Debug: Log delivery states
        if (availableDeliveries.length === 0) {
            console.warn('[OrdersController] No available deliveries found. States:',
                this.deliveries.map(d => ({ nombre: d.nombre, estado: d.estado, activo: d.activo }))
            );
        }

        // If order has assigned delivery, include it even if not currently available
        let selectedDelivery = null;
        if (order.domiciliario_id) {
            selectedDelivery = this.deliveries.find((d) => d.id === order.domiciliario_id);
        }

        const options = [
            '<option value="">Sin asignar</option>',
            ...(selectedDelivery &&
                !availableDeliveries.find(d => d.id === selectedDelivery.id)
                ? [
                      `<option value="${selectedDelivery.id}" selected>${selectedDelivery.nombre} (Asignado)</option>`,
                  ]
                : []),
            ...availableDeliveries.map(
                (delivery) => `
            <option value="${delivery.id}" ${order.domiciliario_id === delivery.id ? 'selected' : ''}>
                ${delivery.nombre}
            </option>
        `
            ),
        ].join('');

        return `
            <select
                class="inline-select"
                data-order-id="${order.id}"
                onchange="window.ordersController.updateOrderDelivery('${order.id}', this.value)"
            >
                ${options}
            </select>
        `;
    }

    /**
     * Open create order modal
     */
    openCreateOrderModal() {
        const formContent = this.getOrderFormHTML();

        const modal = Modal.open({
            title: 'Crear Nuevo Pedido',
            content: formContent,
            size: 'large',
            confirmText: 'Crear Pedido',
            cancelText: 'Cancelar',
            onConfirm: () => this.handleCreateOrder(modal),
        });

        // Initialize total calculator after modal is rendered
        setTimeout(() => this.initializeOrderFormCalculator(), 100);
    }

    /**
     * Get order form HTML
     */
    getOrderFormHTML(order = null) {
        const phoneNumber = order?.telefono_cliente ? order.telefono_cliente.replace(/^\+57/, '') : '';

        return `
            <form class="order-form" id="order-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="order-cliente" class="required">Cliente</label>
                        <input
                            type="text"
                            id="order-cliente"
                            name="cliente"
                            value="${order?.cliente || ''}"
                            placeholder="Nombre del cliente"
                            required
                            autocomplete="off"
                        >
                    </div>
                    <div class="form-group">
                        <label for="order-telefono" class="required">Teléfono Cliente</label>
                        <div class="phone-input-wrapper">
                            <span class="phone-prefix">+57</span>
                            <input
                                type="tel"
                                id="order-telefono"
                                name="telefono_cliente"
                                value="${phoneNumber}"
                                placeholder="3001234567"
                                required
                                pattern="[3][0-9]{9}"
                                maxlength="10"
                                autocomplete="off"
                            >
                        </div>
                        <small>Ingrese el número celular sin el indicativo +57</small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="order-direccion" class="required">Dirección</label>
                        <input
                            type="text"
                            id="order-direccion"
                            name="direccion"
                            value="${order?.direccion || ''}"
                            placeholder="Calle 123 #45-67"
                            required
                            autocomplete="off"
                        >
                    </div>
                    <div class="form-group">
                        <label for="order-barrio">Barrio</label>
                        <input
                            type="text"
                            id="order-barrio"
                            name="barrio"
                            value="${order?.barrio || ''}"
                            placeholder="Ej: Chapinero, Usaquén"
                            autocomplete="off"
                        >
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="order-valor-pedido" class="required">Valor Pedido</label>
                        <div class="currency-input-wrapper">
                            <span class="currency-prefix">$</span>
                            <input
                                type="text"
                                id="order-valor-pedido"
                                name="valor_pedido"
                                value="${order?.valor_pedido ? this.formatCurrency(order.valor_pedido) : ''}"
                                placeholder="25.000"
                                required
                                autocomplete="off"
                            >
                        </div>
                        <small>Valor total del pedido</small>
                    </div>
                    <div class="form-group">
                        <label for="order-valor-domicilio" class="required">Valor Domicilio</label>
                        <div class="currency-input-wrapper">
                            <span class="currency-prefix">$</span>
                            <input
                                type="text"
                                id="order-valor-domicilio"
                                name="valor_domicilio"
                                value="${order?.valor_domicilio ? this.formatCurrency(order.valor_domicilio) : ''}"
                                placeholder="5000"
                                required
                                autocomplete="off"
                            >
                        </div>
                        <small>Costo del envío</small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="order-metodo-pago" class="required">Método de Pago</label>
                        <select
                            id="order-metodo-pago"
                            name="metodo_pago"
                            required
                        >
                            <option value="">Seleccionar método</option>
                            <option value="efectivo" ${order?.metodo_pago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                            <option value="datafono" ${order?.metodo_pago === 'datafono' ? 'selected' : ''}>Datáfono</option>
                            <option value="rappi" ${order?.metodo_pago === 'rappi' ? 'selected' : ''}>Rappi</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Valor Total</label>
                        <div class="value-summary">
                            <div class="value-summary-row total">
                                <span class="value-summary-label">Total:</span>
                                <span class="value-summary-amount" id="order-total">$0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-row full-width">
                    <div class="form-group">
                        <label for="order-notas">Notas Adicionales</label>
                        <textarea
                            id="order-notas"
                            name="notas"
                            rows="3"
                            placeholder="Instrucciones especiales, referencias, detalles del pedido, etc."
                        >${order?.notas || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Initialize order form total calculator
     */
    initializeOrderFormCalculator() {
        const valorPedidoInput = document.getElementById('order-valor-pedido');
        const valorDomicilioInput = document.getElementById('order-valor-domicilio');
        const totalDisplay = document.getElementById('order-total');

        if (!valorPedidoInput || !valorDomicilioInput || !totalDisplay) {
            console.error('[OrderForm] Inputs not found', {
                valorPedidoInput: !!valorPedidoInput,
                valorDomicilioInput: !!valorDomicilioInput,
                totalDisplay: !!totalDisplay
            });
            return;
        }

        console.log('[OrderForm] Calculator initialized successfully');

        const updateTotal = () => {
            // Get raw values and remove non-digits
            const pedidoStr = valorPedidoInput.value.replace(/[^0-9]/g, '');
            const domicilioStr = valorDomicilioInput.value.replace(/[^0-9]/g, '');

            const pedido = parseInt(pedidoStr) || 0;
            const domicilio = parseInt(domicilioStr) || 0;
            const total = pedido + domicilio;

            console.log('[OrderForm] Calculating:', {pedido, domicilio, total});
            totalDisplay.textContent = '$' + total.toLocaleString('es-CO');
        };

        const formatInput = (input) => {
            const value = input.value.replace(/[^0-9]/g, '');
            if (value) {
                const formatted = parseInt(value).toLocaleString('es-CO');
                input.value = formatted;
            }
            updateTotal();
        };

        valorPedidoInput.addEventListener('input', function() { formatInput(this); });
        valorDomicilioInput.addEventListener('input', function() { formatInput(this); });
        valorPedidoInput.addEventListener('blur', function() { formatInput(this); });
        valorDomicilioInput.addEventListener('blur', function() { formatInput(this); });

        // Initial update
        updateTotal();
    }

    /**
     * Handle create order
     */
    async handleCreateOrder(modal) {
        try {
            // Get form data
            const formData = this.getFormData();

            // Validate form
            const validation = this.validateOrderForm(formData);
            if (!validation.valid) {
                this.showAlert('danger', validation.message);
                return;
            }

            // Show loading
            modal.setLoading(true);

            // Create order
            const newOrder = await this.orderService.createOrder(formData);

            // Success
            this.showAlert('success', 'Pedido creado exitosamente');
            modal.close();

            // Reload orders
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Order created:', newOrder.id);
            }
        } catch (error) {
            console.error('[OrdersController] Error creating order:', error);
            this.showAlert('danger', error.message || 'Error al crear pedido');
            modal.setLoading(false);
        }
    }

    /**
     * Get form data
     */
    getFormData() {
        let telefono = document.getElementById('order-telefono')?.value.trim() || '';

        // Add +57 prefix if not present
        if (telefono && !telefono.startsWith('+57')) {
            telefono = '+57' + telefono;
        }

        // Parse formatted currency values
        const valorPedidoStr = document.getElementById('order-valor-pedido')?.value.trim() || '0';
        const valorDomicilioStr = document.getElementById('order-valor-domicilio')?.value.trim() || '0';

        return {
            cliente: document.getElementById('order-cliente')?.value.trim(),
            telefono_cliente: telefono,
            direccion: document.getElementById('order-direccion')?.value.trim(),
            barrio: document.getElementById('order-barrio')?.value.trim() || null,
            valor_pedido: this.parseCurrency(valorPedidoStr),
            valor_domicilio: this.parseCurrency(valorDomicilioStr),
            metodo_pago: document.getElementById('order-metodo-pago')?.value || null,
            numero_datafono: document.getElementById('order-numero-datafono')?.value.trim() || null,
            notas: document.getElementById('order-notas')?.value.trim() || null,
        };
    }

    /**
     * Validate order form
     */
    validateOrderForm(data) {
        // Required fields
        if (!data.cliente || !data.telefono_cliente || !data.direccion) {
            return { valid: false, message: 'Todos los campos obligatorios son requeridos' };
        }

        // Phone validation (must have +57 prefix and 13 total characters)
        if (!data.telefono_cliente.startsWith('+57') || data.telefono_cliente.length !== 13) {
            return { valid: false, message: 'El teléfono no es válido. Debe ser un número celular colombiano' };
        }

        // Valor pedido validation
        if (data.valor_pedido <= 0) {
            return { valid: false, message: 'El valor del pedido debe ser mayor a 0' };
        }

        // Valor domicilio validation
        if (data.valor_domicilio <= 0) {
            return { valid: false, message: 'El valor del domicilio debe ser mayor a 0' };
        }

        // Metodo pago validation
        if (!data.metodo_pago) {
            return { valid: false, message: 'Debe seleccionar un método de pago' };
        }

        return { valid: true };
    }

    /**
     * View order details
     */
    viewOrderDetails(order) {
        const detailsHTML = `
            <div class="order-details">
                <div class="order-detail-row">
                    <span class="order-detail-label">ID:</span>
                    <span class="order-detail-value">${order.consecutivo_domiciliario || '#' + (order.consecutivo || order.id)}</span>
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
                <div class="order-detail-row">
                    <span class="order-detail-label">Distancia:</span>
                    <span class="order-detail-value">${order.distancia_km ? order.distancia_km + ' km' : 'N/A'}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Estado:</span>
                    <span class="order-detail-value">
                        <span class="order-status ${order.estado}">
                            ${FormatterUtil.formatOrderStatus(order.estado)}
                        </span>
                    </span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Domiciliario:</span>
                    <span class="order-detail-value">
                        ${order.domiciliario_id ? this.deliveries.find((d) => d.id === order.domiciliario_id)?.nombre || 'N/A' : 'Sin asignar'}
                    </span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Fecha Creación:</span>
                    <span class="order-detail-value">${FormatterUtil.formatDate(order.created_at)}</span>
                </div>
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
            title: `Detalles del Pedido ${order.consecutivo_domiciliario || '#' + (order.consecutivo || order.id)}`,
            content: detailsHTML,
            size: 'medium',
            showFooter: false,
        });
    }

    /**
     * Open assign delivery modal
     */
    openAssignModal(order) {
        const availableDeliveries = this.deliveries.filter((d) => d.estado === 'disponible');

        if (availableDeliveries.length === 0) {
            this.showAlert('warning', 'No hay domiciliarios disponibles en este momento');
            return;
        }

        const assignHTML = `
            <div class="assign-form">
                <p>Selecciona un domiciliario para asignar el pedido:</p>
                <div class="form-group">
                    <label for="assign-delivery">Domiciliario Disponible *</label>
                    <select id="assign-delivery" class="filter-select">
                        <option value="">Seleccionar...</option>
                        ${availableDeliveries
                            .map(
                                (d) => `
                            <option value="${d.id}">${d.nombre} - ${d.telefono}</option>
                        `
                            )
                            .join('')}
                    </select>
                </div>
            </div>
        `;

        Modal.open({
            title: `Asignar Pedido ${order.consecutivo_domiciliario || '#' + (order.consecutivo || order.id)}`,
            content: assignHTML,
            size: 'medium',
            confirmText: 'Asignar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                const deliveryId = document.getElementById('assign-delivery')?.value;
                if (!deliveryId) {
                    this.showAlert('danger', 'Debes seleccionar un domiciliario');
                    return;
                }
                await this.assignOrder(order.id, parseInt(deliveryId));
            },
        });
    }

    /**
     * Assign order to delivery
     */
    async assignOrder(orderId, deliveryId) {
        try {
            await this.orderService.assignOrder(orderId, deliveryId);
            this.showAlert('success', 'Pedido asignado exitosamente');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Order assigned:', orderId, deliveryId);
            }
        } catch (error) {
            console.error('[OrdersController] Error assigning order:', error);
            this.showAlert('danger', 'Error al asignar pedido');
        }
    }

    /**
     * Assign order and send WhatsApp notification
     */
    async assignOrderWithWhatsApp(order) {
        try {
            // Find the delivery person
            const delivery = this.deliveries.find((d) => d.id === order.domiciliario_id);

            if (!delivery) {
                this.showAlert('danger', 'No se encontró el domiciliario asignado');
                return;
            }

            // Update order status to 'asignado'
            await this.orderService.updateStatus(order.id, 'asignado');

            // Generate WhatsApp message
            const phone = delivery.telefono.replace(/^\+/, ''); // Remove + for WhatsApp URL
            const orderIdDisplay = order.consecutivo_domiciliario || order.consecutivo || order.id;

            const total = (parseFloat(order.valor_pedido) || 0) + (parseFloat(order.valor_domicilio) || 0);

            // Get the app URL - use production URL if in production, otherwise localhost
            const appBaseUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:5173'
                : window.location.origin;
            const domiciliariosUrl = `${appBaseUrl}/domiciliarios`;

            const message = `Hola ${delivery.nombre}! 🚴\n\n` +
                `Tienes un nuevo pedido asignado:\n\n` +
                `📦 Pedido ${orderIdDisplay}\n` +
                `👤 Cliente: ${order.cliente}\n` +
                `📍 Dirección: ${order.direccion}\n` +
                `💰 Valor Total: ${FormatterUtil.formatCurrency(total)}\n\n` +
                `Abre la app de domiciliarios para aceptar o rechazar este pedido.\n\n` +
                `Link de la app: ${domiciliariosUrl}`;

            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

            // Open WhatsApp in new tab
            window.open(whatsappUrl, '_blank');

            this.showAlert('success', 'Pedido actualizado. Mensaje de WhatsApp abierto.');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] WhatsApp assignment sent:', order.id);
            }
        } catch (error) {
            console.error('[OrdersController] Error in WhatsApp assignment:', error);
            this.showAlert('danger', 'Error al asignar pedido con WhatsApp');
        }
    }

    /**
     * Track delivery in real-time
     */
    async trackDelivery(order) {
        try {
            // Find the delivery person
            const delivery = this.deliveries.find((d) => d.id === order.domiciliario_id);

            if (!delivery) {
                this.showAlert('danger', 'No se encontró el domiciliario asignado');
                return;
            }

            // Check if delivery person has location data
            if (!delivery.latitud || !delivery.longitud) {
                this.showAlert(
                    'warning',
                    `${delivery.nombre} no está compartiendo su ubicación en este momento. Por favor, pídele que active la ubicación en la app de domiciliarios.`
                );
                return;
            }

            // Check when location was last updated
            if (delivery.ultima_actualizacion_ubicacion) {
                const lastUpdate = new Date(delivery.ultima_actualizacion_ubicacion);
                const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);

                if (minutesAgo > 5) {
                    this.showAlert(
                        'warning',
                        `Última ubicación actualizada hace ${minutesAgo} minutos. La ubicación puede no ser precisa.`
                    );
                }
            }

            // Open Google Maps with delivery person location
            const mapsUrl = `https://www.google.com/maps?q=${delivery.latitud},${delivery.longitud}&z=15`;
            window.open(mapsUrl, '_blank');

            this.showAlert('success', `Rastreando a ${delivery.nombre}`);

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Tracking delivery:', {
                    order: order.id,
                    delivery: delivery.nombre,
                    lat: delivery.latitud,
                    lng: delivery.longitud,
                });
            }
        } catch (error) {
            console.error('[OrdersController] Error tracking delivery:', error);
            this.showAlert('danger', 'Error al rastrear domiciliario');
        }
    }

    /**
     * Open status update modal
     */
    openStatusModal(order) {
        const statusOptions = [];

        if (order.estado === 'asignado') {
            statusOptions.push(
                { value: 'en_camino', label: 'En Camino' },
                { value: 'cancelado', label: 'Cancelar' }
            );
        } else if (order.estado === 'en_camino') {
            statusOptions.push(
                { value: 'entregado', label: 'Entregado' },
                { value: 'cancelado', label: 'Cancelar' }
            );
        }

        const statusHTML = `
            <div class="status-form">
                <p>Estado actual: <strong>${FormatterUtil.formatOrderStatus(order.estado)}</strong></p>
                <div class="form-group">
                    <label for="new-status">Nuevo Estado *</label>
                    <select id="new-status" class="filter-select">
                        <option value="">Seleccionar...</option>
                        ${statusOptions.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        Modal.open({
            title: `Actualizar Estado - Pedido ${order.consecutivo_domiciliario || '#' + (order.consecutivo || order.id)}`,
            content: statusHTML,
            size: 'small',
            confirmText: 'Actualizar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                const newStatus = document.getElementById('new-status')?.value;
                if (!newStatus) {
                    this.showAlert('danger', 'Debes seleccionar un nuevo estado');
                    return;
                }
                await this.updateOrderStatus(order.id, newStatus);
            },
        });
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId, newStatus) {
        try {
            await this.orderService.updateStatus(orderId, newStatus);
            this.showAlert('success', 'Estado actualizado exitosamente');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Status updated:', orderId, newStatus);
            }
        } catch (error) {
            console.error('[OrdersController] Error updating status:', error);
            this.showAlert('danger', 'Error al actualizar estado');
        }
    }

    /**
     * Update payment method for order
     */
    async updatePaymentMethod(orderId, paymentMethod) {
        try {
            await this.orderService.updateOrder(orderId, { metodo_pago: paymentMethod });
            this.showAlert('success', 'Método de pago actualizado');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Payment method updated:', orderId, paymentMethod);
            }
        } catch (error) {
            console.error('[OrdersController] Error updating payment method:', error);
            this.showAlert('danger', 'Error al actualizar método de pago');
            await this.refreshOrders(); // Refresh to revert the select
        }
    }

    /**
     * Update datafono number for order
     */
    async updateDatafonoNumber(orderId, datafonoNumber) {
        try {
            // Validate: only 4 digits
            if (datafonoNumber && !/^\d{0,4}$/.test(datafonoNumber)) {
                this.showAlert('danger', 'El número de datáfono debe tener máximo 4 dígitos');
                await this.refreshOrders();
                return;
            }

            await this.orderService.updateOrder(orderId, { numero_datafono: datafonoNumber || null });
            this.showAlert('success', 'Número de datáfono actualizado');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Datafono number updated:', orderId, datafonoNumber);
            }
        } catch (error) {
            console.error('[OrdersController] Error updating datafono number:', error);
            this.showAlert('danger', 'Error al actualizar número de datáfono');
            await this.refreshOrders();
        }
    }

    /**
     * Update voucher status for order
     */
    async updateVoucherStatus(orderId, voucherStatus) {
        try {
            await this.orderService.updateOrder(orderId, { voucher_estado: voucherStatus });
            this.showAlert('success', 'Estado de voucher actualizado');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Voucher status updated:', orderId, voucherStatus);
            }
        } catch (error) {
            console.error('[OrdersController] Error updating voucher status:', error);
            this.showAlert('danger', 'Error al actualizar estado de voucher');
            await this.refreshOrders(); // Refresh to revert the select
        }
    }

    /**
     * Update delivery person for order
     */
    async updateOrderDelivery(orderId, deliveryId) {
        try {
            // Don't parse to int - keep as string (could be UUID or integer)
            const updateData = {
                domiciliario_id: deliveryId || null,
            };

            console.log('[OrdersController] Updating delivery:', {orderId, deliveryId, updateData});
            await this.orderService.updateOrder(orderId, updateData);
            this.showAlert('success', 'Domiciliario actualizado');
            await this.refreshOrders();

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Delivery updated:', orderId, deliveryId);
            }
        } catch (error) {
            console.error('[OrdersController] Error updating delivery:', error);
            this.showAlert('danger', 'Error al actualizar domiciliario');
            await this.refreshOrders(); // Refresh to revert the select
        }
    }

    /**
     * Cancel order
     */
    cancelOrder(order) {
        const modal = Modal.confirm(
            'Eliminar Pedido',
            `¿Estás seguro de que deseas eliminar el pedido ${order.consecutivo_domiciliario || '#' + (order.consecutivo || order.id)}? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    modal.setLoading(true);
                    await this.orderService.deleteOrder(order.id);
                    this.showAlert('success', 'Pedido eliminado exitosamente');
                    modal.close();
                    await this.refreshOrders();

                    if (APP_CONFIG.enableDebug) {
                        console.info('[OrdersController] Order deleted:', order.id);
                    }
                } catch (error) {
                    console.error('[OrdersController] Error deleting order:', error);
                    this.showAlert('danger', 'Error al eliminar pedido');
                    modal.setLoading(false);
                }
            }
        );
    }

    /**
     * Export orders to CSV
     */
    exportOrders() {
        try {
            const data = this.getFilteredOrders();

            if (data.length === 0) {
                this.showAlert('warning', 'No hay datos para exportar');
                return;
            }

            // Create CSV content
            const headers = [
                'ID',
                'Cliente',
                'Teléfono',
                'Dirección',
                'Valor',
                'Estado',
                'Domiciliario',
                'Fecha',
            ];
            const rows = data.map((order) => [
                order.consecutivo_domiciliario || order.consecutivo || order.id,
                order.cliente,
                order.telefono_cliente,
                order.direccion,
                order.valor_domicilio,
                FormatterUtil.formatOrderStatus(order.estado),
                order.domiciliario_id
                    ? this.deliveries.find((d) => d.id === order.domiciliario_id)?.nombre || 'N/A'
                    : 'Sin asignar',
                FormatterUtil.formatDate(order.created_at),
            ]);

            const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            this.showAlert('success', 'Pedidos exportados exitosamente');

            if (APP_CONFIG.enableDebug) {
                console.info('[OrdersController] Orders exported:', data.length);
            }
        } catch (error) {
            console.error('[OrdersController] Error exporting orders:', error);
            this.showAlert('danger', 'Error al exportar pedidos');
        }
    }

    /**
     * Refresh orders table
     */
    async refreshOrders() {
        await this.loadOrders();
        await this.loadDeliveries();
        this.populateDeliveryFilter();
        this.table.setData(this.getFilteredOrders());
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
     * Format currency value with Colombian format (thousands separator with dot)
     * @param {number} value
     * @returns {string}
     */
    formatCurrency(value) {
        if (!value) return '';
        const numValue = parseFloat(value);
        return numValue.toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    /**
     * Parse formatted currency back to number
     * @param {string} formattedValue
     * @returns {number}
     */
    parseCurrency(formattedValue) {
        if (!formattedValue) return 0;
        // Remove dots (thousands separator) and convert to number
        return parseFloat(formattedValue.replace(/\./g, '').replace(/,/g, '.')) || 0;
    }

    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertContainer = document.getElementById('orders-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                alertContainer.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * Initialize automatic reset system
     * Checks every minute if it's time to reset the view
     */
    initializeAutoReset() {
        // Check reset immediately on load
        this.checkResetTime();

        // Then check every minute
        this.resetCheckInterval = setInterval(() => {
            this.checkResetTime();
        }, 60000); // Check every minute
    }

    /**
     * Check if current time matches reset time (from settings or default 1 AM Colombia time)
     */
    checkResetTime() {
        try {
            // Get reset hour from localStorage (default 1 AM)
            const resetHour = parseInt(localStorage.getItem('orderResetHour') || '1');

            // Get current time in Colombia (UTC-5)
            const now = new Date();
            const colombiaOffset = -5 * 60;
            const localOffset = now.getTimezoneOffset();
            const colombiaTime = new Date(now.getTime() + (localOffset + colombiaOffset) * 60000);

            const currentHour = colombiaTime.getHours();
            const currentMinute = colombiaTime.getMinutes();

            // Get last reset date from localStorage
            const lastReset = localStorage.getItem('lastOrderReset');
            const today = colombiaTime.toISOString().split('T')[0];

            // Check if it's the reset hour and we haven't reset today yet
            if (currentHour === resetHour && currentMinute === 0 && lastReset !== today) {
                this.performReset();
                localStorage.setItem('lastOrderReset', today);
            }
        } catch (error) {
            console.error('[OrdersController] Error checking reset time:', error);
        }
    }

    /**
     * Perform the reset - reload orders for the new day
     */
    async performReset() {
        try {
            console.info('[OrdersController] Performing automatic reset for new day');
            await this.loadOrders();
            if (this.table) {
                this.table.updateData(this.orders);
            }
            this.showAlert('info', 'Vista actualizada para el nuevo día');
        } catch (error) {
            console.error('[OrdersController] Error performing reset:', error);
        }
    }

    /**
     * Cleanup when navigating away
     */
    destroy() {
        if (this.table) {
            this.table.destroy();
        }

        // Clear reset interval
        if (this.resetCheckInterval) {
            clearInterval(this.resetCheckInterval);
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[OrdersController] Destroyed');
        }
    }
}
