import { supabase } from '../core/config/supabase.config.js';

/**
 * Reports Service
 * Servicio para generar reportes y analíticas de pedidos
 */
export class ReportsService {
    /**
     * Obtener pedidos filtrados con información completa
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>}
     */
    async getFilteredOrders(filters = {}) {
        try {
            // Simple query without relations - your structure stores names directly
            let query = supabase
                .from('pedidos')
                .select('*')
                .order('created_at', { ascending: false });

            // Filtro por rango de fechas (use created_at instead of fecha_pedido)
            if (filters.fecha_inicio) {
                query = query.gte('created_at', filters.fecha_inicio);
            }
            if (filters.fecha_fin) {
                query = query.lte('created_at', filters.fecha_fin);
            }

            // Filtro por tipo de domiciliario
            if (filters.tipo_domiciliario) {
                query = query.eq('tipo_domiciliario', filters.tipo_domiciliario);
            }

            // Filtro por domiciliario específico (by name)
            if (filters.domiciliario_nombre) {
                query = query.eq('domiciliario_nombre', filters.domiciliario_nombre);
            }

            // Filtro por datáfono (numero_datafono in your structure)
            if (filters.datafono) {
                query = query.eq('numero_datafono', filters.datafono);
            }

            // Filtro por método de pago
            if (filters.metodo_pago) {
                query = query.eq('metodo_pago', filters.metodo_pago);
            }

            // Filtro por estado de voucher
            if (filters.estado_voucher) {
                query = query.eq('estado_voucher', filters.estado_voucher);
            }

            // Filtro por estado de pedido
            if (filters.estado_pedido) {
                query = query.eq('estado', filters.estado_pedido);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting filtered orders:', error);
            throw error;
        }
    }

    /**
     * Obtener métricas generales basadas en filtros
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>}
     */
    async getMetrics(filters = {}) {
        try {
            const orders = await this.getFilteredOrders(filters);

            // Total de pedidos
            const totalPedidos = orders.length;

            // Ingresos por pedidos (solo entregados)
            const pedidosEntregados = orders.filter((p) => p.estado === 'entregado');
            const ingresosPorPedidos = pedidosEntregados.reduce(
                (sum, p) => sum + parseFloat(p.valor_pedido || 0),
                0
            );

            // Ingresos por domicilio
            const ingresosPorDomicilio = pedidosEntregados.reduce(
                (sum, p) => sum + parseFloat(p.valor_domicilio || 0),
                0
            );

            // Tiempo promedio de entrega (en minutos)
            const tiempoPromedio = this._calculateAverageDeliveryTime(pedidosEntregados);

            return {
                totalPedidos,
                ingresosPorPedidos: parseFloat(ingresosPorPedidos.toFixed(2)),
                ingresosPorDomicilio: parseFloat(ingresosPorDomicilio.toFixed(2)),
                tiempoPromedio: parseFloat(tiempoPromedio.toFixed(2)),
            };
        } catch (error) {
            console.error('Error getting metrics:', error);
            throw error;
        }
    }

    /**
     * Obtener distribución de pedidos por estado
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>}
     */
    async getOrderStatusDistribution(filters = {}) {
        try {
            const orders = await this.getFilteredOrders(filters);

            const distribution = {
                pendiente: 0,
                asignado: 0,
                en_camino: 0,
                entregado: 0,
                cancelado: 0,
            };

            orders.forEach((order) => {
                if (distribution.hasOwnProperty(order.estado)) {
                    distribution[order.estado]++;
                }
            });

            return distribution;
        } catch (error) {
            console.error('Error getting order status distribution:', error);
            throw error;
        }
    }

    /**
     * Obtener distribución de ingresos por método de pago
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>}
     */
    async getIncomeByPaymentMethod(filters = {}) {
        try {
            const orders = await this.getFilteredOrders(filters);

            // Solo contar pedidos entregados
            const pedidosEntregados = orders.filter((p) => p.estado === 'entregado');

            const distribution = {};

            pedidosEntregados.forEach((order) => {
                const metodo = order.metodo_pago || 'sin_definir';
                if (!distribution[metodo]) {
                    distribution[metodo] = 0;
                }
                // Calculate total from valor_pedido + valor_domicilio
                const total =
                    parseFloat(order.valor_pedido || 0) + parseFloat(order.valor_domicilio || 0);
                distribution[metodo] += total;
            });

            // Redondear valores
            Object.keys(distribution).forEach((key) => {
                distribution[key] = parseFloat(distribution[key].toFixed(2));
            });

            return distribution;
        } catch (error) {
            console.error('Error getting income by payment method:', error);
            throw error;
        }
    }

    /**
     * Obtener ingresos por domiciliario
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>}
     */
    async getIncomeByDeliveryPerson(filters = {}) {
        try {
            const orders = await this.getFilteredOrders(filters);

            // Solo contar pedidos entregados
            const pedidosEntregados = orders.filter((p) => p.estado === 'entregado');

            const incomeMap = {};

            pedidosEntregados.forEach((order) => {
                if (order.domiciliarios && order.domiciliarios.usuarios) {
                    const domiId = order.domiciliario_id;
                    const domiNombre = order.domiciliarios.usuarios.nombre;

                    if (!incomeMap[domiId]) {
                        incomeMap[domiId] = {
                            id: domiId,
                            nombre: domiNombre,
                            totalPedidos: 0,
                            ingresosPedidos: 0,
                            ingresosDomicilio: 0,
                            totalIngresos: 0,
                        };
                    }

                    incomeMap[domiId].totalPedidos++;
                    incomeMap[domiId].ingresosPedidos += parseFloat(order.valor || 0);
                    incomeMap[domiId].ingresosDomicilio += parseFloat(order.costo_domicilio || 0);
                    incomeMap[domiId].totalIngresos += parseFloat(order.total || 0);
                }
            });

            // Convertir a array y redondear valores
            const result = Object.values(incomeMap).map((item) => ({
                ...item,
                ingresosPedidos: parseFloat(item.ingresosPedidos.toFixed(2)),
                ingresosDomicilio: parseFloat(item.ingresosDomicilio.toFixed(2)),
                totalIngresos: parseFloat(item.totalIngresos.toFixed(2)),
            }));

            // Ordenar por total de ingresos
            result.sort((a, b) => b.totalIngresos - a.totalIngresos);

            return result;
        } catch (error) {
            console.error('Error getting income by delivery person:', error);
            throw error;
        }
    }

    /**
     * Obtener lista de datáfonos únicos
     * @returns {Promise<Array>}
     */
    async getDatafonos() {
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .select('datafono')
                .not('datafono', 'is', null)
                .order('datafono');

            if (error) throw error;

            // Obtener valores únicos
            const uniqueDatafonos = [...new Set(data.map((d) => d.datafono))];
            return uniqueDatafonos.filter((d) => d && d.trim() !== '');
        } catch (error) {
            console.error('Error getting datafonos:', error);
            throw error;
        }
    }

