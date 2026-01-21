import { AuthService } from '../../services/auth.service.js';
import { OrderService } from '../../services/order.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { FormatterUtil } from '../../core/utils/formatter.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { Table } from '../../components/table/Table.js';

/**
 * Order History Controller
 * Manages historical order queries from Dyalogo API
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

        // Dyalogo API configuration
        this.dyalogoConfig = {
            proxyUrl: 'http://localhost:3000/api/dyalogo',
            credentials: {
                strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
                strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
                intIdG_t: '4981'
            },
            // Field mapping from Dyalogo array indices (CORREGIDO según estructura real)
            // Estructura: [0]: dyalogoId, [1]: fechaPedido, [3]: duracion, [9]: agente,
            // [13]: nombre, [14]: apellido, [19]: telefono, [23]: direccion, [26]: barrio
            fieldMapping: {
                dyalogoId: 0,              // ID único de Dyalogo (25652)
                fechaPedido: 1,            // FECHA DEL PEDIDO - G4981_C101302 ("2026-01-15 11:45:38")
                duracionLlamada: 3,        // Duración de la llamada "00:02:30"
                agente: 9,                 // Nombre del agente ("Faith Irene Galeano Vergara")
                campana: 12,               // Campaña (IN Opción Pedidos VILLA DEL POLLO)
                clienteNombres: 13,        // Nombre del cliente ("alvaro")
                clienteApellidos: 14,      // Apellido del cliente ("parto")
                clienteDocumento: 15,      // ID documento
                clienteTelefono: 19,       // Teléfono del cliente ("3004694097")
                direccionEntrega: 23,      // Dirección de entrega ("CLL 63 SUR 71F 35")
                complementoDireccion: 24,  // Complemento de dirección
                barrio: 26,                // Barrio ("perdomo")
                barrioId: 27,              // ID del barrio
                ciudadId: 28,              // ID de la ciudad
                valorPedido: 31,           // Valor del pedido
                fechaCreacionSQL: 'G4981_C101302'  // Campo SQL para fecha del pedido
            }
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
     * Set default date range (last 3 months for historical queries)
     */
    setDefaultDates() {
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        document.getElementById('filter-start-date').value = threeMonthsAgo.toISOString().split('T')[0];
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
                    key: 'fecha_pedido',
                    label: 'Fecha',
                    sortable: true,
                    render: (value) => {
                        try {
                            // Handle Dyalogo date format: "2025-01-15 10:30:00"
                            const date = new Date(value.replace(' ', 'T'));
                            // Format as DD/MM/YYYY HH:MM AM/PM
                            const dateStr = date.toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                            const timeStr = date.toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                            return `${dateStr}<br><small>${timeStr}</small>`;
                        } catch {
                            return value;
                        }
                    },
                },
                {
                    key: 'cliente_nombre',
                    label: 'Cliente',
                    sortable: true,
                },
                {
                    key: 'cliente_telefono',
                    label: 'Teléfono',
                    render: (value) => value ? value.replace(/^\+57/, '') : '-',
                },
                {
                    key: 'cliente_direccion',
                    label: 'Dirección',
                },
                {
                    key: 'domiciliario_nombre',
                    label: 'Agente',
                    render: (value) => value || 'N/A',
                },
                {
                    key: 'total',
                    label: 'Valor',
                    sortable: true,
                    render: (value) => FormatterUtil.formatCurrency(value),
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
            this.showAlert('info', 'Consultando Dyalogo...');

            // Build SQL WHERE clause for date range
            const whereClause = this.buildDyalogoWhereClause();

            // Make request to Dyalogo via proxy
            const requestBody = {
                strUsuario_t: this.dyalogoConfig.credentials.strUsuario_t,
                strToken_t: this.dyalogoConfig.credentials.strToken_t,
                intIdG_t: this.dyalogoConfig.credentials.intIdG_t,
                strSQLWhere_t: whereClause,
                intLimit_t: '5000' // Get up to 5000 records (3 months of data)
            };

            console.log('[OrderHistoryController] Requesting Dyalogo with:', requestBody);

            const response = await fetch(this.dyalogoConfig.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[OrderHistoryController] Dyalogo response:', data);

            // Extract records from response
            let records = data.objSerializar_t || data.data || [];

            if (!Array.isArray(records)) {
                records = [];
            }

            console.log(`[OrderHistoryController] Found ${records.length} records from Dyalogo`);

            // Transform Dyalogo records to display format and apply client-side filters
            this.orders = records
                .map(record => this.transformDyalogoRecord(record))
                .filter(order => order !== null)
                .filter(order => this.applyClientSideFilters(order));

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

            this.showAlert('success', `Se encontraron ${this.orders.length} pedidos`);

            if (APP_CONFIG.enableDebug) {
                console.info('[OrderHistoryController] Found orders:', this.orders.length);
            }
        } catch (error) {
            console.error('[OrderHistoryController] Error searching orders:', error);
            this.showAlert('danger', 'Error al consultar Dyalogo. Verifique que el proxy esté activo.');
        }
    }

    /**
     * Build SQL WHERE clause for Dyalogo query
     */
    buildDyalogoWhereClause() {
        const fm = this.dyalogoConfig.fieldMapping;
        const conditions = [];

        // Date range filter
        if (this.filters.startDate) {
            conditions.push(`${fm.fechaCreacionSQL} >= '${this.filters.startDate} 00:00:00'`);
        }
        if (this.filters.endDate) {
            conditions.push(`${fm.fechaCreacionSQL} <= '${this.filters.endDate} 23:59:59'`);
        }

        return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    }

    /**
     * Transform a Dyalogo record (array) to display format
     */
    transformDyalogoRecord(record) {
        try {
            const fm = this.dyalogoConfig.fieldMapping;

            const dyalogoId = record[fm.dyalogoId];
            const fechaPedido = record[fm.fechaPedido]; // Fecha del pedido (G4981_C101302)
            const nombres = (record[fm.clienteNombres] || '').toString().trim();
            const apellidos = (record[fm.clienteApellidos] || '').toString().trim();
            const telefono = record[fm.clienteTelefono] ? String(record[fm.clienteTelefono]).trim() : '';
            const direccion = (record[fm.direccionEntrega] || '').toString().trim();
            const complemento = (record[fm.complementoDireccion] || '').toString().trim();
            const barrio = (record[fm.barrio] || '').toString().trim();
            const valorPedido = parseFloat(record[fm.valorPedido]) || 0;
            const agente = (record[fm.agente] || '').toString().trim();

            // Skip records without essential data
            if (!dyalogoId || !fechaPedido) {
                return null;
            }

            const nombreCompleto = `${nombres} ${apellidos}`.trim();
            if (!nombreCompleto) {
                return null;
            }

            let direccionCompleta = direccion;
            if (complemento) {
                direccionCompleta += ' ' + complemento;
            }

            // Format phone
            let telefonoFormateado = telefono;
            if (telefono && !telefono.startsWith('+')) {
                telefonoFormateado = '+57' + telefono.replace(/^0+/, '');
            }

            return {
                id: dyalogoId,
                consecutivo: dyalogoId,
                fecha_pedido: fechaPedido, // Usar la fecha del pedido correcta
                cliente_nombre: nombreCompleto,
                cliente_telefono: telefonoFormateado,
                cliente_direccion: direccionCompleta,
                barrio: barrio,
                valor: valorPedido,
                costo_domicilio: 0,
                total: valorPedido,
                estado: 'entregado', // Historical records from Dyalogo
                domiciliario_nombre: agente,
                observaciones: `Dyalogo ID: ${dyalogoId}`
            };
        } catch (error) {
            console.error('[OrderHistoryController] Error transforming record:', error);
            return null;
        }
    }

    /**
     * Apply client-side filters (client name/phone)
     */
    applyClientSideFilters(order) {
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
        let fechaFormateada = order.fecha_pedido;
        try {
            const date = new Date(order.fecha_pedido.replace(' ', 'T'));
            fechaFormateada = date.toLocaleString('es-CO');
        } catch {
            // Keep original format
        }

        const details = `
            <div class="order-details">
                <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                <p><strong>Cliente:</strong> ${order.cliente_nombre}</p>
                <p><strong>Teléfono:</strong> ${order.cliente_telefono || 'N/A'}</p>
                <p><strong>Dirección:</strong> ${order.cliente_direccion}</p>
                <p><strong>Barrio:</strong> ${order.barrio || 'N/A'}</p>
                <p><strong>Agente:</strong> ${order.domiciliario_nombre || 'N/A'}</p>
                <p><strong>Valor:</strong> ${FormatterUtil.formatCurrency(order.total)}</p>
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

            const csvData = this.orders.map((order) => {
                let fechaFormateada = order.fecha_pedido;
                try {
                    const date = new Date(order.fecha_pedido.replace(' ', 'T'));
                    fechaFormateada = date.toLocaleString('es-CO');
                } catch {
                    // Keep original
                }

                return {
                    Fecha: fechaFormateada,
                    Cliente: order.cliente_nombre,
                    Teléfono: order.cliente_telefono || '',
                    Dirección: order.cliente_direccion,
                    Barrio: order.barrio || '',
                    Agente: order.domiciliario_nombre || '',
                    Valor: order.total,
                };
            });

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

    /**
     * Cleanup when navigating away
     */
    destroy() {
        if (this.table) {
            this.table.destroy();
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[OrderHistoryController] Destroyed');
        }
    }
}
