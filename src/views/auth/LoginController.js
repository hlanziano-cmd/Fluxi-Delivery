import { AuthService } from '../../services/auth.service.js';
import { APP_CONFIG } from '../../core/config/app.config.js';
import { router } from '../../core/router/Router.js';

/**
 * Login Controller
 */
export class LoginController {
    constructor() {
        this.authService = new AuthService();
        this.form = document.getElementById('login-form');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('login-btn');
        this.togglePasswordBtn = document.getElementById('toggle-password');

        this.initializeEvents();
        this.checkExistingSession();
    }

    /**
     * Initialize event listeners
     */
    initializeEvents() {
        // Form submit
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Toggle password visibility
        this.togglePasswordBtn?.addEventListener('click', () => this.togglePasswordVisibility());

        // Auto-focus email input
        this.emailInput?.focus();
    }

    /**
     * Check if user already has session
     */
    checkExistingSession() {
        if (this.authService.isAuthenticated()) {
            if (APP_CONFIG.enableDebug) {
                console.info('[LoginController] User already authenticated, redirecting...');
            }
            const session = this.authService.getCurrentUser();
            this.redirectAfterLogin(session.rol);
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        event.preventDefault();

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value.trim();

        // Basic validation
        if (!email || !password) {
            this.showAlert('danger', 'Por favor completa todos los campos');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            // Attempt login
            const session = await this.authService.login(email, password);

            // Success
            this.showAlert('success', `¡Bienvenido, ${session.nombre}!`);

            if (APP_CONFIG.enableDebug) {
                console.info('[LoginController] Login successful:', session);
            }

            // Redirect based on role
            setTimeout(() => {
                this.redirectAfterLogin(session.rol);
            }, 1000);
        } catch (error) {
            // Error
            console.error('[LoginController] Login failed:', error);
            this.showAlert('danger', error.message || 'Error al iniciar sesión');
            this.setLoadingState(false);
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.passwordInput.setAttribute('type', type);
        this.togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
    }

    /**
     * Set loading state
     */
    setLoadingState(isLoading) {
        if (isLoading) {
            this.loginBtn.classList.add('loading');
            this.loginBtn.disabled = true;
        } else {
            this.loginBtn.classList.remove('loading');
            this.loginBtn.disabled = false;
        }
    }

    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertContainer = document.getElementById('login-alert');

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
     * Redirect after successful login
     */
    redirectAfterLogin(rol) {
        // Redirect based on user role
        if (rol === 'domiciliario') {
            // Delivery personnel go to delivery app
            router.navigate('/delivery');
        } else {
            // Admin and dispatcher go to users module
            router.navigate('/users');
        }
    }

    /**
     * Cleanup (called when navigating away)
     */
    destroy() {
        // Remove event listeners if needed
        // Currently using arrow functions which maintain 'this' context
        if (APP_CONFIG.enableDebug) {
            console.info('[LoginController] Destroyed');
        }
    }
}
