import { AuthService } from '../../services/auth.service.js';
import { OrderService } from '../../services/order.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { FormatterUtil } from '../../core/utils/formatter.js';
import { APP_CONFIG } from '../../core/config/app.config.js';

/**
 * Cuadre de Caja Controller
 * Manages cash register reconciliation for delivery personnel
 */
export class CuadreCajaController {
    constructor() {
        this.authService = new AuthService();
        this.orderService = new OrderService();
        this.deliveryService = new DeliveryService();
        this.deliveries = [];
        this.cuadreData = [];

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
            this.setDefaultDate();

            if (APP_CONFIG.enableDebug) {
                console.info('[CuadreCajaController] Initialized successfully');
            }
        } catch (error) {
            console.error('[CuadreCajaController] Init error:', error);
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

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('cuadre-fecha').value = today;
    }

    async loadDeliveries() {
        try {
            // Use DeliveryService instead of direct Supabase access
            const allDeliveries = await this.deliveryService.getAllDeliveries();
            this.deliveries = allDeliveries.filter(d => d.activo);
            this.populateDeliverySelect();

            if (APP_CONFIG.enableDebug) {
                console.info('[CuadreCajaController] Loaded deliveries:', this.deliveries.length);
            }
        } catch (error) {
            console.error('[CuadreCajaController] Error loading deliveries:', error);
            throw error;
        }
    }

    populateDeliverySelect() {
        const select = document.getElementById('cuadre-domiciliario');
        select.innerHTML = '<option value="">Todos los Domiciliarios</option>';

        this.deliveries.forEach(delivery => {
            const option = document.createElement('option');
            option.value = delivery.id;
            option.textContent = delivery.nombre;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        document.getElementById('btn-calcular-cuadre')?.addEventListener('click', () => this.calculateCuadre());
        document.getElementById('btn-limpiar-cuadre')?.addEventListener('click', () => this.clearFilters());
        document.getElementById('btn-cuadre-logout')?.addEventListener('click', () => this.handleLogout());

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

    async calculateCuadre() {
        try {
            const fecha = document.getElementById('cuadre-fecha').value;
            const domiciliarioId = document.getElementById('cuadre-domiciliario').value;

            if (!fecha) {
                this.showAlert('warning', 'Por favor selecciona una fecha');
                return;
            }

            // Get all orders for the selected date using OrderService
            const allOrders = await this.orderService.getAllOrders();

            // Filter orders by date and status
            const startOfDay = new Date(fecha);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(fecha);
            endOfDay.setHours(23, 59, 59, 999);

            let filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.created_at);
                return orderDate >= startOfDay &&
                       orderDate <= endOfDay &&
                       order.estado === 'entregado';
            });

            // Filter by delivery person if specified
            if (domiciliarioId) {
                filteredOrders = filteredOrders.filter(order =>
                    order.domiciliario_id === parseInt(domiciliarioId)
                );
            }

            // Get delivery persons to calculate cuadre
            let deliveriesToCalculate = this.deliveries;
            if (domiciliarioId) {
                deliveriesToCalculate = this.deliveries.filter(d => d.id === parseInt(domiciliarioId));
            }

            // Calculate cuadre by delivery person
            const cuadreByDelivery = {};

            deliveriesToCalculate.forEach(delivery => {
                cuadreByDelivery[delivery.id] = {
                    nombre: delivery.nombre,
                    arranque: parseFloat(delivery.arranque_inicial) || 0,
                    efectivo: 0,
                    datafono: 0,
                    descargas: 0
                };
            });

            filteredOrders.forEach(order => {
                if (order.domiciliario_id && cuadreByDelivery[order.domiciliario_id]) {
                    const metodo = order.metodo_pago || 'efectivo';
                    const valor = parseFloat(order.valor_domicilio) || 0;

                    if (metodo === 'efectivo') {
                        cuadreByDelivery[order.domiciliario_id].efectivo += valor;
                    } else if (metodo === 'datafono') {
                        cuadreByDelivery[order.domiciliario_id].datafono += valor;
                    }
                }
            });

            this.cuadreData = Object.values(cuadreByDelivery);
            this.renderCuadre();
            this.showAlert('success', 'Cuadre calculado correctamente');

            if (APP_CONFIG.enableDebug) {
                console.info('[CuadreCajaController] Cuadre calculated:', this.cuadreData.length, 'delivery persons');
            }

        } catch (error) {
            console.error('[CuadreCajaController] Error calculating cuadre:', error);
            this.showAlert('danger', 'Error al calcular el cuadre');
        }
    }

    renderCuadre() {
        if (this.cuadreData.length === 0) {
            document.getElementById('cuadre-initial-message').classList.remove('hidden');
            document.getElementById('cuadre-summary').classList.add('hidden');
            document.getElementById('cuadre-table-container').innerHTML = '';
            return;
        }

        document.getElementById('cuadre-initial-message').classList.add('hidden');
        document.getElementById('cuadre-summary').classList.remove('hidden');

        // Calculate totals
        let totalEfectivo = 0;
        let totalDatafono = 0;

        this.cuadreData.forEach(item => {
            totalEfectivo += item.arranque + item.efectivo - item.descargas;
            totalDatafono += item.datafono;
        });

        // Update summary cards
        document.getElementById('cuadre-total-efectivo').textContent = this.formatCurrency(totalEfectivo);
        document.getElementById('cuadre-total-tarjetas').textContent = this.formatCurrency(totalDatafono);
        document.getElementById('cuadre-total-general').textContent = this.formatCurrency(totalEfectivo + totalDatafono);

        // Render table
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Domiciliario</th>
                        <th>Valor Arranque</th>
                        <th>Efectivo Pedidos</th>
                        <th>Descargas</th>
                        <th>Total Efectivo</th>
                        <th>Datáfono</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.cuadreData.map(item => {
                        const totalEfec = item.arranque + item.efectivo - item.descargas;
                        const total = totalEfec + item.datafono;
                        return `
                            <tr>
                                <td><strong>${item.nombre}</strong></td>
                                <td>${this.formatCurrency(item.arranque)}</td>
                                <td>${this.formatCurrency(item.efectivo)}</td>
                                <td>${this.formatCurrency(item.descargas)}</td>
                                <td><strong>${this.formatCurrency(totalEfec)}</strong></td>
                                <td>${this.formatCurrency(item.datafono)}</td>
                                <td><strong>${this.formatCurrency(total)}</strong></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('cuadre-table-container').innerHTML = tableHTML;
    }

    clearFilters() {
        document.getElementById('cuadre-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('cuadre-domiciliario').value = '';
        document.getElementById('cuadre-initial-message').classList.remove('hidden');
        document.getElementById('cuadre-summary').classList.add('hidden');
        document.getElementById('cuadre-table-container').innerHTML = '';
        this.cuadreData = [];
    }

    formatCurrency(amount) {
        if (!amount && amount !== 0) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    showAlert(type, message) {
        const alertDiv = document.getElementById('cuadre-alert');
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
            console.info('[CuadreCajaController] Destroyed');
        }
    }
}
