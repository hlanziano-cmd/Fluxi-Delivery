import { AuthService } from '../../services/auth.service.js';
import { OrderService } from '../../services/order.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { FormatterUtil } from '../../core/utils/formatter.js';
import { APP_CONFIG } from '../../core/config/app.config.js';

/**
 * Tiempos de Espera Controller
 * Manages delivery time analysis (travel, wait, and standby times)
 */
export class TiemposEsperaController {
    constructor() {
        this.authService = new AuthService();
        this.orderService = new OrderService();
        this.deliveryService = new DeliveryService();
        this.deliveries = [];
        this.tiemposData = [];

        this.initializeView();
    }

    async initializeView() {
        try {
            // Check authentication
            const session = this.authService.getCurrentUser();
            if (!session) {
                window.location.href = '/';
                return;
            }

            this.displayUserInfo(session);
            await this.loadDeliveries();
            this.setupEventListeners();
            this.setDefaultDates();

            if (APP_CONFIG.enableDebug) {
                console.info('[TiemposEsperaController] Initialized successfully');
            }
        } catch (error) {
            console.error('[TiemposEsperaController] Init error:', error);
            this.showAlert('danger', 'Error al inicializar el módulo');
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

    getRoleLabel(rol) {
        const roles = {
            admin: 'Administrador',
            dispatcher: 'Despachador',
            domiciliario: 'Domiciliario',
            superadmin: 'Super Administrador',
        };
        return roles[rol] || rol;
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        document.getElementById('filter-tiempos-fecha-inicio').value = weekAgo;
        document.getElementById('filter-tiempos-fecha-fin').value = today;
    }

    async loadDeliveries() {
        try {
            // Use DeliveryService instead of direct Supabase access
            const allDeliveries = await this.deliveryService.getAllDeliveries();
            this.deliveries = allDeliveries.filter(d => d.activo);
            this.populateDeliverySelect();

            if (APP_CONFIG.enableDebug) {
                console.info('[TiemposEsperaController] Loaded deliveries:', this.deliveries.length);
            }
        } catch (error) {
            console.error('[TiemposEsperaController] Error loading deliveries:', error);
            throw error;
        }
    }

    populateDeliverySelect() {
        const select = document.getElementById('filter-tiempos-domiciliario');
        select.innerHTML = '<option value="">Todos</option>';

        this.deliveries.forEach(delivery => {
            const option = document.createElement('option');
            option.value = delivery.id;
            option.textContent = delivery.nombre;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        document.getElementById('btn-buscar-tiempos')?.addEventListener('click', () => this.searchTiempos());
        document.getElementById('btn-limpiar-tiempos')?.addEventListener('click', () => this.clearFilters());
        document.getElementById('btn-tiempos-logout')?.addEventListener('click', () => this.handleLogout());

        // Mobile menu toggle
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

    async searchTiempos() {
        try {
            const fechaInicio = document.getElementById('filter-tiempos-fecha-inicio').value;
            const fechaFin = document.getElementById('filter-tiempos-fecha-fin').value;
            const domiciliarioId = document.getElementById('filter-tiempos-domiciliario').value;

            if (!fechaInicio || !fechaFin) {
                this.showAlert('warning', 'Por favor selecciona un rango de fechas');
                return;
            }

            // Get all orders using OrderService
            const allOrders = await this.orderService.getAllOrders();

            // Filter orders by date range, status, and delivery person
            const startOfDay = new Date(fechaInicio);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(fechaFin);
            endOfDay.setHours(23, 59, 59, 999);

            let filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                const hasValidTimeData = order.tiempo_recorrido !== null && order.tiempo_recorrido !== undefined;
                const isDelivered = order.estado === 'entregado';
                const isInDateRange = orderDate >= startOfDay && orderDate <= endOfDay;

                return isDelivered && isInDateRange && hasValidTimeData;
            });

            // Filter by delivery person if specified
            if (domiciliarioId) {
                filteredOrders = filteredOrders.filter(order =>
                    order.domiciliario_id === parseInt(domiciliarioId)
                );
            }

            // Sort by creation date descending
            filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Enrich with delivery person names
            this.tiemposData = filteredOrders.map(order => {
                const delivery = this.deliveries.find(d => d.id === order.domiciliario_id);
                return {
                    ...order,
                    domiciliario_nombre: delivery ? delivery.nombre : 'N/A'
                };
            });

            this.renderTiempos();
            this.showAlert('success', `Se encontraron ${this.tiemposData.length} pedidos`);

            if (APP_CONFIG.enableDebug) {
                console.info('[TiemposEsperaController] Found orders:', this.tiemposData.length);
            }

        } catch (error) {
            console.error('[TiemposEsperaController] Error searching tiempos:', error);
            this.showAlert('danger', 'Error al buscar tiempos');
        }
    }

    renderTiempos() {
        if (this.tiemposData.length === 0) {
            document.getElementById('tiempos-initial-message').classList.remove('hidden');
            document.getElementById('tiempos-stats-container').classList.add('hidden');
            document.getElementById('tiempos-summary').classList.add('hidden');
            document.getElementById('tiempos-table-container').innerHTML = '';
            return;
        }

        document.getElementById('tiempos-initial-message').classList.add('hidden');
        document.getElementById('tiempos-stats-container').classList.remove('hidden');
        document.getElementById('tiempos-summary').classList.remove('hidden');

        // Calculate averages
        let totalRecorrido = 0;
        let totalEspera = 0;
        let totalEntrega = 0;
        let totalStandby = 0;
        let countRecorrido = 0;
        let countEspera = 0;
        let countEntrega = 0;
        let countStandby = 0;
        let pedidosConEspera = 0;

        this.tiemposData.forEach(order => {
            if (order.tiempo_recorrido) {
                totalRecorrido += order.tiempo_recorrido;
                countRecorrido++;
            }
            if (order.tiempo_espera) {
                totalEspera += order.tiempo_espera;
                countEspera++;
                pedidosConEspera++;
            }
            if (order.tiempo_entrega) {
                totalEntrega += order.tiempo_entrega;
                countEntrega++;
            }
            if (order.tiempo_standby) {
                totalStandby += order.tiempo_standby;
                countStandby++;
            }
        });

        // Update stats cards
        document.getElementById('stat-tiempo-recorrido').textContent =
            countRecorrido > 0 ? this.formatTime(totalRecorrido / countRecorrido) : '--';
        document.getElementById('stat-tiempo-espera').textContent =
            countEspera > 0 ? this.formatTime(totalEspera / countEspera) : '--';
        document.getElementById('stat-tiempo-entrega').textContent =
            countEntrega > 0 ? this.formatTime(totalEntrega / countEntrega) : '--';
        document.getElementById('stat-tiempo-standby').textContent =
            countStandby > 0 ? this.formatTime(totalStandby / countStandby) : '--';

        // Update summary
        document.getElementById('summary-total-pedidos').textContent = this.tiemposData.length;
        document.getElementById('summary-pedidos-con-espera').textContent = pedidosConEspera;
        document.getElementById('summary-pedidos-sin-espera').textContent = this.tiemposData.length - pedidosConEspera;

        // Render table
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Dirección</th>
                        <th>Barrio</th>
                        <th>Domiciliario</th>
                        <th>Inicio</th>
                        <th style="background: #3498db; color: white;">🚴 Recorrido</th>
                        <th style="background: #f39c12; color: white;">⏰ Espera</th>
                        <th style="background: #27ae60; color: white;">✅ Entrega</th>
                        <th style="background: #9b59b6; color: white;">💤 Stand By</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.tiemposData.map(order => `
                        <tr>
                            <td>${order.consecutivo_domiciliario || '#' + (order.id ? order.id.toString().substring(0, 8) : 'N/A')}</td>
                            <td>${order.direccion || 'N/A'}</td>
                            <td>${order.barrio || '-'}</td>
                            <td>${order.domiciliario_nombre}</td>
                            <td>${this.formatDateTime(order.created_at)}</td>
                            <td>${order.tiempo_recorrido ? this.formatTime(order.tiempo_recorrido) : '-'}</td>
                            <td>${order.tiempo_espera ? this.formatTime(order.tiempo_espera) : '-'}</td>
                            <td>${order.tiempo_entrega ? this.formatTime(order.tiempo_entrega) : '-'}</td>
                            <td>${order.tiempo_standby ? this.formatTime(order.tiempo_standby) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('tiempos-table-container').innerHTML = tableHTML;
    }

    clearFilters() {
        this.setDefaultDates();
        document.getElementById('filter-tiempos-domiciliario').value = '';
        document.getElementById('tiempos-initial-message').classList.remove('hidden');
        document.getElementById('tiempos-stats-container').classList.add('hidden');
        document.getElementById('tiempos-summary').classList.add('hidden');
        document.getElementById('tiempos-table-container').innerHTML = '';
        this.tiemposData = [];
    }

    formatTime(minutes) {
        if (!minutes && minutes !== 0) return '-';
        const mins = Math.round(minutes);
        if (mins < 60) {
            return `${mins} min`;
        } else {
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return `${hours}h ${remainingMins}m`;
        }
    }

    formatDateTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleString('es-CO', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showAlert(type, message) {
        const alertDiv = document.getElementById('tiempos-alert');
        if (!alertDiv) return;

        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(() => {
                alertDiv.classList.add('hidden');
            }, 5000);
        }
    }

    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.authService.logout();
            window.location.href = '/';
        }
    }

    /**
     * Cleanup when navigating away
     */
    destroy() {
        // Remove event listeners if needed
        if (APP_CONFIG.enableDebug) {
            console.info('[TiemposEsperaController] Destroyed');
        }
    }
}
