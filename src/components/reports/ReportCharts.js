import {
    Chart,
    DoughnutController,
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from 'chart.js';

// Registrar componentes de Chart.js
Chart.register(
    DoughnutController,
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
);

/**
 * Report Charts Component
 * Componente de gráficas para el módulo de reportes
 */
export class ReportCharts {
    constructor() {
        this.charts = {
            orderStatus: null,
            incomeDistribution: null,
            incomeValue: null,
        };
    }

    /**
     * Renderizar contenedores de gráficas
     */
    render() {
        return `
            <div class="charts-container">
                <!-- Estado de Pedidos -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>
                            <i class="fas fa-chart-pie"></i>
                            Estado de Pedidos
                        </h3>
                    </div>
                    <div class="chart-body">
                        <canvas id="chartOrderStatus"></canvas>
                    </div>
                </div>

                <!-- Distribución de Ingresos -->
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>
                            <i class="fas fa-chart-pie"></i>
                            Distribución de Ingresos por Método de Pago
                        </h3>
                    </div>
                    <div class="chart-body">
                        <canvas id="chartIncomeDistribution"></canvas>
                    </div>
                </div>

                <!-- Valor de Ingresos -->
                <div class="chart-card chart-wide">
                    <div class="chart-header">
                        <h3>
                            <i class="fas fa-chart-bar"></i>
                            Valor de Ingresos por Día
                        </h3>
                    </div>
                    <div class="chart-body">
                        <canvas id="chartIncomeValue"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Inicializar gráficas con datos
     * @param {Object} data - Datos para las gráficas
     */
    initCharts(data) {
        this._createOrderStatusChart(data.orderStatus);
        this._createIncomeDistributionChart(data.incomeDistribution);
        this._createIncomeValueChart(data.dailyIncome);
    }

    /**
     * Actualizar gráficas con nuevos datos
     * @param {Object} data - Nuevos datos
     */
    updateCharts(data) {
        if (data.orderStatus) {
            this._updateChart(this.charts.orderStatus, data.orderStatus, 'doughnut');
        }

        if (data.incomeDistribution) {
            this._updateChart(
                this.charts.incomeDistribution,
                data.incomeDistribution,
                'doughnut'
            );
        }

        if (data.dailyIncome) {
            this._updateChart(this.charts.incomeValue, data.dailyIncome, 'bar');
        }
    }

    /**
     * Crear gráfica de estado de pedidos
     * @private
     */
    _createOrderStatusChart(data) {
        const ctx = document.getElementById('chartOrderStatus');
        if (!ctx) return;

        // Destruir gráfica anterior si existe
        if (this.charts.orderStatus) {
            this.charts.orderStatus.destroy();
        }

        const labels = {
            pendiente: 'Pendiente',
            asignado: 'Asignado',
            en_camino: 'En Camino',
            entregado: 'Entregado',
            cancelado: 'Cancelado',
        };

        const backgroundColor = {
            pendiente: '#ffc107',
            asignado: '#17a2b8',
            en_camino: '#007bff',
            entregado: '#28a745',
            cancelado: '#dc3545',
        };

        const chartData = Object.keys(data).map((key) => data[key]);
        const chartLabels = Object.keys(data).map((key) => labels[key] || key);
        const chartColors = Object.keys(data).map((key) => backgroundColor[key]);

        this.charts.orderStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        data: chartData,
                        backgroundColor: chartColors,
                        borderWidth: 2,
                        borderColor: '#fff',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                            },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Crear gráfica de distribución de ingresos
     * @private
     */
    _createIncomeDistributionChart(data) {
        const ctx = document.getElementById('chartIncomeDistribution');
        if (!ctx) return;

        // Destruir gráfica anterior si existe
        if (this.charts.incomeDistribution) {
            this.charts.incomeDistribution.destroy();
        }

        const labels = {
            efectivo: 'Efectivo',
            tarjeta: 'Tarjeta',
            transferencia: 'Transferencia',
            nequi: 'Nequi',
            daviplata: 'Daviplata',
            otro: 'Otro',
            sin_definir: 'Sin Definir',
        };

        const backgroundColor = {
            efectivo: '#28a745',
            tarjeta: '#007bff',
            transferencia: '#17a2b8',
            nequi: '#e83e8c',
            daviplata: '#fd7e14',
            otro: '#6c757d',
            sin_definir: '#ffc107',
        };

        const chartData = Object.keys(data).map((key) => data[key]);
        const chartLabels = Object.keys(data).map((key) => labels[key] || key);
        const chartColors = Object.keys(data).map((key) => backgroundColor[key]);

        this.charts.incomeDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        data: chartData,
                        backgroundColor: chartColors,
                        borderWidth: 2,
                        borderColor: '#fff',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                            },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: $${value.toLocaleString('es-CO')}`;
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Crear gráfica de valor de ingresos
     * @private
     */
    _createIncomeValueChart(data) {
        const ctx = document.getElementById('chartIncomeValue');
        if (!ctx) return;

        // Destruir gráfica anterior si existe
        if (this.charts.incomeValue) {
            this.charts.incomeValue.destroy();
        }

        const labels = data.map((item) =>
            new Date(item.fecha).toLocaleDateString('es-CO', {
                month: 'short',
                day: 'numeric',
            })
        );
        const ingresosPedidos = data.map((item) => item.ingresosPedidos);
        const ingresosDomicilio = data.map((item) => item.ingresosDomicilio);
        const totalIngresos = data.map((item) => item.totalIngresos);

        this.charts.incomeValue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos Pedidos',
                        data: ingresosPedidos,
                        backgroundColor: '#007bff',
                        borderColor: '#0056b3',
                        borderWidth: 1,
                    },
                    {
                        label: 'Ingresos Domicilio',
                        data: ingresosDomicilio,
                        backgroundColor: '#28a745',
                        borderColor: '#1e7e34',
                        borderWidth: 1,
                    },
                    {
                        label: 'Total Ingresos',
                        data: totalIngresos,
                        backgroundColor: '#17a2b8',
                        borderColor: '#117a8b',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        grid: {
                            display: false,
                        },
                    },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '$' + value.toLocaleString('es-CO');
                            },
                        },
                    },
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                            },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: $${value.toLocaleString('es-CO')}`;
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Actualizar gráfica existente con nuevos datos
     * @private
     */
    _updateChart(chart, data, type) {
        if (!chart) return;

        if (type === 'doughnut') {
            const chartData = Object.values(data);
            chart.data.datasets[0].data = chartData;
        } else if (type === 'bar') {
            const labels = data.map((item) =>
                new Date(item.fecha).toLocaleDateString('es-CO', {
                    month: 'short',
                    day: 'numeric',
                })
            );
            const ingresosPedidos = data.map((item) => item.ingresosPedidos);
            const ingresosDomicilio = data.map((item) => item.ingresosDomicilio);
            const totalIngresos = data.map((item) => item.totalIngresos);

            chart.data.labels = labels;
            chart.data.datasets[0].data = ingresosPedidos;
            chart.data.datasets[1].data = ingresosDomicilio;
            chart.data.datasets[2].data = totalIngresos;
        }

        chart.update();
    }

    /**
     * Destruir todas las gráficas
     */
    destroy() {
        Object.values(this.charts).forEach((chart) => {
            if (chart) {
                chart.destroy();
            }
        });

        this.charts = {
            orderStatus: null,
            incomeDistribution: null,
            incomeValue: null,
        };
    }
}
