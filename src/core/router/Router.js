import { APP_CONFIG } from '../config/app.config.js';

/**
 * Simple SPA Router
 */
export class Router {
    constructor() {
        this.routes = new Map();
        this.currentController = null;
        this.currentPath = null;
        this.appContainer = null;
    }

    /**
     * Register a route
     * @param {string} path - Route path
     * @param {Object} options - Route options
     * @param {Function} options.controller - Controller class
     * @param {string} options.view - Path to HTML view
     * @param {Function} [options.middleware] - Middleware function
     */
    register(path, options) {
        this.routes.set(path, options);
        if (APP_CONFIG.enableDebug) {
            console.info(`[Router] Route registered: ${path}`);
        }
    }

    /**
     * Navigate to a route
     * @param {string} path - Path to navigate to
     * @param {boolean} pushState - Whether to push to browser history
     */
    async navigate(path, pushState = true) {
        if (APP_CONFIG.enableDebug) {
            console.info(`[Router] Navigating to: ${path}`);
        }

        // Destroy previous controller
        if (this.currentController?.destroy) {
            this.currentController.destroy();
        }

        // Get route configuration
        const route = this.routes.get(path);
        if (!route) {
            console.error(`[Router] Route not found: ${path}`);
            await this.navigate('/404', false);
            return;
        }

        // Run middleware if exists
        if (route.middleware) {
            const canAccess = route.middleware();
            if (!canAccess) {
                console.warn(`[Router] Access denied to: ${path}`);
                return;
            }
        }

        try {
            // Load view HTML
            const html = await this.loadView(route.view);

            // Update app container
            if (!this.appContainer) {
                this.appContainer = document.getElementById('app');
            }

            if (this.appContainer) {
                this.appContainer.innerHTML = html;
            } else {
                console.error('[Router] App container not found');
                return;
            }

            // Initialize controller
            const ControllerClass = route.controller;
            this.currentController = new ControllerClass();

            // Update browser history
            if (pushState && path !== window.location.pathname) {
                window.history.pushState({ path }, '', path);
            }

            this.currentPath = path;

            // Update active menu items
            this.updateActiveMenu(path);
        } catch (error) {
            console.error(`[Router] Error loading route ${path}:`, error);
            this.showError('Error al cargar la página');
        }
    }

    /**
     * Load HTML view
     * @param {string} viewPath - Path to view file
     * @returns {Promise<string>}
     */
    async loadView(viewPath) {
        try {
            const response = await fetch(viewPath);
            if (!response.ok) {
                throw new Error(`Failed to load view: ${viewPath} (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error('[Router] Error loading view:', error);
            return '<div class="error">Error al cargar la vista</div>';
        }
    }

    /**
     * Update active menu items
     * @param {string} path - Current path
     */
    updateActiveMenu(path) {
        document.querySelectorAll('[data-route]').forEach((link) => {
            const isActive = link.dataset.route === path;
            link.classList.toggle('active', isActive);
        });
    }

    /**
     * Show error message
     * @param {string} message
     */
    showError(message) {
        if (this.appContainer) {
            this.appContainer.innerHTML = `
                <div class="error-container">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">Recargar</button>
                </div>
            `;
        }
    }

    /**
     * Initialize router
     */
    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            const path = event.state?.path || window.location.pathname;
            this.navigate(path, false);
        });

        // Intercept link clicks with data-route attribute
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-route]');
            if (target) {
                e.preventDefault();
                const path = target.dataset.route;
                this.navigate(path);
            }
        });

        if (APP_CONFIG.enableDebug) {
            console.info('[Router] Initialized');
        }

        // Navigate to initial route
        const initialPath = window.location.pathname;
        this.navigate(initialPath, false);
    }

    /**
     * Get current route
     * @returns {string|null}
     */
    getCurrentPath() {
        return this.currentPath;
    }

    /**
     * Check if route exists
     * @param {string} path
     * @returns {boolean}
     */
    hasRoute(path) {
        return this.routes.has(path);
    }
}

// Export singleton instance
export const router = new Router();
