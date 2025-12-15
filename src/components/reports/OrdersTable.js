/**
 * Orders Table Component
 * Componente de tabla de pedidos filtrados para reportes
 */
export class OrdersTable {
    constructor() {
        this.orders = [];
    }

    /**
     * Actualizar pedidos
     * @param {Array} orders - Nuevos pedidos
     */
    updateOrders(orders) {
        this.orders = orders;
        this._refreshTable();
    }

    /**
     * Renderizar componente
     */
    render() {
        return `
            <div class="orders-table-container">
                <div class="table-header">
                    <h3>
                        <i class="fas fa-list"></i>
                        Listado de Pedidos
                        <span class="badge">${this.orders.length}</span>
                    </h3>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Domiciliario</th>
                                <th>Valor</th>
                                <th>Domicilio</th>
                                <th>Total</th>
                                <th>Método Pago</th>
                                <th>Datáfono</th>
                                <th>Estado</th>
                                <th>Voucher</th>
                            </tr>
                        </thead>
                        <tbody id="ordersTableBody">
                            ${this._renderTableRows()}
                        </tbody>
                        <tfoot>
                            <tr class="table-totals">
                                <td colspan="4"><strong>TOTALES</strong></td>
                                <td><strong>${this._formatCurrency(this._calculateTotal('valor'))}</strong></td>
                                <td><strong>${this._formatCurrency(this._calculateTotal('costo_domicilio'))}</strong></td>
                                <td><strong>${this._formatCurrency(this._calculateTotal('total'))}</strong></td>
                                <td colspan="4"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                ${
                    this.orders.length === 0
                        ? `
                    <div class="empty-state">
                        <i class="fas fa-inbox fa-3x"></i>
                        <p>No hay pedidos que coincidan con los filtros seleccionados</p>
                    </div>
                `
                        : ''
                }
            </div>
        `;
    }

    /**
     * Renderizar filas de la tabla
     * @private
     */
    _renderTableRows() {
        if (this.orders.length === 0) {
            return '';
        }

        return this.orders
            .map(
                (order) => `
            <tr>
                <td>${order.consecutivo}</td>
                <td>${this._formatDate(order.fecha_pedido)}</td>
                <td>
                    <div class="client-info">
                        <div class="client-name">${order.cliente_nombre}</div>
                        <div class="client-phone">${order.cliente_telefono}</div>
                    </div>
                </td>
                <td>${this._getDomiciliarioName(order)}</td>
                <td>${this._formatCurrency(order.valor)}</td>
                <td>${this._formatCurrency(order.costo_domicilio)}</td>
                <td><strong>${this._formatCurrency(order.total)}</strong></td>
                <td>${this._formatPaymentMethod(order.metodo_pago)}</td>
                <td>${order.datafono || '-'}</td>
                <td>${this._formatOrderStatus(order.estado)}</td>
                <td>${this._formatVoucherStatus(order.estado_voucher)}</td>
            </tr>
        `
            )
            .join('');
    }

    /**
     * Refrescar tabla
     * @private
     */
    _refreshTable() {
        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = this._renderTableRows();
        }

        // Actualizar totales
        const totalElements = document.querySelectorAll('.table-totals td strong');
        if (totalElements.length >= 3) {
            totalElements[1].textContent = this._formatCurrency(this._calculateTotal('valor'));
            totalElements[2].textContent = this._formatCurrency(
                this._calculateTotal('costo_domicilio')
            );
            totalElements[3].textContent = this._formatCurrency(this._calculateTotal('total'));
        }

        // Actualizar contador de pedidos
        const badgeEl = document.querySelector('.orders-table-container .badge');
        if (badgeEl) {
            badgeEl.textContent = this.orders.length;
        }

        // Mostrar/ocultar empty state
        const emptyState = document.querySelector('.orders-table-container .empty-state');
        if (emptyState) {
            emptyState.style.display = this.orders.length === 0 ? 'flex' : 'none';
        }
    }

    /**
     * Calcular total de una columna
     * @private
     */
    _calculateTotal(field) {
        return this.orders.reduce((sum, order) => sum + parseFloat(order[field] || 0), 0);
    }

    /**
     * Obtener nombre del domiciliario
     * @private
     */
    _getDomiciliarioName(order) {
        if (order.domiciliarios && order.domiciliarios.usuarios) {
            return order.domiciliarios.usuarios.nombre;
        }
        return '-';
    }

    /**
     * Formatear fecha
     * @private
     */
    _formatDate(date) {
        return new Date(date).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Formatear moneda
     * @private
     */
    _formatCurrency(value) {
        return `$${parseFloat(value || 0).toLocaleString('es-CO')}`;
    }

    /**
     * Formatear método de pago
     * @private
     */
    _formatPaymentMethod(method) {
        const methods = {
            efectivo: 'Efectivo',
            tarjeta: 'Tarjeta',
            transferencia: 'Transferencia',
            nequi: 'Nequi',
            daviplata: 'Daviplata',
            otro: 'Otro',
        };

        return methods[method] || '-';
    }

    /**
     * Formatear estado de pedido
     * @private
     */
    _formatOrderStatus(status) {
        const statusConfig = {
            pendiente: { label: 'Pendiente', class: 'warning' },
            asignado: { label: 'Asignado', class: 'info' },
            en_camino: { label: 'En Camino', class: 'primary' },
            entregado: { label: 'Entregado', class: 'success' },
            cancelado: { label: 'Cancelado', class: 'danger' },
        };

        const config = statusConfig[status] || { label: status, class: 'secondary' };
        return `<span class="badge badge-${config.class}">${config.label}</span>`;
    }

    /**
     * Formatear estado de voucher
     * @private
     */
    _formatVoucherStatus(status) {
        const statusConfig = {
            pendiente: { label: 'Pendiente', class: 'warning' },
            recibido: { label: 'Recibido', class: 'info' },
            verificado: { label: 'Verificado', class: 'success' },
            rechazado: { label: 'Rechazado', class: 'danger' },
        };

        const config = statusConfig[status] || { label: '-', class: 'secondary' };
        return `<span class="badge badge-${config.class}">${config.label}</span>`;
    }
}
