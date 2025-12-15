import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { ValidationUtil } from '../core/utils/validation.js';

/**
 * Delivery Service
 */
export class DeliveryService {
    constructor() {
        this.deliveryRepo = new DeliveryRepository();
        this.orderRepo = new OrderRepository();
    }

    /**
     * Get all delivery persons
     * @returns {Promise<Array>}
     */
    async getAllDeliveries() {
        return await this.deliveryRepo.findAll({
            orderBy: { field: 'nombre', ascending: true },
        });
    }

    /**
     * Get active delivery persons today
     * @returns {Promise<Array>}
     */
    async getActiveToday() {
        return await this.deliveryRepo.findActiveToday();
    }

    /**
     * Get available delivery persons (activos con arranque inicial)
     * @returns {Promise<Array>}
     */
    async getAvailableDeliveries() {
        const allDeliveries = await this.deliveryRepo.findAll();

        // Filter: must be active AND have arranque_inicial > 0
        return allDeliveries.filter(
            (d) => d.activo && d.arranque_inicial && parseFloat(d.arranque_inicial) > 0
        );
    }

    /**
     * Get delivery person by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async getDeliveryById(id) {
        const delivery = await this.deliveryRepo.findById(id);
        if (!delivery) {
            throw new Error('Domiciliario no encontrado');
        }
        return delivery;
    }

    /**
     * Create new delivery person
     * @param {Object} deliveryData
     * @returns {Promise<Object>}
     */
    async createDelivery(deliveryData) {
        // Validate required fields
        const validation = ValidationUtil.validateRequired(deliveryData, ['nombre', 'telefono']);

        if (!validation.valid) {
            throw new Error(`Campos requeridos faltantes: ${validation.missing.join(', ')}`);
        }

        // Calculate automatic estado based on activo and arranque_inicial
        const activo = deliveryData.activo || false;
        const arranqueInicial = parseFloat(deliveryData.arranque_inicial) || 0;
        let estado = 'no_disponible';

        if (activo && arranqueInicial > 0) {
            estado = 'disponible';
        }

        // Create delivery person
        return await this.deliveryRepo.create({
            nombre: deliveryData.nombre.trim(),
            telefono: deliveryData.telefono.trim(),
            arranque_inicial: arranqueInicial,
            estado: estado,
            activo: activo,
        });
    }

    /**
     * Update delivery person
     * @param {number} id
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async updateDelivery(id, updates) {
        // Check if delivery exists
        const currentDelivery = await this.getDeliveryById(id);

        // Parse numeric fields
        if (updates.arranque_inicial !== undefined) {
            updates.arranque_inicial = parseFloat(updates.arranque_inicial) || 0;
        }

        // Calculate automatic estado based on activo and arranque_inicial
        // Use updated values if provided, otherwise keep current values
        const activo = updates.activo !== undefined ? updates.activo : currentDelivery.activo;
        const arranqueInicial =
            updates.arranque_inicial !== undefined
                ? updates.arranque_inicial
                : parseFloat(currentDelivery.arranque_inicial) || 0;

        // Check if delivery has active orders
        const activeOrders = await this.orderRepo.findByDeliveryId(id, 'en_camino');
        const hasActiveOrder = activeOrders.length > 0;

        // Determine estado automatically
        let estado = 'no_disponible';

        if (activo && arranqueInicial > 0) {
            if (hasActiveOrder) {
                estado = 'ocupado';
            } else {
                estado = 'disponible';
            }
        }

        // Set the calculated estado
        updates.estado = estado;

        return await this.deliveryRepo.update(id, updates);
    }

    /**
     * Delete delivery person
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deleteDelivery(id) {
        await this.getDeliveryById(id);
        return await this.deliveryRepo.delete(id);
    }

    /**
     * Mark delivery as active today
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async markActiveToday(id) {
        return await this.deliveryRepo.markActiveToday(id);
    }

    /**
     * Mark delivery as inactive today
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async markInactiveToday(id) {
        // Check if delivery has active orders
        const activeOrders = await this.orderRepo.findByDeliveryId(id, 'en_camino');

        if (activeOrders.length > 0) {
            throw new Error(
                'No se puede desactivar el domiciliario. Tiene pedidos en camino activos'
            );
        }

        return await this.deliveryRepo.markInactiveToday(id);
    }

    /**
     * Update delivery status
     * @param {number} id
     * @param {string} status - disponible, ocupado, inactivo
     * @returns {Promise<Object>}
     */
    async updateStatus(id, status) {
        const validStatuses = ['disponible', 'ocupado', 'inactivo'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Estado inválido. Debe ser: ${validStatuses.join(', ')}`);
        }

        return await this.deliveryRepo.updateStatus(id, status);
    }

    /**
     * Update delivery location
     * @param {number} id
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<Object>}
     */
    async updateLocation(id, latitude, longitude) {
        // Validate coordinates
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            throw new Error('Coordenadas inválidas');
        }

        if (latitude < -90 || latitude > 90) {
            throw new Error('Latitud inválida (debe estar entre -90 y 90)');
        }

        if (longitude < -180 || longitude > 180) {
            throw new Error('Longitud inválida (debe estar entre -180 y 180)');
        }

        return await this.deliveryRepo.updateLocation(id, latitude, longitude);
    }

    /**
     * Get delivery statistics
     * @param {number} id
     * @param {string} startDate - Optional
     * @param {string} endDate - Optional
     * @returns {Promise<Object>}
     */
    async getStatistics(id, startDate = null, endDate = null) {
        await this.getDeliveryById(id);
        return await this.deliveryRepo.getStatistics(id, startDate, endDate);
    }

    /**
     * Get assigned orders for delivery person
     * @param {number} id
     * @returns {Promise<Array>}
     */
    async getAssignedOrders(id) {
        return await this.orderRepo.findByDeliveryId(id, 'asignado');
    }

    /**
     * Get active order for delivery person (en_camino)
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async getActiveOrder(id) {
        const orders = await this.orderRepo.findByDeliveryId(id, 'en_camino');
        return orders.length > 0 ? orders[0] : null;
    }
}