    /**
     * Calcular tiempo promedio de entrega en minutos
     * @private
     * @param {Array} orders - Pedidos entregados
     * @returns {number}
     */
    _calculateAverageDeliveryTime(orders) {
        if (orders.length === 0) return 0;

        let totalMinutes = 0;
        let count = 0;

        orders.forEach((order) => {
            if (order.fecha_pedido && order.fecha_entrega) {
                const inicio = new Date(order.fecha_pedido);
                const fin = new Date(order.fecha_entrega);
                const minutes = (fin - inicio) / (1000 * 60); // Convertir a minutos

                if (minutes >= 0) {
                    // Validar que sea positivo
                    totalMinutes += minutes;
                    count++;
                }
            }
        });

        return count > 0 ? totalMinutes / count : 0;
    }

    /**
     * Obtener ingresos agrupados por día
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>}
     */
    async getDailyIncome(filters = {}) {
        try {
            const orders = await this.getFilteredOrders(filters);

            // Solo contar pedidos entregados
            const pedidosEntregados = orders.filter((p) => p.estado === 'entregado');

            const dailyMap = {};

            pedidosEntregados.forEach((order) => {
                // Use created_at since fecha_pedido doesn't exist in your structure
                const fecha = new Date(order.created_at).toISOString().split('T')[0];

                if (!dailyMap[fecha]) {
                    dailyMap[fecha] = {
                        fecha,
                        totalPedidos: 0,
                        ingresosPedidos: 0,
                        ingresosDomicilio: 0,
                        totalIngresos: 0,
                    };
                }

                dailyMap[fecha].totalPedidos++;
                // Use your actual field names
                dailyMap[fecha].ingresosPedidos += parseFloat(order.valor_pedido || 0);
                dailyMap[fecha].ingresosDomicilio += parseFloat(order.valor_domicilio || 0);
                dailyMap[fecha].totalIngresos +=
                    parseFloat(order.valor_pedido || 0) + parseFloat(order.valor_domicilio || 0);
            });

            // Convertir a array y redondear
            const result = Object.values(dailyMap).map((item) => ({
                ...item,
                ingresosPedidos: parseFloat(item.ingresosPedidos.toFixed(2)),
                ingresosDomicilio: parseFloat(item.ingresosDomicilio.toFixed(2)),
                totalIngresos: parseFloat(item.totalIngresos.toFixed(2)),
            }));

            // Ordenar por fecha
            result.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            return result;
        } catch (error) {
            console.error('Error getting daily income:', error);
            throw error;
        }
    }
}
