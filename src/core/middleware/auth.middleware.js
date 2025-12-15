import { StorageUtil } from '../utils/storage.js';
import { APP_CONFIG } from '../config/app.config.js';

/**
 * Authentication middleware
 */
export class AuthMiddleware {
    /**
     * Validate current session
     * @returns {{valid: boolean, session?: Object, reason?: string}}
     */
    static validateSession() {
        const session = StorageUtil.getSession();

        if (!session) {
            return { valid: false, reason: 'no_session' };
        }

        // Check if session has expired
        const now = Date.now();
        const elapsed = now - session.timestamp;

        if (elapsed > APP_CONFIG.sessionDuration) {
            StorageUtil.clearSession();
            return { valid: false, reason: 'expired' };
        }

        return { valid: true, session };
    }

    /**
     * Require authentication (redirect if not authenticated)
     * @param {string} redirectTo - Path to redirect if not authenticated
     * @returns {boolean} True if authenticated
     */
    static requireAuth(redirectTo = '/login.html') {
        const { valid, reason } = this.validateSession();

        if (!valid) {
            if (APP_CONFIG.enableDebug) {
                console.warn(`[AuthMiddleware] Authentication required. Reason: ${reason}`);
            }

            // Avoid redirect loop
            if (!window.location.pathname.includes('login')) {
                window.location.href = redirectTo;
            }
            return false;
        }

        return true;
    }

    /**
     * Require specific role(s)
     * @param {string|Array<string>} allowedRoles - Role or array of roles
     * @returns {boolean} True if user has required role
     */
    static requireRole(allowedRoles) {
        const { valid, session } = this.validateSession();

        if (!valid) {
            return false;
        }

        // Convert to array if single role
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(session.rol)) {
            console.warn('[AuthMiddleware] Access denied: insufficient permissions');
            return false;
        }

        return true;
    }

    /**
     * Check if user is authenticated (without redirect)
     * @returns {boolean}
     */
    static isAuthenticated() {
        const { valid } = this.validateSession();
        return valid;
    }

    /**
     * Get current user from session
     * @returns {Object|null}
     */
    static getCurrentUser() {
        const { valid, session } = this.validateSession();
        return valid ? session : null;
    }

    /**
     * Refresh session timestamp (extend session)
     */
    static refreshSession() {
        const session = StorageUtil.getSession();
        if (session) {
            StorageUtil.setSession(session);
        }
    }
}
