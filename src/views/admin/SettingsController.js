import { AuthService } from '../../services/auth.service.js';
import { APP_CONFIG } from '../../core/config/app.config.js';

/**
 * Settings Controller
 * Manages system settings and configuration
 */
export class SettingsController {
    constructor() {
        this.authService = new AuthService();
        this.initializeView();
    }

    /**
     * Initialize settings view
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
            this.loadSettings();
            this.updateLastUpdateTime();

            if (APP_CONFIG.enableDebug) {
                console.info('[SettingsController] Initialized successfully');
            }
        } catch (error) {
            console.error('[SettingsController] Initialization failed:', error);
            this.showAlert('danger', 'Error al cargar la vista de configuración');
        }
    }

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

    initializeEvents() {
        const logoutBtn = document.getElementById('btn-settings-logout');
        logoutBtn?.addEventListener('click', () => this.handleLogout());

        const saveBtn = document.getElementById('btn-save-settings');
        saveBtn?.addEventListener('click', () => this.saveSettings());

        const resetBtn = document.getElementById('btn-reset-settings');
        resetBtn?.addEventListener('click', () => this.resetToDefaults());

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
     * Load settings from localStorage
     */
    loadSettings() {
        const resetHour = localStorage.getItem('orderResetHour') || '1';
        const resetHourSelect = document.getElementById('reset-hour');

        if (resetHourSelect) {
            resetHourSelect.value = resetHour;
        }

        if (APP_CONFIG.enableDebug) {
            console.info('[SettingsController] Loaded settings:', { resetHour });
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const resetHour = document.getElementById('reset-hour').value;

            // Save to localStorage
            localStorage.setItem('orderResetHour', resetHour);

            // Clear last reset to force new reset at configured time
            localStorage.removeItem('lastOrderReset');

            this.showAlert(
                'success',
                `Configuración guardada. El sistema se reiniciará automáticamente a las ${this.formatHour(
                    resetHour
                )} (hora Colombia).`
            );

            if (APP_CONFIG.enableDebug) {
                console.info('[SettingsController] Settings saved:', { resetHour });
            }
        } catch (error) {
            console.error('[SettingsController] Error saving settings:', error);
            this.showAlert('danger', 'Error al guardar la configuración');
        }
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        if (
            !confirm(
                '¿Estás seguro de que deseas restablecer la configuración a los valores predeterminados?'
            )
        ) {
            return;
        }

        try {
            // Default: 1 AM
            localStorage.setItem('orderResetHour', '1');
            localStorage.removeItem('lastOrderReset');

            // Update UI
            const resetHourSelect = document.getElementById('reset-hour');
            if (resetHourSelect) {
                resetHourSelect.value = '1';
            }

            this.showAlert(
                'success',
                'Configuración restablecida a valores predeterminados (1:00 AM).'
            );

            if (APP_CONFIG.enableDebug) {
                console.info('[SettingsController] Settings reset to defaults');
            }
        } catch (error) {
            console.error('[SettingsController] Error resetting settings:', error);
            this.showAlert('danger', 'Error al restablecer la configuración');
        }
    }

    /**
     * Format hour for display
     */
    formatHour(hour) {
        const h = parseInt(hour);
        if (h === 0) return '12:00 AM';
        if (h < 12) return `${h}:00 AM`;
        if (h === 12) return '12:00 PM';
        return `${h - 12}:00 PM`;
    }

    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            const now = new Date();
            lastUpdateEl.textContent = now.toLocaleString('es-CO');
        }
    }

    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            this.authService.logout();
            window.location.href = '/';
        }
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('settings-alert');
        if (!alertContainer) return;

        alertContainer.className = `alert alert-${type}`;
        alertContainer.textContent = message;
        alertContainer.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(() => {
                alertContainer.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Cleanup when navigating away
     */
    destroy() {
        if (APP_CONFIG.enableDebug) {
            console.info('[SettingsController] Destroyed');
        }
    }
}
