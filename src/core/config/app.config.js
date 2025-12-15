export const APP_CONFIG = {
    name: import.meta.env.VITE_APP_NAME || 'Fluxi Delivery',
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    environment: import.meta.env.VITE_APP_ENV || 'development',

    // Session configuration
    sessionDuration: parseInt(import.meta.env.VITE_SESSION_DURATION) || 24 * 60 * 60 * 1000, // 24 horas
    sessionKey: 'fluxi_session',

    // Features
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',

    // Format configuration
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    currencyFormat: 'es-CO',
    currency: 'COP',

    // API configuration
    apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,

    // Roles
    roles: {
        ADMIN: 'admin',
        DISPATCHER: 'dispatcher',
        DELIVERY: 'domiciliario',
    },

    // Order statuses
    orderStatuses: {
        PENDING: 'pendiente',
        ASSIGNED: 'asignado',
        IN_TRANSIT: 'en_camino',
        DELIVERED: 'entregado',
        CANCELLED: 'cancelado',
    },

    // Delivery statuses
    deliveryStatuses: {
        AVAILABLE: 'disponible',
        BUSY: 'ocupado',
        INACTIVE: 'inactivo',
    },
};

// Log configuration in development
if (APP_CONFIG.enableDebug) {
    console.info('[App Config]', APP_CONFIG);
}
