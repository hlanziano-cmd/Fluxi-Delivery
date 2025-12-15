import { DeliveryService } from '../../services/delivery.service.js';
import { ReportsService } from '../../services/reports.service.js';

/**
 * Report Filters Component
 * Componente de filtros para el módulo de reportes
 */
export class ReportFilters {
    constructor(onFilterChange) {
        this.onFilterChange = onFilterChange;
        this.deliveryService = new DeliveryService();
        this.reportsService = new ReportsService();
        this.filters = this._getInitialFilters();
    }

    /**
     * Obtener filtros iniciales (último mes)
     * @private
     */
    _getInitialFilters() {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        return {
            fecha_inicio: lastMonth.toISOString().split('T')[0],
            fecha_fin: today.toISOString().split('T')[0],
            tipo_domiciliario: '',
            domiciliario_id: '',
            datafono: '',
            metodo_pago: '',
            estado_voucher: '',
            estado_pedido: '',
        };
    }

    /**
     * Renderizar componente
     */
    async render() {
        const [domiciliarios, datafonos] = await Promise.all([
            this.deliveryService.getAllDeliveries(),
            this.reportsService.getDatafonos(),
        ]);

        return `
            <div class="report-filters">
                <div class="filters-header">
                    <h3>
                        <i class="fas fa-filter"></i>
                        Filtros de Búsqueda
                    </h3>
                    <button class="btn btn-secondary btn-sm" id="btnResetFilters">
                        <i class="fas fa-redo"></i>
                        Resetear Filtros
                    </button>
                </div>

                <div class="filters-grid">
                    <!-- Fechas -->
                    <div class="filter-group">
                        <label for="fecha_inicio">
                            <i class="fas fa-calendar-alt"></i>
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            id="fecha_inicio"
                            name="fecha_inicio"
                            value="${this.filters.fecha_inicio}"
                            class="form-control"
                        />
                    </div>

                    <div class="filter-group">
                        <label for="fecha_fin">
                            <i class="fas fa-calendar-alt"></i>
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            id="fecha_fin"
                            name="fecha_fin"
                            value="${this.filters.fecha_fin}"
                            class="form-control"
                        />
                    </div>

                    <!-- Tipo de Domiciliario -->
                    <div class="filter-group">
                        <label for="tipo_domiciliario">
                            <i class="fas fa-user-tag"></i>
                            Tipo Domiciliario
                        </label>
                        <select
                            id="tipo_domiciliario"
                            name="tipo_domiciliario"
                            class="form-control"
                        >
                            <option value="">Todos</option>
                            <option value="propio" ${this.filters.tipo_domiciliario === 'propio' ? 'selected' : ''}>Propio</option>
                            <option value="externo" ${this.filters.tipo_domiciliario === 'externo' ? 'selected' : ''}>Externo</option>
                        </select>
                    </div>

                    <!-- Domiciliario -->
                    <div class="filter-group">
                        <label for="domiciliario_id">
                            <i class="fas fa-motorcycle"></i>
                            Domiciliario
                        </label>
                        <select
                            id="domiciliario_id"
                            name="domiciliario_id"
                            class="form-control"
                        >
                            <option value="">Todos</option>
                            ${domiciliarios
                                .map(
                                    (d) => `
                                <option value="${d.id}" ${this.filters.domiciliario_id === d.id ? 'selected' : ''}>
                                    ${d.nombre}
                                </option>
                            `
                                )
                                .join('')}
                        </select>
                    </div>

                    <!-- Datáfono -->
                    <div class="filter-group">
                        <label for="datafono">
                            <i class="fas fa-credit-card"></i>
                            Datáfono
                        </label>
                        <select
                            id="datafono"
                            name="datafono"
                            class="form-control"
                        >
                            <option value="">Todos</option>
                            ${datafonos
                                .map(
                                    (d) => `
                                <option value="${d}" ${this.filters.datafono === d ? 'selected' : ''}>
                                    ${d}
                                </option>
                            `
                                )
                                .join('')}
                        </select>
                    </div>

                    <!-- Método de Pago -->
                    <div class="filter-group">
                        <label for="metodo_pago">
                            <i class="fas fa-money-bill-wave"></i>
                            Método de Pago
                        </label>
                        <select
                            id="metodo_pago"
                            name="metodo_pago"
                            class="form-control"
                        >
                            <option value="">Todos</option>
                            <option value="efectivo" ${this.filters.metodo_pago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                            <option value="tarjeta" ${this.filters.metodo_pago === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                            <option value="transferencia" ${this.filters.metodo_pago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                            <option value="nequi" ${this.filters.metodo_pago === 'nequi' ? 'selected' : ''}>Nequi</option>
                            <option value="daviplata" ${this.filters.metodo_pago === 'daviplata' ? 'selected' : ''}>Daviplata</option>
                            <option value="otro" ${this.filters.metodo_pago === 'otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>

                    <!-- Estado Voucher -->
                    <div class="filter-group">
                        <label for="estado_voucher">
                            <i class="fas fa-receipt"></i>
                            Estado Voucher
                        </label>
                        <select
                            id="estado_voucher"
                            name="estado_voucher"
                            class="form-control"
                        >
                            <option value="">Todos</option>
                            <option value="pendiente" ${this.filters.estado_voucher === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="recibido" ${this.filters.estado_voucher === 'recibido' ? 'selected' : ''}>Recibido</option>
                            <option value="verificado" ${this.filters.estado_voucher === 'verificado' ? 'selected' : ''}>Verificado</option>
                            <option value="rechazado" ${this.filters.estado_voucher === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                        </select>
                    </div>

                    <!-- Estado Pedido -->
                    <div class="filter-group">
                        <label for="estado_pedido">
                            <i class="fas fa-tasks"></i>
                            Estado Pedido
                        </label>
                        <select
                            id="estado_pedido"
                            name="estado_pedido"
                            class="form-control"
                        >
                            <option value="">Todos</option>
                            <option value="pendiente" ${this.filters.estado_pedido === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="asignado" ${this.filters.estado_pedido === 'asignado' ? 'selected' : ''}>Asignado</option>
                            <option value="en_camino" ${this.filters.estado_pedido === 'en_camino' ? 'selected' : ''}>En Camino</option>
                            <option value="entregado" ${this.filters.estado_pedido === 'entregado' ? 'selected' : ''}>Entregado</option>
                            <option value="cancelado" ${this.filters.estado_pedido === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                </div>

                <div class="filters-actions">
                    <button class="btn btn-primary" id="btnApplyFilters">
                        <i class="fas fa-search"></i>
                        Aplicar Filtros
                    </button>
                    <button class="btn btn-success" id="btnExportExcel">
                        <i class="fas fa-file-excel"></i>
                        Exportar a Excel
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Botón aplicar filtros
        document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
            this._applyFilters();
        });

        // Botón resetear filtros
        document.getElementById('btnResetFilters')?.addEventListener('click', () => {
            this._resetFilters();
        });

        // Botón exportar Excel
        document.getElementById('btnExportExcel')?.addEventListener('click', () => {
            this._exportToExcel();
        });

        // Auto-aplicar filtros al cambiar fechas
        document.getElementById('fecha_inicio')?.addEventListener('change', () => {
            this._applyFilters();
        });

        document.getElementById('fecha_fin')?.addEventListener('change', () => {
            this._applyFilters();
        });
    }

    /**
     * Aplicar filtros
     * @private
     */
    _applyFilters() {
        // Obtener valores de los filtros
        this.filters = {
            fecha_inicio: document.getElementById('fecha_inicio').value,
            fecha_fin: document.getElementById('fecha_fin').value,
            tipo_domiciliario: document.getElementById('tipo_domiciliario').value,
            domiciliario_id: document.getElementById('domiciliario_id').value,
            datafono: document.getElementById('datafono').value,
            metodo_pago: document.getElementById('metodo_pago').value,
            estado_voucher: document.getElementById('estado_voucher').value,
            estado_pedido: document.getElementById('estado_pedido').value,
        };

        // Notificar cambio de filtros
        if (this.onFilterChange) {
            this.onFilterChange(this.filters);
        }
    }

    /**
     * Resetear filtros
     * @private
     */
    async _resetFilters() {
        this.filters = this._getInitialFilters();

        // Re-renderizar
        const container = document.querySelector('.report-filters').parentElement;
        container.innerHTML = await this.render();
        this.attachEventListeners();

        // Aplicar filtros reseteados
        if (this.onFilterChange) {
            this.onFilterChange(this.filters);
        }
    }

    /**
     * Exportar a Excel
     * @private
     */
    async _exportToExcel() {
        try {
            const orders = await this.reportsService.getFilteredOrders(this.filters);

            // Preparar datos para Excel
            const excelData = orders.map((order) => ({
                Consecutivo: order.consecutivo,
                Fecha: new Date(order.fecha_pedido).toLocaleString('es-CO'),
                Cliente: order.cliente_nombre,
                Teléfono: order.cliente_telefono,
                Dirección: order.cliente_direccion,
                Domiciliario:
                    order.domiciliarios?.usuarios?.nombre || 'Sin asignar',
                'Valor Pedido': `$${parseFloat(order.valor || 0).toLocaleString('es-CO')}`,
                'Costo Domicilio': `$${parseFloat(order.costo_domicilio || 0).toLocaleString('es-CO')}`,
                Total: `$${parseFloat(order.total || 0).toLocaleString('es-CO')}`,
                'Método Pago': order.metodo_pago || 'N/A',
                Datáfono: order.datafono || 'N/A',
                'Estado Voucher': order.estado_voucher || 'N/A',
                Estado: order.estado,
            }));

            // Convertir a CSV (simple)
            const csv = this._convertToCSV(excelData);

            // Descargar
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute(
                'download',
                `reporteventuras-${new Date().toISOString().split('T')[0]}.csv`
            );
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error al exportar. Por favor intente nuevamente.');
        }
    }

    /**
     * Convertir datos a CSV
     * @private
     */
    _convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Headers
        csvRows.push(headers.join(','));

        // Rows
        for (const row of data) {
            const values = headers.map((header) => {
                const value = row[header] || '';
                // Escapar comillas y envolver en comillas si contiene comas
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Obtener filtros actuales
     */
    getFilters() {
        return { ...this.filters };
    }
}
