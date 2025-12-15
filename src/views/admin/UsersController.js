import { AuthService } from '../../services/auth.service.js';
import { UserService } from '../../services/user.service.js';
import { ValidationUtil } from '../../core/utils/validation.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { Modal } from '../../components/modal/Modal.js';
import { Table } from '../../components/table/Table.js';

/**
 * Users Controller
 * Manages user CRUD operations
 */
export class UsersController {
    constructor() {
        this.authService = new AuthService();
        this.userService = new UserService();
        this.table = null;
        this.users = [];

        this.initializeView();
    }

    /**
     * Initialize users view
     */
    async initializeView() {
        try {
            // Check authentication
            const session = this.authService.getCurrentUser();
            if (!session) {
                window.location.href = '/';
                return;
            }

            // Display user info
            this.displayUserInfo(session);

            // Initialize events
            this.initializeEvents();

            // Load users
            await this.loadUsers();

            // Initialize table
            this.initializeTable();

            if (APP_CONFIG.enableDebug) {
                console.info('[UsersController] Initialized successfully');
            }
        } catch (error) {
            console.error('[UsersController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar la vista de usuarios');
        }
    }

    /**
     * Display user information in sidebar
     */
    displayUserInfo(session) {
        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');

        if (nameEl) nameEl.textContent = session.nombre;
        if (roleEl) roleEl.textContent = this.getRoleLabel(session.rol);
    }

    /**
     * Get role label in Spanish
     */
    getRoleLabel(rol) {
        const roles = {
            admin: 'Administrador',
            dispatcher: 'Despachador',
            domiciliario: 'Domiciliario',
        };
        return roles[rol] || rol;
    }

