import { UserRepository } from '../repositories/user.repository.js';
import { StorageUtil } from '../core/utils/storage.js';
import { ValidationUtil } from '../core/utils/validation.js';

/**
 * Authentication Service
 */
export class AuthService {
    constructor() {
        this.userRepo = new UserRepository();
    }

    /**
     * Login user
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} User session data
     */
    async login(email, password) {
        // Validate input
        if (!ValidationUtil.isValidEmail(email)) {
            throw new Error('Email inválido');
        }

        if (!ValidationUtil.isNotEmpty(password)) {
            throw new Error('Contraseña requerida');
        }

        // Find user by credentials
        const user = await this.userRepo.findByCredentials(email.trim(), password.trim());

        if (!user) {
            throw new Error('Credenciales incorrectas o usuario inactivo');
        }

        // Create session
        const session = {
            userId: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            timestamp: Date.now(),
        };

        // Save session
        StorageUtil.setSession(session);

        return session;
    }

    /**
     * Logout user
     */
    logout() {
        StorageUtil.clearSession();
    }

    /**
     * Validate current session
     * @returns {Object|null} Session data if valid, null otherwise
     */
    validateSession() {
        const session = StorageUtil.getSession();

        if (!session) {
            return null;
        }

        // Check if session expired (24 hours)
        const now = Date.now();
        const SESSION_DURATION = 24 * 60 * 60 * 1000;

        if (now - session.timestamp > SESSION_DURATION) {
            this.logout();
            return null;
        }

        return session;
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.validateSession();
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.validateSession() !== null;
    }

    /**
     * Check if user has specific role
     * @param {string|Array<string>} roles
     * @returns {boolean}
     */
    hasRole(roles) {
        const session = this.validateSession();
        if (!session) return false;

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        return allowedRoles.includes(session.rol);
    }

    /**
     * Refresh session timestamp
     */
    refreshSession() {
        const session = StorageUtil.getSession();
        if (session) {
            session.timestamp = Date.now();
            StorageUtil.setSession(session);
        }
    }
}
