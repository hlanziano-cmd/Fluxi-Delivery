import { BaseRepository } from './base.repository.js';

/**
 * Delivery Repository
 */
export class DeliveryRepository extends BaseRepository {
    constructor() {
        super('domiciliarios');
    }

    /**
     * Find all delivery persons with user information
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async findAll(options = {}) {
        try {
            let query = this.db.from(this.table).select('*');

            // Order by - try nombre if it exists, otherwise id
            if (options.orderBy) {
                query = query.order(options.orderBy.field, {
                    ascending: options.orderBy.ascending !== false,
                });
            } else {
                query = query.order('id', { ascending: true });
            }

            // Limit
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Return deliveries as-is, structure will be adapted if needed
            return data || [];
        } catch (error) {
            console.error(`[${this.table}Repository] findAll failed:`, error);
            throw error;
        }
    }

    /**
     * Find available delivery person
     * @returns {Promise<Object|null>}
     */
    async findAvailable() {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .eq('estado', 'disponible')
                .eq('activo_hoy', true)
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] findAvailable failed:`, error);
            throw error;
        }
    }

    /**
     * Find all active delivery persons today
     * @returns {Promise<Array>}
     */
    async findActiveToday() {
        return this.findWhere({ activo_hoy: true });
    }

    /**
     * Find delivery persons by status
     * @param {string} status - disponible, ocupado, inactivo
     * @returns {Promise<Array>}
     */
    async findByStatus(status) {
        return this.findWhere({ estado: status, activo_hoy: true });
    }

    /**
     * Update delivery person location
     * @param {number} id
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<Object>}
     */
    async updateLocation(id, latitude, longitude) {
        return this.update(id, {
            ubicacion_actual: `POINT(${longitude} ${latitude})`,
        });
    }

    /**
     * Update delivery person status
     * @param {number} id
     * @param {string} status
     * @returns {Promise<Object>}
     */
    async updateStatus(id, status) {
        return this.update(id, { estado: status });
    }

    /**
     * Mark delivery person as active today
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async markActiveToday(id) {
        return this.update(id, {
            activo_hoy: true,
            estado: 'disponible',
        });
    }

    /**
     * Mark delivery person as inactive today
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async markInactiveToday(id) {
        return this.update(id, {
            activo_hoy: false,
            estado: 'inactivo',
        });
    }

    /**
     * Get delivery statistics
     * @param {number} id
     * @param {string} startDate - Optional start date
     * @param {string} endDate - Optional end date
     * @returns {Promise<Object>}
     */
    async getStatistics(id, startDate = null, endDate = null) {
        try {
            let query = this.db
                .from('pedidos')
                .select('estado, valor_domicilio, created_at')
                .eq('domiciliario_id', id);

            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            const stats = {
                total: data.length,
                entregados: data.filter((o) => o.estado === 'entregado').length,
                cancelados: data.filter((o) => o.estado === 'cancelado').length,
                ingresos: data
                    .filter((o) => o.estado === 'entregado')
                    .reduce((sum, o) => sum + (o.valor_domicilio || 0), 0),
            };

            return stats;
        } catch (error) {
            console.error(`[${this.table}Repository] getStatistics failed:`, error);
            throw error;
        }
    }
}