    /**
     * Initialize event listeners
     */
    initializeEvents() {
        // Logout button
        const logoutBtn = document.getElementById('btn-users-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Create user button
        const createBtn = document.getElementById('btn-create-user');
        createBtn?.addEventListener('click', () => this.openCreateUserModal());

        // Refresh button
        const refreshBtn = document.getElementById('btn-refresh-users');
        refreshBtn?.addEventListener('click', () => this.refreshUsers());

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (
                window.innerWidth <= 768 &&
                !e.target.closest('.sidebar') &&
                !e.target.closest('.mobile-menu-toggle')
            ) {
                sidebar?.classList.remove('open');
            }
        });
    }

    /**
     * Load users from service
     */
    async loadUsers() {
        try {
            this.users = await this.userService.getAllUsers();
            this.updateStatistics();

            if (APP_CONFIG.enableDebug) {
                console.info('[UsersController] Loaded users:', this.users.length);
            }
        } catch (error) {
            console.error('[UsersController] Error loading users:', error);
            this.showAlert('danger', 'Error al cargar usuarios');
        }
    }

    /**
     * Update statistics cards
     */
    updateStatistics() {
        const total = this.users.length;
        const active = this.users.filter((u) => u.activo).length;
        const inactive = total - active;

        document.getElementById('stat-total-users').textContent = total;
        document.getElementById('stat-active-users').textContent = active;
        document.getElementById('stat-inactive-users').textContent = inactive;
    }

    /**
     * Initialize table component
     */
    initializeTable() {
        this.table = new Table({
            containerId: 'users-table-container',
            columns: [
                {
                    key: 'nombre',
                    label: 'Nombre',
                    sortable: true,
                },
                {
                    key: 'email',
                    label: 'Email',
                    sortable: true,
                },
                {
                    key: 'telefono',
                    label: 'Teléfono',
                    render: (value) => {
                        if (!value) return '<span class="text-muted">Sin teléfono</span>';
                        const cleanPhone = value.replace(/^\+57/, '');
                        return cleanPhone;
                    },
                },
                {
                    key: 'rol',
                    label: 'Rol',
                    sortable: true,
                    render: (value) => this.getRoleLabel(value),
                },
                {
                    key: 'activo',
                    label: 'Estado',
                    sortable: true,
                    render: (value) =>
                        value
                            ? '<span class="status-badge active">Activo</span>'
                            : '<span class="status-badge inactive">Inactivo</span>',
                },
            ],
            actions: [
                {
                    name: 'edit',
                    label: 'Editar',
                    icon: '✏️',
                    variant: 'primary',
                    handler: (id, user) => this.openEditUserModal(user),
                },
                {
                    name: 'delete',
                    label: 'Eliminar',
                    icon: '🗑️',
                    variant: 'danger',
                    handler: (id, user) => this.deleteUser(user),
                },
            ],
            data: this.users,
            searchable: true,
            sortable: true,
            pagination: true,
            pageSize: 10,
            emptyMessage: 'No hay usuarios registrados',
        });

        this.table.init();
    }

    /**
     * Open create user modal
     */
    openCreateUserModal() {
        const formContent = this.getUserFormHTML();

        const modal = Modal.open({
            title: 'Crear Nuevo Usuario',
            content: formContent,
            size: 'medium',
            confirmText: 'Crear Usuario',
            cancelText: 'Cancelar',
            onConfirm: () => this.handleCreateUser(modal),
        });
    }

    /**
     * Open edit user modal
     */
    openEditUserModal(user) {
        const formContent = this.getUserFormHTML(user);

        const modal = Modal.open({
            title: 'Editar Usuario',
            content: formContent,
            size: 'medium',
            confirmText: 'Guardar Cambios',
            cancelText: 'Cancelar',
            onConfirm: () => this.handleEditUser(modal, user.id),
        });

        // Setup password change toggle
        setTimeout(() => {
            const changePasswordCheckbox = document.getElementById('user-change-password');
            const passwordFields = document.getElementById('password-fields');

            if (changePasswordCheckbox && passwordFields) {
                changePasswordCheckbox.addEventListener('change', (e) => {
                    passwordFields.style.display = e.target.checked ? 'grid' : 'none';

                    // Clear password fields when hiding
                    if (!e.target.checked) {
                        document.getElementById('user-password').value = '';
                        document.getElementById('user-password-confirm').value = '';
                    }
                });
            }
        }, 100);
    }

    /**
     * Get user form HTML
     */
    getUserFormHTML(user = null) {
        const isEdit = !!user;

        return `
            <form class="user-form" id="user-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-nombre">Nombre Completo *</label>
                        <input
                            type="text"
                            id="user-nombre"
                            name="nombre"
                            value="${user?.nombre || ''}"
                            placeholder="Ej: Juan Pérez"
                            required
                        >
                    </div>
                    <div class="form-group">
                        <label for="user-email">Email *</label>
                        <input
                            type="email"
                            id="user-email"
                            name="email"
                            value="${user?.email || ''}"
                            placeholder="ejemplo@correo.com"
                            ${isEdit ? 'disabled' : ''}
                            required
                        >
                        ${isEdit ? '<small>El email no se puede modificar</small>' : ''}
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="user-telefono">Teléfono *</label>
                        <div class="phone-input-wrapper">
                            <span class="phone-prefix">+57</span>
                            <input
                                type="tel"
                                id="user-telefono"
                                name="telefono"
                                value="${user?.telefono ? user.telefono.replace(/^\+57/, '') : ''}"
                                placeholder="3001234567"
                                required
                                pattern="[3][0-9]{9}"
                                maxlength="10"
                            >
                        </div>
                        <small>Ingrese el número celular sin el indicativo +57</small>
                    </div>
                    <div class="form-group">
                        <label for="user-rol">Rol *</label>
                        <select id="user-rol" name="rol" required>
                            <option value="">Seleccionar rol</option>
                            <option value="admin" ${user?.rol === 'admin' ? 'selected' : ''}>
                                Administrador
                            </option>
                            <option value="dispatcher" ${user?.rol === 'dispatcher' ? 'selected' : ''}>
                                Despachador
                            </option>
                            <option value="domiciliario" ${user?.rol === 'domiciliario' ? 'selected' : ''}>
                                Domiciliario
                            </option>
                        </select>
                    </div>
                </div>

                ${
                    !isEdit
                        ? `
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-password">Contraseña *</label>
                        <input
                            type="password"
                            id="user-password"
                            name="password"
                            placeholder="Mínimo 6 caracteres"
                            required
                        >
                    </div>
                    <div class="form-group">
                        <label for="user-password-confirm">Confirmar Contraseña *</label>
                        <input
                            type="password"
                            id="user-password-confirm"
                            name="password_confirm"
                            placeholder="Repetir contraseña"
                            required
                        >
                    </div>
                </div>
                `
                        : `
                <div class="form-group">
                    <label>
                        <input
                            type="checkbox"
                            id="user-change-password"
                            name="change_password"
                        >
                        Cambiar contraseña
                    </label>
                </div>
                <div class="form-row" id="password-fields" style="display: none;">
                    <div class="form-group">
                        <label for="user-password">Nueva Contraseña</label>
                        <input
                            type="password"
                            id="user-password"
                            name="password"
                            placeholder="Mínimo 6 caracteres"
                        >
                    </div>
                    <div class="form-group">
                        <label for="user-password-confirm">Confirmar Nueva Contraseña</label>
                        <input
                            type="password"
                            id="user-password-confirm"
                            name="password_confirm"
                            placeholder="Repetir contraseña"
                        >
                    </div>
                </div>
                `
                }

                <div class="form-group">
                    <label>
                        <input
                            type="checkbox"
                            id="user-activo"
                            name="activo"
                            ${user?.activo !== false ? 'checked' : ''}
                        >
                        Usuario activo (puede acceder al sistema)
                    </label>
                </div>
            </form>
        `;
    }

    /**
     * Handle create user
     */
    async handleCreateUser(modal) {
        try {
            // Get form data
            const formData = this.getFormData();

            // Validate phone number format
            if (formData.telefono.length !== 10) {
                this.showAlert('danger', 'El teléfono debe tener 10 dígitos');
                return;
            }

            if (!formData.telefono.startsWith('3')) {
                this.showAlert('danger', 'El teléfono celular debe iniciar con 3');
                return;
            }

            // Add +57 prefix to phone
            formData.telefono = '+57' + formData.telefono;

            // Validate form
            const validation = this.validateUserForm(formData);
            if (!validation.valid) {
                this.showAlert('danger', validation.message);
                return;
            }

            // Show loading
            modal.setLoading(true);

            // Create user
            await this.userService.createUser(formData);

            // Success
            this.showAlert('success', 'Usuario creado exitosamente');
            modal.close();

            // Reload users
            await this.refreshUsers();

            if (APP_CONFIG.enableDebug) {
                console.info('[UsersController] User created:', formData.email);
            }
        } catch (error) {
            console.error('[UsersController] Error creating user:', error);
            this.showAlert('danger', error.message || 'Error al crear usuario');
            modal.setLoading(false);
        }
    }

    /**
     * Handle edit user
     */
    async handleEditUser(modal, userId) {
        try {
            // Get form data
            const formData = this.getFormData();

            // Validate phone number format
            if (formData.telefono.length !== 10) {
                this.showAlert('danger', 'El teléfono debe tener 10 dígitos');
                return;
            }

            if (!formData.telefono.startsWith('3')) {
                this.showAlert('danger', 'El teléfono celular debe iniciar con 3');
                return;
            }

            // Add +57 prefix to phone
            formData.telefono = '+57' + formData.telefono;

            // Validate form (with password if changing)
            const validation = this.validateUserForm(formData, true);
            if (!validation.valid) {
                this.showAlert('danger', validation.message);
                return;
            }

            // Show loading
            modal.setLoading(true);

            // Prepare update data
            const updateData = {
                nombre: formData.nombre,
                telefono: formData.telefono,
                rol: formData.rol,
                activo: formData.activo,
            };

            // Only include password if user wants to change it
            if (formData.change_password && formData.password) {
                updateData.password = formData.password;
            }

            // Update user
            await this.userService.updateUser(userId, updateData);

            // Success
            this.showAlert('success', 'Usuario actualizado exitosamente');
            modal.close();

            // Reload users
            await this.refreshUsers();

            if (APP_CONFIG.enableDebug) {
                console.info('[UsersController] User updated:', userId);
            }
        } catch (error) {
            console.error('[UsersController] Error updating user:', error);
            this.showAlert('danger', error.message || 'Error al actualizar usuario');
            modal.setLoading(false);
        }
    }

    /**
     * Get form data
     */
    getFormData() {
        return {
            nombre: document.getElementById('user-nombre')?.value.trim(),
            email: document.getElementById('user-email')?.value.trim(),
            telefono: document.getElementById('user-telefono')?.value.trim(),
            rol: document.getElementById('user-rol')?.value,
            password: document.getElementById('user-password')?.value,
            password_confirm: document.getElementById('user-password-confirm')?.value,
            activo: document.getElementById('user-activo')?.checked,
            change_password: document.getElementById('user-change-password')?.checked || false,
        };
    }

    /**
     * Validate user form
     */
    validateUserForm(data, isEdit = false) {
        // Required fields
        if (!data.nombre || !data.email || !data.telefono || !data.rol) {
            return { valid: false, message: 'Todos los campos son obligatorios' };
        }

        // Email validation
        if (!ValidationUtil.isValidEmail(data.email)) {
            return { valid: false, message: 'El email no es válido' };
        }

        // Phone validation - should already have +57 prefix at this point
        if (!data.telefono.startsWith('+57') || data.telefono.length !== 13) {
            return { valid: false, message: 'El teléfono no es válido' };
        }

        // Password validation (only for create or if changing password in edit)
        if (!isEdit) {
            if (!data.password || data.password.length < 6) {
                return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
            }

            if (data.password !== data.password_confirm) {
                return { valid: false, message: 'Las contraseñas no coinciden' };
            }
        } else if (data.change_password) {
            // Validate password only if checkbox is checked in edit mode
            if (!data.password || data.password.length < 6) {
                return {
                    valid: false,
                    message: 'La nueva contraseña debe tener al menos 6 caracteres',
                };
            }

            if (data.password !== data.password_confirm) {
                return { valid: false, message: 'Las contraseñas no coinciden' };
            }
        }

        return { valid: true };
    }

    /**
     * Toggle user status
     */
    async toggleUserStatus(user) {
        const action = user.activo ? 'desactivar' : 'activar';
        const newStatus = !user.activo;

        Modal.confirm(
            `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
            `¿Estás seguro de que deseas ${action} a ${user.nombre}?`,
            async () => {
                try {
                    await this.userService.updateUser(user.id, { activo: newStatus });
                    this.showAlert(
                        'success',
                        `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`
                    );
                    await this.refreshUsers();

                    if (APP_CONFIG.enableDebug) {
                        console.info('[UsersController] User status toggled:', user.id);
                    }
                } catch (error) {
                    console.error('[UsersController] Error toggling user status:', error);
                    this.showAlert('danger', 'Error al cambiar el estado del usuario');
                }
            }
        );
    }

    /**
     * Delete user
     */
    async deleteUser(user) {
        const modal = Modal.confirm(
            'Eliminar Usuario',
            `¿Estás seguro de que deseas eliminar a ${user.nombre}? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    modal.setLoading(true);
                    await this.userService.deleteUser(user.id);
                    this.showAlert('success', 'Usuario eliminado exitosamente');
                    modal.close();
                    await this.refreshUsers();

                    if (APP_CONFIG.enableDebug) {
                        console.info('[UsersController] User deleted:', user.id);
                    }
                } catch (error) {
                    console.error('[UsersController] Error deleting user:', error);
                    this.showAlert('danger', 'Error al eliminar usuario');
                    modal.setLoading(false);
                }
            }
        );
    }

    /**
     * Refresh users table
     */
    async refreshUsers() {
        await this.loadUsers();
        this.table.setData(this.users);
    }

    /**
     * Handle logout
     */
    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.authService.logout();
            window.location.href = '/';
        }
    }

    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertContainer = document.getElementById('users-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                alertContainer.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * Cleanup when navigating away
     */
    destroy() {
        if (this.table) {
            this.table.destroy();
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[UsersController] Destroyed');
        }
    }
}
