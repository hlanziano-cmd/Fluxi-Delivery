import { BaseRepository } from './base.repository.js';

/**
 * Order Repository
 */
export class OrderRepository extends BaseRepository {
    constructor() {
        super('pedidos');
    }

    /**
     * Find all orders with delivery person information
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async findAll(options = {}) {
        try {
            let query = this.db.from(this.table).select('*');

            // Order by
            if (options.orderBy) {
                query = query.order(options.orderBy.field, {
                    ascending: options.orderBy.ascending !== false,
                });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            // Limit
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Adapt field names to match what the code expects
            const orders = (data || []).map((order) => ({
                ...order,
                // Map your field names to expected names
                cliente_nombre: order.cliente,
                cliente_telefono: order.telefono_cliente,
                cliente_direccion: order.direccion,
                valor: order.valor_pedido,
                costo_domicilio: order.valor_domicilio,
                total: parseFloat(order.valor_pedido || 0) + parseFloat(order.valor_domicilio || 0),
                fecha_pedido: order.created_at,
                observaciones: order.notas || null,
                consecutivo: order.consecutivo_dia || null,
            }));

            return orders;
        } catch (error) {
            console.error(`[${this.table}Repository] findAll failed:`, error);
            throw error;
        }
    }

    /**
     * Find orders by status
     * @param {string} status
     * @returns {Promise<Array>}
     */
    async findByStatus(status) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .eq('estado', status)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Adapt field names to match what the code expects
            const orders = (data || []).map((order) => ({
                ...order,
                cliente_nombre: order.cliente,
                cliente_telefono: order.telefono_cliente,
                cliente_direccion: order.direccion,
                valor: order.valor_pedido,
                costo_domicilio: order.valor_domicilio,
                total: parseFloat(order.valor_pedido || 0) + parseFloat(order.valor_domicilio || 0),
                fecha_pedido: order.created_at,
                observaciones: order.notas || null,
                consecutivo: order.consecutivo_dia || null,
            }));

            return orders;
        } catch (error) {
            console.error(`[${this.table}Repository] findByStatus failed:`, error);
            throw error;
        }
    }

    /**
     * Find orders by delivery person ID
     * @param {number} deliveryId
     * @param {string} status - Optional status filter
     * @returns {Promise<Array>}
     */
    async findByDeliveryId(deliveryId, status = null) {
        try {
            let query = this.db
                .from(this.table)
                .select('*')
                .eq('domiciliario_id', deliveryId);

            if (status) {
                query = query.eq('estado', status);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`[${this.table}Repository] findByDeliveryId failed:`, error);
            throw error;
        }
    }

    /**
     * Find pending orders
     * @returns {Promise<Array>}
     */
    async findPending() {
        return this.findByStatus('pendiente');
    }

    /**
     * Find active orders (pendiente, asignado, en_camino)
     * @returns {Promise<Array>}
     */
    async findActive() {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .in('estado', ['pendiente', 'asignado', 'en_camino'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Adapt field names to match what the code expects
            const orders = (data || []).map((order) => ({
                ...order,
                cliente_nombre: order.cliente,
                cliente_telefono: order.telefono_cliente,
                cliente_direccion: order.direccion,
                valor: order.valor_pedido,
                costo_domicilio: order.valor_domicilio,
                total: parseFloat(order.valor_pedido || 0) + parseFloat(order.valor_domicilio || 0),
                fecha_pedido: order.created_at,
                observaciones: order.notas || null,
                consecutivo: order.consecutivo_dia || null,
            }));

            return orders;
        } catch (error) {
            console.error(`[${this.table}Repository] findActive failed:`, error);
            throw error;
        }
    }

    /**
     * Get today's statistics
     * @returns {Promise<Object>}
     */
    async getTodayStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.db
                .from(this.table)
                .select('estado, valor_domicilio')
                .gte('created_at', today);

            if (error) throw error;

            const stats = {
                total: data.length,
                pendiente: data.filter((o) => o.estado === 'pendiente').length,
                asignado: data.filter((o) => o.estado === 'asignado').length,
                en_camino: data.filter((o) => o.estado === 'en_camino').length,
                entregado: data.filter((o) => o.estado === 'entregado').length,
                cancelado: data.filter((o) => o.estado === 'cancelado').length,
                ingresos: data
                    .filter((o) => o.estado === 'entregado')
                    .reduce((sum, o) => sum + (o.valor_domicilio || 0), 0),
            };

            return stats;
        } catch (error) {
            console.error(`[${this.table}Repository] getTodayStats failed:`, error);
            throw error;
        }
    }

    /**
     * Find orders by date range
     * @param {string} startDate - ISO date string
     * @param {string} endDate - ISO date string
     * @returns {Promise<Array>}
     */
    async findByDateRange(startDate, endDate) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`[${this.table}Repository] findByDateRange failed:`, error);
            throw error;
        }
    }

    /**
     * Assign order to delivery person
     * @param {number} orderId
     * @param {number} deliveryId
     * @returns {Promise<Object>}
     */
    async assignToDelivery(orderId, deliveryId) {
        return this.update(orderId, {
            domiciliario_id: deliveryId,
            estado: 'asignado',
        });
    }

    /**
     * Update order status
     * @param {number} orderId
     * @param {string} status
     * @returns {Promise<Object>}
     */
    async updateStatus(orderId, status) {
        const updates = { estado: status };

        // Add timestamp fields based on status
        if (status === 'en_camino') {
            updates.tiempo_inicio = Date.now();
        } else if (status === 'entregado') {
            updates.tiempo_llegada = Date.now();
        }

        return this.update(orderId, updates);
    }
}
