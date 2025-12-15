import { OrderRepository } from '../repositories/order.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { ValidationUtil } from '../core/utils/validation.js';

/**
 * Order Service
 */
export class OrderService {
    constructor() {
        this.orderRepo = new OrderRepository();
        this.deliveryRepo = new DeliveryRepository();
    }

    /**
     * Get all orders
     * @returns {Promise<Array>}
     */
    async getAllOrders() {
        return await this.orderRepo.findAll({
            orderBy: { field: 'created_at', ascending: false },
        });
    }

    /**
     * Get active orders
     * @returns {Promise<Array>}
     */
    async getActiveOrders() {
        return await this.orderRepo.findActive();
    }

    /**
     * Get pending orders
     * @returns {Promise<Array>}
     */
    async getPendingOrders() {
        return await this.orderRepo.findPending();
    }

    /**
     * Get order by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async getOrderById(id) {
        const order = await this.orderRepo.findById(id);
        if (!order) {
            throw new Error('Pedido no encontrado');
        }
        return order;
    }

    /**
     * Get orders by delivery person
     * @param {number} deliveryId
     * @param {string} status - Optional status filter
     * @returns {Promise<Array>}
     */
    async getOrdersByDelivery(deliveryId, status = null) {
        return await this.orderRepo.findByDeliveryId(deliveryId, status);
    }

    /**
     * Get today's statistics
     * @returns {Promise<Object>}
     */
    async getTodayStats() {
        return await this.orderRepo.getTodayStats();
    }

    /**
     * Create new order
     * @param {Object} orderData
     * @returns {Promise<Object>}
     */
    async createOrder(orderData) {
        // Validate required fields
        const validation = ValidationUtil.validateRequired(orderData, [
            'cliente',
            'telefono_cliente',
            'direccion',
            'valor_domicilio',
        ]);

        if (!validation.valid) {
            throw new Error(`Campos requeridos faltantes: ${validation.missing.join(', ')}`);
        }

        // Validate phone
        if (!ValidationUtil.isValidPhone(orderData.telefono_cliente)) {
            throw new Error('Número de teléfono inválido');
        }

        // Validate currency
        if (!ValidationUtil.isValidCurrency(orderData.valor_domicilio)) {
            throw new Error('Valor de domicilio inválido');
        }

        // Create order with your database field names
        const newOrder = await this.orderRepo.create({
            cliente: orderData.cliente.trim(),
            telefono_cliente: orderData.telefono_cliente.trim(),
            direccion: orderData.direccion.trim(),
            valor_pedido: parseFloat(orderData.valor_pedido || 0),
            valor_domicilio: parseFloat(orderData.valor_domicilio),
            metodo_pago: orderData.metodo_pago || 'efectivo',
            tipo_domiciliario: orderData.tipo_domiciliario || 'propio',
            numero_datafono: orderData.numero_datafono || null,
            notas: orderData.notas?.trim() || '',
            barrio: orderData.barrio?.trim() || null,
            consecutivo_dia: orderData.consecutivo_dia || null,
            estado: 'pendiente',
            estado_voucher: 'pendiente',
        });

        // Try to auto-assign to available delivery person
        try {
            await this.autoAssignOrder(newOrder.id);
        } catch (error) {
            console.warn('[OrderService] Auto-assign failed:', error.message);
            // Not critical, order stays pending
        }

        return newOrder;
    }

    /**
     * Update order
     * @param {number} id
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async updateOrder(id, updates) {
        // Check if order exists
        await this.getOrderById(id);

        // Validate phone if provided
        if (updates.telefono_cliente && !ValidationUtil.isValidPhone(updates.telefono_cliente)) {
            throw new Error('Número de teléfono inválido');
        }

        // Validate currency if provided
        if (updates.valor_domicilio && !ValidationUtil.isValidCurrency(updates.valor_domicilio)) {
            throw new Error('Valor de domicilio inválido');
        }

        // Trim string fields
        if (updates.cliente) updates.cliente = updates.cliente.trim();
        if (updates.telefono_cliente) updates.telefono_cliente = updates.telefono_cliente.trim();
        if (updates.direccion) updates.direccion = updates.direccion.trim();
        if (updates.notas) updates.notas = updates.notas.trim();
        if (updates.barrio) updates.barrio = updates.barrio.trim();

        return await this.orderRepo.update(id, updates);
    }

    /**
     * Assign order to delivery person
     * @param {number} orderId
     * @param {number} deliveryId
     * @returns {Promise<Object>}
     */
    async assignOrder(orderId, deliveryId) {
        // Verify order exists
        await this.getOrderById(orderId);

        // Verify delivery person exists
        const delivery = await this.deliveryRepo.findById(deliveryId);
        if (!delivery) {
            throw new Error('Domiciliario no encontrado');
        }

        // Assign order
        const order = await this.orderRepo.assignToDelivery(orderId, deliveryId);

        // Update delivery person status to ocupado
        await this.deliveryRepo.updateStatus(deliveryId, 'ocupado');

        return order;
    }

    /**
     * Auto-assign order to available delivery person
     * @param {number} orderId
     * @returns {Promise<Object|null>}
     */
    async autoAssignOrder(orderId) {
        const availableDelivery = await this.deliveryRepo.findAvailable();

        if (!availableDelivery) {
            throw new Error('No hay domiciliarios disponibles');
        }

        return await this.assignOrder(orderId, availableDelivery.id);
    }

    /**
     * Update order status
     * @param {number} orderId
     * @param {string} status
     * @returns {Promise<Object>}
     */
    async updateStatus(orderId, status) {
        const order = await this.getOrderById(orderId);

        // If marking as delivered or cancelled, free up delivery person
        if ((status === 'entregado' || status === 'cancelado') && order.domiciliario_id) {
            await this.deliveryRepo.updateStatus(order.domiciliario_id, 'disponible');
        }

        return await this.orderRepo.updateStatus(orderId, status);
    }

    /**
     * Cancel order
     * @param {number} orderId
     * @returns {Promise<Object>}
     */
    async cancelOrder(orderId) {
        return await this.updateStatus(orderId, 'cancelado');
    }

    /**
     * Delete order
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deleteOrder(id) {
        await this.getOrderById(id);
        return await this.orderRepo.delete(id);
    }
}
