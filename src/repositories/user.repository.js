import { BaseRepository } from './base.repository.js';

/**
 * User Repository
 */
export class UserRepository extends BaseRepository {
    constructor() {
        super('usuarios');
    }

    /**
     * Find user by email
     * @param {string} email
     * @returns {Promise<Object|null>}
     */
    async findByEmail(email) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] findByEmail failed:`, error);
            throw error;
        }
    }

    /**
     * Find user by phone
     * @param {string} telefono
     * @returns {Promise<Object|null>}
     */
    async findByPhone(telefono) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .eq('telefono', telefono)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] findByPhone failed:`, error);
            throw error;
        }
    }

    /**
     * Find user by credentials (email + password)
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object|null>}
     */
    async findByCredentials(email, password) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .eq('estado', 'activo')
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] findByCredentials failed:`, error);
            throw error;
        }
    }

    /**
     * Find users by role
     * @param {string} role
     * @returns {Promise<Array>}
     */
    async findByRole(role) {
        return this.findWhere({ rol: role, estado: 'activo' });
    }

    /**
     * Find active users
     * @returns {Promise<Array>}
     */
    async findActive() {
        return this.findWhere({ estado: 'activo' });
    }

    /**
     * Update user password
     * @param {number} id
     * @param {string} newPassword
     * @returns {Promise<Object>}
     */
    async updatePassword(id, newPassword) {
        return this.update(id, { password: newPassword });
    }

    /**
     * Activate user
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async activate(id) {
        return this.update(id, { estado: 'activo' });
    }

    /**
     * Deactivate user
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async deactivate(id) {
        return this.update(id, { estado: 'inactivo' });
    }
}
