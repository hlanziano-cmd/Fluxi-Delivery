/**
 * Cuadre de Caja Controller
 * Manages cash register reconciliation for delivery personnel
 */
export class CuadreCajaController {
    constructor() {
        this.supabase = window.supabaseClient;
        this.deliveries = [];
        this.cuadreData = [];

        this.init();
    }

    async init() {
        try {
            await this.loadDeliveries();
            this.setupEventListeners();
            this.setDefaultDate();
        } catch (error) {
            console.error('[CuadreCajaController] Init error:', error);
            this.showAlert('danger', 'Error al inicializar el módulo');
        }
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('cuadre-fecha').value = today;
    }

    async loadDeliveries() {
        try {
            const { data, error } = await this.supabase
                .from('domiciliarios')
                .select('*')
                .eq('activo', true)
                .order('nombre');

            if (error) throw error;

            this.deliveries = data || [];
            this.populateDeliverySelect();
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
        document.getElementById('btn-calcular-cuadre').addEventListener('click', () => this.calculateCuadre());
        document.getElementById('btn-limpiar-cuadre').addEventListener('click', () => this.clearFilters());
        document.getElementById('btn-cuadre-logout').addEventListener('click', () => this.logout());
    }

    async calculateCuadre() {
        try {
            const fecha = document.getElementById('cuadre-fecha').value;
            const domiciliarioId = document.getElementById('cuadre-domiciliario').value;

            if (!fecha) {
                this.showAlert('warning', 'Por favor selecciona una fecha');
                return;
            }

            // Fetch orders for the selected date
            let query = this.supabase
                .from('pedidos')
                .select('*, domiciliarios(nombre)')
                .gte('created_at', `${fecha}T00:00:00`)
                .lte('created_at', `${fecha}T23:59:59`)
                .eq('estado', 'entregado');

            if (domiciliarioId) {
                query = query.eq('domiciliario_id', parseInt(domiciliarioId));
            }

            const { data: orders, error } = await query;

            if (error) throw error;

            // Fetch delivery starting amounts (arranque_inicial)
            let deliveryQuery = this.supabase
                .from('domiciliarios')
                .select('id, nombre, arranque_inicial');

            if (domiciliarioId) {
                deliveryQuery = deliveryQuery.eq('id', parseInt(domiciliarioId));
            }

            const { data: deliveriesData, error: deliveryError } = await deliveryQuery;

            if (deliveryError) throw deliveryError;

            // Calculate cuadre by delivery person
            const cuadreByDelivery = {};

            deliveriesData.forEach(delivery => {
                cuadreByDelivery[delivery.id] = {
                    nombre: delivery.nombre,
                    arranque: parseFloat(delivery.arranque_inicial) || 0,
                    efectivo: 0,
                    datafono: 0,
                    descargas: 0
                };
            });

            orders.forEach(order => {
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

            // TODO: Fetch descargas de caja from database if you have that table

            this.cuadreData = Object.values(cuadreByDelivery);
            this.renderCuadre();
            this.showAlert('success', 'Cuadre calculado correctamente');

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
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.classList.remove('hidden');

        setTimeout(() => {
            alertDiv.classList.add('hidden');
        }, 5000);
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('[CuadreCajaController] Logout error:', error);
        }
    }

    destroy() {
        // Cleanup if needed
        console.info('[CuadreCajaController] Destroyed');
    }
}
