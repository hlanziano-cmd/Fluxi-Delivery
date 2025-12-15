/**
 * Delivery Map Component
 * Component for real-time tracking of delivery personnel using Leaflet
 */
export class DeliveryMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = {};
        this.defaultCenter = [4.5709, -74.2973]; // Bogotá coordinates
        this.defaultZoom = 12;
    }

    /**
     * Initialize the map
     */
    async init() {
        try {
            // Load Leaflet CSS and JS dynamically
            await this.loadLeaflet();

            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(`[DeliveryMap] Container ${this.containerId} not found`);
                return;
            }

            // Initialize map
            this.map = L.map(this.containerId).setView(this.defaultCenter, this.defaultZoom);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(this.map);

            console.info('[DeliveryMap] Map initialized successfully');
        } catch (error) {
            console.error('[DeliveryMap] Error initializing map:', error);
            this.showMapError();
        }
    }

    /**
     * Load Leaflet library dynamically
     */
    async loadLeaflet() {
        return new Promise((resolve, reject) => {
            // Check if Leaflet is already loaded
            if (window.L) {
                resolve();
                return;
            }

            // Load CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            cssLink.integrity =
                'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            cssLink.crossOrigin = '';
            document.head.appendChild(cssLink);

            // Load JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity =
                'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
        });
    }

    /**
     * Update markers with delivery personnel locations
     * @param {Array} deliveries - Array of delivery objects with location data
     */
    updateMarkers(deliveries) {
        if (!this.map) {
            console.error('[DeliveryMap] Map not initialized');
            return;
        }

        // Remove markers that are no longer in the list
        const currentIds = deliveries.map((d) => d.id);
        Object.keys(this.markers).forEach((id) => {
            if (!currentIds.includes(parseInt(id))) {
                this.map.removeLayer(this.markers[id]);
                delete this.markers[id];
            }
        });

        // Update or create markers
        deliveries.forEach((delivery) => {
            if (delivery.latitud && delivery.longitud) {
                this.updateMarker(delivery);
            }
        });

        // Auto-fit bounds if there are markers
        const markerArray = Object.values(this.markers);
        if (markerArray.length > 0) {
            const group = L.featureGroup(markerArray);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    /**
     * Update or create a single marker
     * @param {Object} delivery - Delivery object with location data
     */
    updateMarker(delivery) {
        const position = [delivery.latitud, delivery.longitud];

        // Create custom icon based on status
        const icon = this.createIcon(delivery);

        if (this.markers[delivery.id]) {
            // Update existing marker
            this.markers[delivery.id].setLatLng(position);
            this.markers[delivery.id].setIcon(icon);
            this.markers[delivery.id].setPopupContent(this.createPopupContent(delivery));
        } else {
            // Create new marker
            const marker = L.marker(position, { icon })
                .addTo(this.map)
                .bindPopup(this.createPopupContent(delivery));

            this.markers[delivery.id] = marker;
        }
    }

    /**
     * Create custom icon based on delivery status
     * @param {Object} delivery - Delivery object
     * @returns {L.DivIcon}
     */
    createIcon(delivery) {
        const isActive = delivery.ubicacion_compartida;
        const color = isActive ? '#28a745' : '#6c757d';
        const icon = isActive ? '🏍️' : '📍';

        const html = `
            <div style="
                background-color: ${color};
                width: 35px;
                height: 35px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
                ${icon}
            </div>
        `;

        return L.divIcon({
            html: html,
            className: 'custom-delivery-icon',
            iconSize: [35, 35],
            iconAnchor: [17.5, 17.5],
        });
    }

    /**
     * Create popup content for marker
     * @param {Object} delivery - Delivery object
     * @returns {string}
     */
    createPopupContent(delivery) {
        const statusLabel = delivery.ubicacion_compartida ? 'Compartiendo ubicación' : 'Última ubicación conocida';
        const statusColor = delivery.ubicacion_compartida ? '#28a745' : '#6c757d';
        const lastUpdate = delivery.ultima_actualizacion_ubicacion
            ? new Date(delivery.ultima_actualizacion_ubicacion).toLocaleString('es-CO')
            : 'Desconocido';

        return `
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                    ${delivery.nombre}
                </h4>
                <p style="margin: 5px 0; font-size: 13px;">
                    <strong>Estado:</strong>
                    <span style="color: ${statusColor};">${statusLabel}</span>
                </p>
                <p style="margin: 5px 0; font-size: 13px;">
                    <strong>Teléfono:</strong> ${delivery.telefono || 'N/A'}
                </p>
                <p style="margin: 5px 0; font-size: 13px;">
                    <strong>Última actualización:</strong><br>
                    ${lastUpdate}
                </p>
                ${delivery.activo ?
                    `<p style="margin: 5px 0; font-size: 13px;">
                        <strong>Arranque inicial:</strong>
                        $${parseFloat(delivery.arranque_inicial || 0).toLocaleString('es-CO')}
                    </p>` :
                    '<p style="margin: 5px 0; font-size: 13px; color: #dc3545;"><strong>⚠️ Inactivo</strong></p>'
                }
            </div>
        `;
    }

    /**
     * Show error message in map container
     */
    showMapError() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div style="
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    color: #6c757d;
                ">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="margin: 0 0 8px 0;">Error al cargar el mapa</h3>
                    <p style="margin: 0;">Por favor recarga la página para intentar nuevamente</p>
                </div>
            `;
        }
    }

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.markers = {};
        }
    }
}
