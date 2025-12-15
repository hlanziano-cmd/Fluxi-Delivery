import { ReportsService } from '../services/reports.service.js';
import { ReportFilters } from '../components/reports/ReportFilters.js';
import { MetricsCards } from '../components/reports/MetricsCards.js';
import { ReportCharts } from '../components/reports/ReportCharts.js';
import { OrdersTable } from '../components/reports/OrdersTable.js';
import { LoadingSpinner } from '../core/components/LoadingSpinner.js';

/**
 * Reports Page
 * Página del módulo de reportes y analíticas
 */
export class ReportsPage {
    constructor() {
        this.reportsService = new ReportsService();
        this.filters = null;
        this.metricsCards = new MetricsCards();
        this.reportCharts = new ReportCharts();
        this.ordersTable = new OrdersTable();
        this.isLoading = false;
    }

    /**
     * Renderizar página
     */
    async render() {
        // Crear componente de filtros
        this.reportFilters = new ReportFilters(this.handleFilterChange.bind(this));

        return `
            <div class="reports-page">
                <div class="page-header">
                    <h1>
                        <i class="fas fa-chart-line"></i>
                        Reportes y Analíticas
                    </h1>
                    <p class="page-description">
                        Análisis detallado de pedidos, ingresos y desempeño
                    </p>
                </div>

                <!-- Filtros -->
                <div class="section">
                    ${await this.reportFilters.render()}
                </div>

                <!-- Loading -->
                <div id="reportsLoading" style="display: none;">
                    ${LoadingSpinner.render('Cargando reportes...')}
                </div>

                <!-- Métricas -->
                <div class="section" id="metricsSection">
                    <h2 class="section-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Métricas Generales
                    </h2>
                    ${this.metricsCards.render()}
                </div>

                <!-- Gráficas -->
                <div class="section" id="chartsSection">
                    <h2 class="section-title">
                        <i class="fas fa-chart-bar"></i>
                        Gráficas y Distribuciones
                    </h2>
                    ${this.reportCharts.render()}
                </div>

                <!-- Tabla de Pedidos -->
                <div class="section" id="ordersTableSection">
                    <h2 class="section-title">
                        <i class="fas fa-table"></i>
                        Detalle de Pedidos
                    </h2>
                    ${this.ordersTable.render()}
                </div>
            </div>
        `;
    }

    /**
     * Adjuntar event listeners después del render
     */
    async afterRender() {
        // Adjuntar listeners de filtros
        this.reportFilters.attachEventListeners();

        // Cargar datos iniciales con filtros por defecto
        await this.loadReports(this.reportFilters.getFilters());
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
            console.error('Error loading reports:', error);
            this.showLoading(false);
            alert('Error al cargar los reportes. Por favor intente nuevamente.');
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
            loadingEl.style.display = show ? 'block' : 'none';
        }

        sectionsEls.forEach((el) => {
            if (el) {
                el.style.opacity = show ? '0.5' : '1';
                el.style.pointerEvents = show ? 'none' : 'auto';
            }
        });
    }

    /**
     * Cleanup al salir de la página
     */
    cleanup() {
        // Destruir gráficas para liberar memoria
        if (this.reportCharts) {
            this.reportCharts.destroy();
        }
    }
}
