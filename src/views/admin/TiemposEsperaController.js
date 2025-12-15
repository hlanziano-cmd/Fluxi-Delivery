/**
 * Tiempos de Espera Controller
 * Manages delivery time analysis (travel, wait, and standby times)
 */
export class TiemposEsperaController {
    constructor() {
        this.supabase = window.supabaseClient;
        this.deliveries = [];
        this.tiemposData = [];

        this.init();
    }

    async init() {
        try {
            await this.loadDeliveries();
            this.setupEventListeners();
            this.setDefaultDates();
        } catch (error) {
            console.error('[TiemposEsperaController] Init error:', error);
            this.showAlert('danger', 'Error al inicializar el módulo');
        }
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        document.getElementById('filter-tiempos-fecha-inicio').value = weekAgo;
        document.getElementById('filter-tiempos-fecha-fin').value = today;
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
        document.getElementById('btn-buscar-tiempos').addEventListener('click', () => this.searchTiempos());
        document.getElementById('btn-limpiar-tiempos').addEventListener('click', () => this.clearFilters());
        document.getElementById('btn-tiempos-logout').addEventListener('click', () => this.logout());
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

            // Fetch orders for the selected date range
            let query = this.supabase
                .from('pedidos')
                .select('*, domiciliarios(nombre)')
                .gte('created_at', `${fechaInicio}T00:00:00`)
                .lte('created_at', `${fechaFin}T23:59:59`)
                .eq('estado', 'entregado')
                .not('tiempo_recorrido', 'is', null)
                .order('created_at', { ascending: false });

            if (domiciliarioId) {
                query = query.eq('domiciliario_id', parseInt(domiciliarioId));
            }

            const { data: orders, error } = await query;

            if (error) throw error;

            this.tiemposData = orders || [];
            this.renderTiempos();
            this.showAlert('success', `Se encontraron ${this.tiemposData.length} pedidos`);

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
                            <td>${order.consecutivo_domiciliario || '#' + order.id.substring(0, 8)}</td>
                            <td>${order.direccion}</td>
                            <td>${order.barrio || '-'}</td>
                            <td>${order.domiciliarios?.nombre || '-'}</td>
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
            console.error('[TiemposEsperaController] Logout error:', error);
        }
    }

    destroy() {
        // Cleanup if needed
        console.info('[TiemposEsperaController] Destroyed');
    }
}
