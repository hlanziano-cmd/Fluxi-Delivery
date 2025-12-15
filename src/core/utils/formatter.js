import { APP_CONFIG } from '../config/app.config.js';

/**
 * Utility class for formatting data
 */
export class FormatterUtil {
    /**
     * Format currency (Colombian Pesos)
     * @param {number} value
     * @returns {string}
     */
    static formatCurrency(value) {
        return new Intl.NumberFormat(APP_CONFIG.currencyFormat, {
            style: 'currency',
            currency: APP_CONFIG.currency,
            minimumFractionDigits: 0,
        }).format(value || 0);
    }

    /**
     * Format phone number (Colombian format)
     * @param {string} phone
     * @returns {string}
     */
    static formatPhone(phone) {
        if (!phone) return '';

        const cleaned = ('' + phone).replace(/\D/g, '');

        // If already has +57, return as is
        if (phone.startsWith('+57')) return phone;

        // If 10 digits, add +57
        if (cleaned.length === 10) return '+57' + cleaned;

        // If 12 digits and starts with 57, add +
        if (cleaned.length === 12 && cleaned.startsWith('57')) return '+' + cleaned;

        return phone;
    }

    /**
     * Format date
     * @param {Date|string} date
     * @returns {string}
     */
    static formatDate(date) {
        if (!date) return '--';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '--';
        return d.toLocaleDateString(APP_CONFIG.currencyFormat);
    }

    /**
     * Format time
     * @param {Date|string} date
     * @returns {string}
     */
    static formatTime(date) {
        if (!date) return '--';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '--';
        return d.toLocaleTimeString(APP_CONFIG.currencyFormat, {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Format date and time
     * @param {Date|string} date
     * @returns {string}
     */
    static formatDateTime(date) {
        if (!date) return '--';
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }

    /**
     * Calculate elapsed time from timestamp
     * @param {number} timestamp
     * @returns {string}
     */
    static calculateElapsedTime(timestamp) {
        if (!timestamp) return '--';
        const elapsed = Date.now() - timestamp;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Format order status for display
     * @param {string} status
     * @returns {string}
     */
    static formatOrderStatus(status) {
        const statusMap = {
            pendiente: 'Pendiente',
            asignado: 'Asignado',
            en_camino: 'En Camino',
            entregado: 'Entregado',
            cancelado: 'Cancelado',
        };
        return statusMap[status] || status;
    }

    /**
     * Truncate text
     * @param {string} text
     * @param {number} maxLength
     * @returns {string}
     */
    static truncate(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Capitalize first letter
     * @param {string} text
     * @returns {string}
     */
    static capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
}
