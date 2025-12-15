/**
 * Main Entry Point
 * Fluxi Delivery v2.0
 */

import { router } from './core/router/Router.js';
import { AuthMiddleware } from './core/middleware/auth.middleware.js';
import { APP_CONFIG } from './core/config/app.config.js';

// Import Controllers
import { LoginController } from './views/auth/LoginController.js';
import { UsersController } from './views/admin/UsersController.js';
import { DeliveriesController } from './views/admin/DeliveriesController.js';
import { OrdersController } from './views/admin/OrdersController.js';
import { OrderHistoryController } from './views/admin/OrderHistoryController.js';
import { ReportsController } from './views/admin/ReportsController.js';
import { SettingsController } from './views/admin/SettingsController.js';
import { DeliveryAppController } from './views/delivery/DeliveryAppController.js';

/**
 * Initialize Application
 */
async function initApp() {
    console.info(`[${APP_CONFIG.name}] v${APP_CONFIG.version} - Initializing...`);

    try {
        // Register routes
        registerRoutes();

        // Initialize router
        router.init();

        console.info(`[${APP_CONFIG.name}] Initialized successfully`);
    } catch (error) {
        console.error('[App] Initialization failed:', error);
        showError('Error al inicializar la aplicación');
    }
}

/**
 * Register all application routes
 */
function registerRoutes() {
    // Public routes
    router.register('/', {
        view: '../src/views/auth/login.html',
        controller: LoginController,
    });

    router.register('/login', {
        view: '../src/views/auth/login.html',
        controller: LoginController,
    });

    // Protected routes (require authentication)
    router.register('/users', {
        view: '../src/views/admin/users.html',
        controller: UsersController,
        middleware: () => AuthMiddleware.requireAuth(),
    });

    router.register('/deliveries', {
        view: '../src/views/admin/deliveries.html',
        controller: DeliveriesController,
        middleware: () => AuthMiddleware.requireAuth(),
    });

    router.register('/orders', {
        view: '../src/views/admin/orders.html',
        controller: OrdersController,
        middleware: () => AuthMiddleware.requireAuth(),
    });

    router.register('/order-history', {
        view: '../src/views/admin/order-history.html',
        controller: OrderHistoryController,
        middleware: () => AuthMiddleware.requireAuth(),
    });

    router.register('/reports', {
        view: '../src/views/admin/reports.html',
        controller: ReportsController,
        middleware: () => AuthMiddleware.requireAuth(),
    });

    router.register('/settings', {
        view: '../src/views/admin/settings.html',
        controller: SettingsController,
        middleware: () => AuthMiddleware.requireAuth(),
    });

    // Delivery app route (for delivery personnel)
    router.register('/delivery', {
        view: '../src/views/delivery/app.html',
        controller: DeliveryAppController,
        middleware: () => AuthMiddleware.requireAuth(),
    });
}

/**
 * Show error message
 */
function showError(message) {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div class="loading-container">
                <div class="alert alert-danger" style="max-width: 500px;">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Recargar
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
});
