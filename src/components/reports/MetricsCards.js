/**
 * Metrics Cards Component
 * Componente de tarjetas de métricas para el dashboard de reportes
 */
export class MetricsCards {
    constructor() {
        this.metrics = {
            totalPedidos: 0,
            ingresosPorPedidos: 0,
            ingresosPorDomicilio: 0,
            tiempoPromedio: 0,
        };
    }

    /**
     * Actualizar métricas
     * @param {Object} metrics - Nuevas métricas
     */
    updateMetrics(metrics) {
        this.metrics = { ...metrics };
        this._refreshDisplay();
    }

    /**
     * Renderizar componente
     */
    render() {
        return `
            <div class="metrics-cards">
                <!-- Total de Pedidos -->
                <div class="metric-card metric-primary">
                    <div class="metric-icon">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value" data-metric="totalPedidos">
                            ${this.metrics.totalPedidos}
                        </div>
                        <div class="metric-label">Total de Pedidos</div>
                    </div>
                </div>

                <!-- Ingresos por Pedidos -->
                <div class="metric-card metric-success">
                    <div class="metric-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value" data-metric="ingresosPorPedidos">
                            $${this._formatCurrency(this.metrics.ingresosPorPedidos)}
                        </div>
                        <div class="metric-label">Ingresos por Pedidos</div>
                    </div>
                </div>

                <!-- Ingresos por Domicilio -->
                <div class="metric-card metric-info">
                    <div class="metric-icon">
                        <i class="fas fa-motorcycle"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value" data-metric="ingresosPorDomicilio">
                            $${this._formatCurrency(this.metrics.ingresosPorDomicilio)}
                        </div>
                        <div class="metric-label">Ingresos por Domicilio</div>
                    </div>
                </div>

                <!-- Tiempo Promedio -->
                <div class="metric-card metric-warning">
                    <div class="metric-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value" data-metric="tiempoPromedio">
                            ${this._formatTime(this.metrics.tiempoPromedio)}
                        </div>
                        <div class="metric-label">Tiempo Promedio de Entrega</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Refrescar display de métricas
     * @private
     */
    _refreshDisplay() {
        // Actualizar total de pedidos
        const totalPedidosEl = document.querySelector('[data-metric="totalPedidos"]');
        if (totalPedidosEl) {
            this._animateNumber(totalPedidosEl, this.metrics.totalPedidos);
        }

        // Actualizar ingresos por pedidos
        const ingresosPedidosEl = document.querySelector('[data-metric="ingresosPorPedidos"]');
        if (ingresosPedidosEl) {
            ingresosPedidosEl.textContent = `$${this._formatCurrency(this.metrics.ingresosPorPedidos)}`;
        }

        // Actualizar ingresos por domicilio
        const ingresosDomicilioEl = document.querySelector(
            '[data-metric="ingresosPorDomicilio"]'
        );
        if (ingresosDomicilioEl) {
            ingresosDomicilioEl.textContent = `$${this._formatCurrency(this.metrics.ingresosPorDomicilio)}`;
        }

        // Actualizar tiempo promedio
        const tiempoPromedioEl = document.querySelector('[data-metric="tiempoPromedio"]');
        if (tiempoPromedioEl) {
            tiempoPromedioEl.textContent = this._formatTime(this.metrics.tiempoPromedio);
        }
    }

    /**
     * Animar cambio de número
     * @private
     */
    _animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 500; // ms
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Formatear moneda
     * @private
     */
    _formatCurrency(value) {
        return parseFloat(value || 0).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    /**
     * Formatear tiempo en minutos a formato legible
     * @private
     */
    _formatTime(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)} min`;
        }

        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);

        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }

        return `${hours}h ${mins}m`;
    }
}
