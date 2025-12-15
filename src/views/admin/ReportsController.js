import { AuthService } from '../../services/auth.service.js';
import { ReportsService } from '../../services/reports.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { ReportFilters } from '../../components/reports/ReportFilters.js';
import { MetricsCards } from '../../components/reports/MetricsCards.js';
import { ReportCharts } from '../../components/reports/ReportCharts.js';
import { OrdersTable } from '../../components/reports/OrdersTable.js';
import { APP_CONFIG } from '../../core/config/app.config.js';

/**
 * Reports Controller
 * Controlador para el módulo de reportes y analíticas
 */
export class ReportsController {
    constructor() {
        this.authService = new AuthService();
        this.reportsService = new ReportsService();
        this.deliveryService = new DeliveryService();

        // Componentes
        this.reportFilters = null;
        this.metricsCards = new MetricsCards();
        this.reportCharts = new ReportCharts();
        this.ordersTable = new OrdersTable();

        // Estado
        this.filters = null;
        this.isLoading = false;

        this.initializeView();
    }

    /**
     * Inicializar vista de reportes
     */
    async initializeView() {
        try {
            // Verificar autenticación
            const session = this.authService.getCurrentUser();
            if (!session) {
                window.location.href = '/';
                return;
            }

            // Mostrar información del usuario en sidebar
            this.displayUserInfo(session);

            // Renderizar componentes
            await this.renderComponents();

            // Inicializar eventos
            this.initializeEvents();

            if (APP_CONFIG.enableDebug) {
                console.info('[ReportsController] Initialized successfully');
            }
        } catch (error) {
            console.error('[ReportsController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar el módulo de reportes');
        }
    }

    /**
     * Renderizar componentes
     */
    async renderComponents() {
        // Crear componente de filtros
        this.reportFilters = new ReportFilters(this.handleFilterChange.bind(this));

        // Renderizar filtros
        const filtersContainer = document.getElementById('filtersContainer');
        if (filtersContainer) {
            filtersContainer.innerHTML = await this.reportFilters.render();
            this.reportFilters.attachEventListeners();
        }

        // Renderizar cards de métricas
        const metricsContainer = document.getElementById('metricsContainer');
        if (metricsContainer) {
            metricsContainer.innerHTML = this.metricsCards.render();
        }

        // Renderizar contenedores de gráficas
        const chartsContainer = document.getElementById('chartsContainer');
        if (chartsContainer) {
            chartsContainer.innerHTML = this.reportCharts.render();
        }

        // Renderizar tabla de pedidos
        const ordersTableContainer = document.getElementById('ordersTableContainer');
        if (ordersTableContainer) {
            ordersTableContainer.innerHTML = this.ordersTable.render();
        }

        // Cargar datos iniciales
        await this.loadReports(this.reportFilters.getFilters());
    }

    /**
     * Mostrar información del usuario en sidebar
     */
    displayUserInfo(session) {
        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');

        if (nameEl) nameEl.textContent = session.nombre;
        if (roleEl) roleEl.textContent = this.getRoleLabel(session.rol);
    }

    /**
     * Obtener etiqueta de rol
     */
    getRoleLabel(rol) {
        const roles = {
            admin: 'Administrador',
            dispatcher: 'Despachador',
            domiciliario: 'Domiciliario',
            superadmin: 'Super Administrador',
        };
        return roles[rol] || rol;
    }

    /**
     * Inicializar event listeners
     */
    initializeEvents() {
        // Logout button
        const logoutBtn = document.getElementById('btn-dashboard-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

        // Cerrar sidebar al hacer click fuera en mobile
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
     * Manejar cambio de filtros
     * @param {Object} filters - Nuevos filtros
     */
    async handleFilterChange(filters) {
        this.filters = filters;
        await this.loadReports(filters);
    }

    /**
     * Cargar reportes con filtros
     * @param {Object} filters - Filtros a aplicar
     */
    async loadReports(filters) {
        try {
            this.showLoading(true);

            // Cargar datos en paralelo
            const [metrics, orderStatus, incomeDistribution, dailyIncome, orders] =
                await Promise.all([
                    this.reportsService.getMetrics(filters),
                    this.reportsService.getOrderStatusDistribution(filters),
                    this.reportsService.getIncomeByPaymentMethod(filters),
                    this.reportsService.getDailyIncome(filters),
                    this.reportsService.getFilteredOrders(filters),
                ]);

            // Actualizar métricas
            this.metricsCards.updateMetrics(metrics);

            // Inicializar o actualizar gráficas
            const chartData = {
                orderStatus,
                incomeDistribution,
                dailyIncome,
            };

            if (
                !this.reportCharts.charts.orderStatus &&
                !this.reportCharts.charts.incomeDistribution &&
                !this.reportCharts.charts.incomeValue
            ) {
                // Primera carga - inicializar gráficas
                this.reportCharts.initCharts(chartData);
            } else {
                // Actualizar gráficas existentes
                this.reportCharts.updateCharts(chartData);
            }

            // Actualizar tabla de pedidos
            this.ordersTable.updateOrders(orders);

            this.showLoading(false);
        } catch (error) {
            console.error('[ReportsController] Error loading reports:', error);
            this.showLoading(false);
            this.showAlert('danger', 'Error al cargar los reportes. Por favor intente nuevamente.');
        }
    }

    /**
     * Mostrar/ocultar loading
     * @param {boolean} show - Mostrar o no
     */
    showLoading(show) {
        this.isLoading = show;

        const loadingEl = document.getElementById('reportsLoading');
        const sectionsEls = [
            document.getElementById('metricsSection'),
            document.getElementById('chartsSection'),
            document.getElementById('ordersTableSection'),
        ];

        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }

        sectionsEls.forEach((el) => {
            if (el) {
                el.style.opacity = show ? '0.5' : '1';
                el.style.pointerEvents = show ? 'none' : 'auto';
            }
        });
    }

    /**
     * Manejar logout
     */
    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.authService.logout();
            window.location.href = '/';
        }
    }

    /**
     * Mostrar mensaje de alerta
     */
    showAlert(type, message) {
        const alertContainer = document.getElementById('dashboard-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

        // Auto-ocultar mensajes de éxito
        if (type === 'success') {
            setTimeout(() => {
                alertContainer.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * Cleanup al salir de la página
     */
    destroy() {
        // Destruir gráficas para liberar memoria
        if (this.reportCharts) {
            this.reportCharts.destroy();
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[ReportsController] Destroyed');
        }
    }
}
