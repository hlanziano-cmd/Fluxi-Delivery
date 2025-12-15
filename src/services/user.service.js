import { UserRepository } from '../repositories/user.repository.js';
import { ValidationUtil } from '../core/utils/validation.js';

/**
 * User Service
 */
export class UserService {
    constructor() {
        this.userRepo = new UserRepository();
    }

    /**
     * Get all users (excluding superadmins)
     * @returns {Promise<Array>}
     */
    async getAllUsers() {
        const allUsers = await this.userRepo.findAll({
            orderBy: { field: 'nombre', ascending: true },
        });

        // Filter out superadmins from user management
        return allUsers.filter(user => user.rol !== 'superadmin');
    }

    /**
     * Get active users
     * @returns {Promise<Array>}
     */
    async getActiveUsers() {
        return await this.userRepo.findActive();
    }

    /**
     * Get user by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async getUserById(id) {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        return user;
    }

    /**
     * Get users by role
     * @param {string} role
     * @returns {Promise<Array>}
     */
    async getUsersByRole(role) {
        return await this.userRepo.findByRole(role);
    }

    /**
     * Create new user
     * @param {Object} userData
     * @returns {Promise<Object>}
     */
    async createUser(userData) {
        // Validate required fields
        const validation = ValidationUtil.validateRequired(userData, [
            'nombre',
            'email',
            'telefono',
            'password',
            'rol',
        ]);

        if (!validation.valid) {
            throw new Error(`Campos requeridos faltantes: ${validation.missing.join(', ')}`);
        }

        // Validate email
        if (!ValidationUtil.isValidEmail(userData.email)) {
            throw new Error('Email inválido');
        }

        // Check if email already exists
        const existingUser = await this.userRepo.findByEmail(userData.email);
        if (existingUser) {
            throw new Error('El email ya está registrado');
        }

        // Check if phone already exists
        const existingPhone = await this.userRepo.findByPhone(userData.telefono);
        if (existingPhone) {
            throw new Error('El teléfono ya está registrado');
        }

        // Create user
        const newUser = await this.userRepo.create({
            nombre: userData.nombre.trim(),
            email: userData.email.trim().toLowerCase(),
            telefono: userData.telefono.trim(),
            password: userData.password.trim(),
            rol: userData.rol,
            activo: userData.activo !== undefined ? userData.activo : true,
        });

        return newUser;
    }

    /**
     * Update user
     * @param {number} id
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async updateUser(id, updates) {
        // Check if user exists
        await this.getUserById(id);

        // If updating email, validate and check uniqueness
        if (updates.email) {
            if (!ValidationUtil.isValidEmail(updates.email)) {
                throw new Error('Email inválido');
            }

            const existingUser = await this.userRepo.findByEmail(updates.email);
            if (existingUser && existingUser.id !== id) {
                throw new Error('El email ya está registrado');
            }

            updates.email = updates.email.trim().toLowerCase();
        }

        // If updating phone, check uniqueness
        if (updates.telefono) {
            const existingPhone = await this.userRepo.findByPhone(updates.telefono);
            if (existingPhone && existingPhone.id !== id) {
                throw new Error('El teléfono ya está registrado');
            }

            updates.telefono = updates.telefono.trim();
        }

        // Trim string fields
        if (updates.nombre) updates.nombre = updates.nombre.trim();
        if (updates.password) updates.password = updates.password.trim();

        return await this.userRepo.update(id, updates);
    }

    /**
     * Delete user
     * @param {number} id
     * @returns {Promise<boolean>}
     */
    async deleteUser(id) {
        // Check if user exists
        await this.getUserById(id);

        return await this.userRepo.delete(id);
    }

    /**
     * Activate user
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async activateUser(id) {
        return await this.userRepo.activate(id);
    }

    /**
     * Deactivate user
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async deactivateUser(id) {
        return await this.userRepo.deactivate(id);
    }

    /**
     * Change user password
     * @param {number} id
     * @param {string} newPassword
     * @returns {Promise<Object>}
     */
    async changePassword(id, newPassword) {
        if (!ValidationUtil.isNotEmpty(newPassword)) {
            throw new Error('La contraseña no puede estar vacía');
        }

        return await this.userRepo.updatePassword(id, newPassword.trim());
    }
}
