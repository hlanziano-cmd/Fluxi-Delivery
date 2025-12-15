import { APP_CONFIG } from '../config/app.config.js';

/**
 * Utility class for managing localStorage operations
 */
export class StorageUtil {
    static SESSION_KEY = APP_CONFIG.sessionKey;

    /**
     * Save session data
     * @param {Object} data - Session data to save
     */
    static setSession(data) {
        const sessionData = {
            ...data,
            timestamp: Date.now(),
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    }

    /**
     * Get session data
     * @returns {Object|null} Session data or null if not found
     */
    static getSession() {
        try {
            const data = localStorage.getItem(this.SESSION_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[StorageUtil] Error parsing session:', error);
            return null;
        }
    }

    /**
     * Clear session data
     */
    static clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    }

    /**
     * Check if session exists
     * @returns {boolean}
     */
    static hasSession() {
        return this.getSession() !== null;
    }

    /**
     * Generic set method
     * @param {string} key
     * @param {any} value
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('[StorageUtil] Error saving to localStorage:', error);
        }
    }

    /**
     * Generic get method
     * @param {string} key
     * @returns {any|null}
     */
    static get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[StorageUtil] Error reading from localStorage:', error);
            return null;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} key
     */
    static remove(key) {
        localStorage.removeItem(key);
    }

    /**
     * Clear all localStorage
     */
    static clear() {
        localStorage.clear();
    }
}
