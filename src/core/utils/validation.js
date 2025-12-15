/**
 * Utility class for data validation
 */
export class ValidationUtil {
    /**
     * Validate email format
     * @param {string} email
     * @returns {boolean}
     */
    static isValidEmail(email) {
        if (!email) return false;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email.trim());
    }

    /**
     * Validate Colombian phone number
     * @param {string} phone
     * @returns {boolean}
     */
    static isValidPhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\D/g, '');
        // Colombian numbers: 10 digits or +57 followed by 10 digits
        return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('57'));
    }

    /**
     * Check if value is not empty
     * @param {any} value
     * @returns {boolean}
     */
    static isNotEmpty(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    }

    /**
     * Validate currency value
     * @param {any} value
     * @returns {boolean}
     */
    static isValidCurrency(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    }

    /**
     * Validate required fields in an object
     * @param {Object} data - Object to validate
     * @param {Array<string>} requiredFields - Array of required field names
     * @returns {{valid: boolean, missing: Array<string>}}
     */
    static validateRequired(data, requiredFields) {
        const missing = [];

        for (const field of requiredFields) {
            if (!this.isNotEmpty(data[field])) {
                missing.push(field);
            }
        }

        return {
            valid: missing.length === 0,
            missing,
        };
    }

    /**
     * Validate string length
     * @param {string} value
     * @param {number} min
     * @param {number} max
     * @returns {boolean}
     */
    static isValidLength(value, min, max) {
        if (!value) return false;
        const length = value.trim().length;
        return length >= min && length <= max;
    }

    /**
     * Validate numeric range
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {boolean}
     */
    static isInRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }
}
