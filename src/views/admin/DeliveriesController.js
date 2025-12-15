import { AuthService } from '../../services/auth.service.js';
import { DeliveryService } from '../../services/delivery.service.js';
import { UserService } from '../../services/user.service.js';
import { ValidationUtil } from '../../core/utils/validation.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { Modal } from '../../components/modal/Modal.js';
import { Table } from '../../components/table/Table.js';
import { DeliveryMap } from '../../components/map/DeliveryMap.js';

/**
 * Deliveries Controller
 * Manages delivery personnel CRUD operations
 */
export class DeliveriesController {
    constructor() {
        this.authService = new AuthService();
        this.deliveryService = new DeliveryService();
        this.userService = new UserService();
        this.table = null;
        this.map = null;
        this.deliveries = [];
        this.mapUpdateInterval = null;

        this.initializeView();
    }

    /**
     * Initialize deliveries view
     */
    async initializeView() {
        try {
            const session = this.authService.getCurrentUser();
            if (!session) {
                window.location.href = '/';
                return;
            }

            this.displayUserInfo(session);
            this.initializeEvents();
            await this.loadDeliveries();
            this.initializeTable();
            await this.initializeMap();

            // Start auto-refresh for map (every 10 seconds)
            this.startMapAutoRefresh();

            if (APP_CONFIG.enableDebug) {
                console.info('[DeliveriesController] Initialized successfully');
            }
        } catch (error) {
            console.error('[DeliveriesController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar la vista de domiciliarios');
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

    getRoleLabel(rol) {
        const roles = {
            admin: 'Administrador',
            dispatcher: 'Despachador',
            domiciliario: 'Domiciliario',
            superadmin: 'Super Administrador',
        };
        return roles[rol] || rol;
    }

    /**
     * Initialize event listeners
     */
    initializeEvents() {
        const logoutBtn = document.getElementById('btn-deliveries-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        const createBtn = document.getElementById('btn-create-delivery');
        createBtn?.addEventListener('click', () => this.openCreateDeliveryModal());

        const refreshBtn = document.getElementById('btn-refresh-deliveries');
        refreshBtn?.addEventListener('click', () => this.refreshDeliveries());

        const refreshMapBtn = document.getElementById('btn-refresh-map');
        refreshMapBtn?.addEventListener('click', () => this.refreshMap());

        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

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
     * Load deliveries from service
     */
    async loadDeliveries() {
        try {
            this.deliveries = await this.deliveryService.getAllDeliveries();
            this.updateStatistics();

            if (APP_CONFIG.enableDebug) {
                console.info('[DeliveriesController] Loaded deliveries:', this.deliveries.length);
            }
        } catch (error) {
            console.error('[DeliveriesController] Error loading deliveries:', error);
            this.showAlert('danger', 'Error al cargar domiciliarios');
        }
    }

    /**
     * Update statistics cards
     */
    updateStatistics() {
        const total = this.deliveries.length;
        const active = this.deliveries.filter((d) => d.activo).length;
        const available = this.deliveries.filter(
            (d) => d.activo && d.arranque_inicial && d.arranque_inicial > 0
        ).length;

        document.getElementById('stat-total-deliveries').textContent = total;
        document.getElementById('stat-active-deliveries').textContent = active;
        document.getElementById('stat-busy-deliveries').textContent = available;
    }

    /**
     * Initialize table component
     */
    initializeTable() {
        this.table = new Table({
            containerId: 'deliveries-table-container',
            columns: [
                {
                    key: 'nombre',
                    label: 'Nombre',
                    sortable: true,
                },
                {
                    key: 'telefono',
                    label: 'Teléfono',
                    render: (value) => {
                        if (!value) return '<span class="text-muted">Sin teléfono</span>';
                        // Remove +57 for display
                        const cleanPhone = value.replace(/^\+57/, '');
                        return cleanPhone;
                    },
                },
                {
                    key: 'arranque_inicial',
                    label: 'Arranque Inicial',
                    sortable: true,
                    render: (value) =>
                        value
                            ? `$${parseFloat(value).toLocaleString('es-CO')}`
                            : '<span class="text-muted">Sin arranque</span>',
                },
                {
                    key: 'estado',
                    label: 'Estado',
                    sortable: true,
                    render: (value) => {
                        const badges = {
                            disponible:
                                '<span class="status-badge active">✓ Disponible</span>',
                            ocupado: '<span class="status-badge warning">⏳ Ocupado</span>',
                            no_disponible:
                                '<span class="status-badge inactive">✗ No Disponible</span>',
                            inactivo: '<span class="status-badge inactive">✗ Inactivo</span>',
                        };
                        return badges[value] || value;
                    },
                },
            ],
            actions: [
                {
                    name: 'edit',
                    label: 'Editar',
                    icon: '✏️',
                    variant: 'primary',
                    handler: (id, delivery) => this.openEditDeliveryModal(delivery),
                },
                {
                    name: 'delete',
                    label: 'Eliminar',
                    icon: '🗑️',
                    variant: 'danger',
                    handler: (id, delivery) => this.deleteDelivery(delivery),
                },
            ],
            data: this.deliveries,
        });

        this.table.render();
    }

    /**
     * Open create delivery modal
     */
    async openCreateDeliveryModal() {
        const formContent = this.renderCreateForm();

        const modal = Modal.open({
            title: 'Crear Nuevo Domiciliario',
            content: formContent,
            size: 'medium',
            confirmText: 'Crear Domiciliario',
            cancelText: 'Cancelar',
            onConfirm: () => this.handleCreateDelivery(modal),
        });
    }

    /**
     * Open edit delivery modal
     */
    async openEditDeliveryModal(delivery) {
        const formContent = this.renderEditForm(delivery);

        const modal = Modal.open({
            title: 'Editar Domiciliario',
            content: formContent,
            size: 'medium',
            confirmText: 'Guardar Cambios',
            cancelText: 'Cancelar',
            onConfirm: () => this.handleUpdateDelivery(modal, delivery.id),
        });
    }

    /**
     * Render create form (only name and phone)
     */
    renderCreateForm() {
        return `
            <form class="delivery-form" id="delivery-form">
                <div class="form-group">
                    <label for="nombre">Nombre Completo *</label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        placeholder="Ingrese el nombre del domiciliario"
                        required
                        autocomplete="off"
                    />
                </div>

                <div class="form-group">
                    <label for="telefono">Teléfono *</label>
                    <div class="phone-input-wrapper">
                        <span class="phone-prefix">+57</span>
                        <input
                            type="tel"
                            id="telefono"
                            name="telefono"
                            placeholder="3001234567"
                            required
                            autocomplete="off"
                            pattern="[3][0-9]{9}"
                            maxlength="10"
                        />
                    </div>
                    <small>Ingrese el número celular sin el indicativo +57</small>
                </div>
            </form>
        `;
    }

    /**
     * Render edit form (name, phone, arranque inicial, and activo checkbox)
     */
    renderEditForm(delivery) {
        // Remove +57 from phone if it exists for display
        const phoneNumber = delivery.telefono ? delivery.telefono.replace(/^\+57/, '') : '';

        return `
            <form class="delivery-form" id="delivery-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="nombre">Nombre Completo *</label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            value="${delivery.nombre || ''}"
                            placeholder="Ingrese el nombre del domiciliario"
                            required
                            autocomplete="off"
                        />
                    </div>

                    <div class="form-group">
                        <label for="telefono">Teléfono *</label>
                        <div class="phone-input-wrapper">
                            <span class="phone-prefix">+57</span>
                            <input
                                type="tel"
                                id="telefono"
                                name="telefono"
                                value="${phoneNumber}"
                                placeholder="3001234567"
                                required
                                autocomplete="off"
                                pattern="[3][0-9]{9}"
                                maxlength="10"
                            />
                        </div>
                        <small>Ingrese el número celular sin el indicativo +57</small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="arranque_inicial">Arranque Inicial (COP)</label>
                        <input
                            type="number"
                            id="arranque_inicial"
                            name="arranque_inicial"
                            value="${delivery.arranque_inicial || ''}"
                            placeholder="0"
                            min="0"
                            step="1000"
                        />
                        <small>Valor en efectivo con el que inicia el día</small>
                    </div>

                    <div class="form-group">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                id="activo"
                                name="activo"
                                ${delivery.activo ? 'checked' : ''}
                            />
                            <span>Domiciliario activo (puede recibir pedidos)</span>
                        </label>
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Handle create delivery
     */
    async handleCreateDelivery(modal) {
        try {
            const form = document.getElementById('delivery-form');
            const formData = new FormData(form);

            const nombre = formData.get('nombre')?.trim();
            let telefono = formData.get('telefono')?.trim();

            // Validate
            if (!nombre || !telefono) {
                this.showAlert('danger', 'Por favor complete todos los campos requeridos');
                return;
            }

            if (telefono.length !== 10) {
                this.showAlert('danger', 'El teléfono debe tener 10 dígitos');
                return;
            }

            if (!telefono.startsWith('3')) {
                this.showAlert('danger', 'El teléfono celular debe iniciar con 3');
                return;
            }

            // Add +57 prefix
            telefono = '+57' + telefono;

            const deliveryData = {
                nombre,
                telefono,
                arranque_inicial: 0,
                estado: 'no_disponible',
                activo: false,
            };

            // Show loading
            modal.setLoading(true);

            await this.deliveryService.createDelivery(deliveryData);

            this.showAlert('success', 'Domiciliario creado exitosamente');
            modal.close();
            await this.refreshDeliveries();
        } catch (error) {
            console.error('[DeliveriesController] Error creating delivery:', error);
            this.showAlert('danger', error.message || 'Error al crear domiciliario');
            modal.setLoading(false);
            throw error;
        }
    }

    /**
     * Handle update delivery
     */
    async handleUpdateDelivery(modal, id) {
        try {
            const form = document.getElementById('delivery-form');
            const formData = new FormData(form);

            const nombre = formData.get('nombre')?.trim();
            let telefono = formData.get('telefono')?.trim();
            const arranqueInicial = parseFloat(formData.get('arranque_inicial')) || 0;
            const activoCheckbox = document.getElementById('activo');
            const activo = activoCheckbox ? activoCheckbox.checked : false;

            // Validate
            if (!nombre || !telefono) {
                this.showAlert('danger', 'Por favor complete todos los campos requeridos');
                return;
            }

            if (telefono.length !== 10) {
                this.showAlert('danger', 'El teléfono debe tener 10 dígitos');
                return;
            }

            if (!telefono.startsWith('3')) {
                this.showAlert('danger', 'El teléfono celular debe iniciar con 3');
                return;
            }

            // Add +57 prefix
            telefono = '+57' + telefono;

            const deliveryData = {
                nombre,
                telefono,
                arranque_inicial: arranqueInicial,
                activo,
            };

            // Show loading
            modal.setLoading(true);

            await this.deliveryService.updateDelivery(id, deliveryData);

            this.showAlert('success', 'Domiciliario actualizado exitosamente');
            modal.close();
            await this.refreshDeliveries();
        } catch (error) {
            console.error('[DeliveriesController] Error updating delivery:', error);
            this.showAlert('danger', error.message || 'Error al actualizar domiciliario');
            modal.setLoading(false);
            throw error;
        }
    }

    /**
     * Toggle active status
     */
    async toggleActiveStatus(delivery) {
        const action = delivery.activo ? 'desactivar' : 'activar';
        const newStatus = !delivery.activo;

        Modal.confirm(
            `${action.charAt(0).toUpperCase() + action.slice(1)} Domiciliario`,
            `¿Estás seguro de que deseas ${action} a ${delivery.nombre}?${!newStatus ? '\n\nAl desactivarlo, no podrá recibir nuevos pedidos.' : ''}`,
            async () => {
                try {
                    // Update activo status - estado will be calculated automatically by the service
                    await this.deliveryService.updateDelivery(delivery.id, {
                        activo: newStatus,
                    });

                    this.showAlert(
                        'success',
                        `Domiciliario ${newStatus ? 'activado' : 'desactivado'} exitosamente`
                    );
                    await this.refreshDeliveries();

                    if (APP_CONFIG.enableDebug) {
                        console.info('[DeliveriesController] Delivery status toggled:', delivery.id);
                    }
                } catch (error) {
                    console.error('[DeliveriesController] Error toggling status:', error);
                    this.showAlert('danger', 'Error al cambiar estado del domiciliario');
                }
            }
        );
    }

    /**
     * Delete delivery
     */
    async deleteDelivery(delivery) {
        if (!confirm(`¿Estás seguro de eliminar al domiciliario ${delivery.nombre}?`)) {
            return;
        }

        try {
            await this.deliveryService.deleteDelivery(delivery.id);
            this.showAlert('success', 'Domiciliario eliminado exitosamente');
            await this.refreshDeliveries();
        } catch (error) {
            console.error('[DeliveriesController] Error deleting delivery:', error);
            this.showAlert('danger', 'Error al eliminar domiciliario');
        }
    }

    /**
     * Initialize map
     */
    async initializeMap() {
        try {
            this.map = new DeliveryMap('deliveries-map-container');
            await this.map.init();
            this.refreshMap();

            if (APP_CONFIG.enableDebug) {
                console.info('[DeliveriesController] Map initialized successfully');
            }
        } catch (error) {
            console.error('[DeliveriesController] Error initializing map:', error);
        }
    }

    /**
     * Refresh map with current delivery locations
     */
    async refreshMap() {
        try {
            const deliveries = await this.deliveryService.getAllDeliveries();
            if (this.map) {
                this.map.updateMarkers(deliveries);
            }
        } catch (error) {
            console.error('[DeliveriesController] Error refreshing map:', error);
        }
    }

    /**
     * Start automatic map refresh
     */
    startMapAutoRefresh() {
        // Clear any existing interval
        if (this.mapUpdateInterval) {
            clearInterval(this.mapUpdateInterval);
        }

        // Update map every 10 seconds
        this.mapUpdateInterval = setInterval(() => {
            this.refreshMap();
        }, 10000);

        if (APP_CONFIG.enableDebug) {
            console.info('[DeliveriesController] Map auto-refresh started (10s interval)');
        }
    }

    /**
     * Stop automatic map refresh
     */
    stopMapAutoRefresh() {
        if (this.mapUpdateInterval) {
            clearInterval(this.mapUpdateInterval);
            this.mapUpdateInterval = null;
        }
    }

    /**
     * Refresh deliveries
     */
    async refreshDeliveries() {
        await this.loadDeliveries();
        if (this.table) {
            this.table.updateData(this.deliveries);
        }
        // Also refresh map
        this.refreshMap();
    }

    /**
     * Handle logout
     */
    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.stopMapAutoRefresh();
            this.authService.logout();
            window.location.href = '/';
        }
    }

    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertContainer = document.getElementById('deliveries-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

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
        this.stopMapAutoRefresh();

        if (this.map) {
            this.map.destroy();
        }

        if (this.table) {
            this.table.destroy();
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[DeliveriesController] Destroyed');
        }
    }
}
