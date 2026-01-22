/**
 * Servicio de Webhook para Dyalogo
 *
 * Este servicio maneja la comunicación con la API de Dyalogo
 * y la sincronización de pedidos hacia Fluxi
 */

class DyalogoWebhookService {
    constructor(config) {
        this.config = config;
        this.autoSyncTimer = null;
        this.isRunning = false;
        this.lastSyncTime = null;
        this.syncHistory = [];
    }

    /**
     * Realiza una petición a la API de Dyalogo
     * @param {number} limit - Límite de registros
     * @param {Date} fromDate - Fecha desde la cual consultar
     * @returns {Promise<Array>} - Array de registros
     */
    async fetchFromDyalogo(limit = null, fromDate = null) {
        try {
            console.log('📡 Consultando API de Dyalogo...');

            const requestBody = this.config.buildRequestBody(limit, fromDate);
            console.log('📝 Request body:', requestBody);

            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Respuesta de Dyalogo:', data);
            console.log('📋 Estructura de respuesta:', {
                tieneData: !!data.data,
                tieneRecords: !!data.records,
                esArray: Array.isArray(data),
                keys: Object.keys(data)
            });

            // Extraer los registros del response
            // Dyalogo devuelve los datos en objSerializar_t
            let records = [];

            if (data.objSerializar_t && Array.isArray(data.objSerializar_t)) {
                records = data.objSerializar_t;
            } else if (data.data && Array.isArray(data.data)) {
                records = data.data;
            } else if (data.records && Array.isArray(data.records)) {
                records = data.records;
            } else if (Array.isArray(data)) {
                records = data;
            } else if (data.result && Array.isArray(data.result)) {
                records = data.result;
            } else if (typeof data === 'object' && !Array.isArray(data)) {
                // Si es un objeto único, convertirlo en array
                records = [data];
            }

            console.log(`📦 Se obtuvieron ${records.length} registros de Dyalogo`);

            if (records.length > 0) {
                console.log('📄 Primer registro (ejemplo):', records[0]);
            }

            return records;

        } catch (error) {
            console.error('❌ Error consultando Dyalogo:', error);
            throw error;
        }
    }

    /**
     * Transforma múltiples registros de Dyalogo a formato Fluxi
     * @param {Array} dyalogoRecords - Array de registros de Dyalogo
     * @returns {Array} - Array de objetos en formato Fluxi
     */
    transformRecords(dyalogoRecords) {
        console.log(`🔄 Transformando ${dyalogoRecords.length} registros...`);

        const transformed = dyalogoRecords
            .map(record => this.config.transformToFluxiFormat(record))
            .filter(record => record !== null); // Filtrar registros inválidos

        console.log(`✅ ${transformed.length} registros transformados correctamente`);

        return transformed;
    }

    /**
     * Verifica si un pedido ya existe en Fluxi (por Dyalogo ID en notas)
     * @param {object} orderData - Datos del pedido
     * @returns {Promise<boolean>} - True si ya existe
     */
    async orderExists(orderData) {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase no está inicializado');
            }

            // Buscar SOLO por Dyalogo ID en las notas
            // No usamos fallback de teléfono+dirección porque un cliente
            // puede hacer múltiples pedidos en el mismo día
            const dyalogoId = orderData._dyalogoId;
            if (!dyalogoId) {
                // Si no hay Dyalogo ID, permitir inserción
                return false;
            }

            const searchPattern = `Dyalogo ID: ${dyalogoId}`;
            const { data, error } = await window.supabaseClient
                .from('pedidos')
                .select('id')
                .ilike('notas', `%${searchPattern}%`)
                .limit(1);

            if (error) {
                console.error('Error verificando duplicados por Dyalogo ID:', error);
                return false; // En caso de error, permitir inserción
            }

            return data && data.length > 0;

        } catch (error) {
            console.error('Error en orderExists:', error);
            return false;
        }
    }

    /**
     * Crea un pedido en Fluxi
     * @param {object} orderData - Datos del pedido en formato tabla pedidos
     * @returns {Promise<object>} - Pedido creado
     */
    async createOrderInFluxi(orderData) {
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase no está inicializado');
            }

            // Convertir fecha de Dyalogo a formato ISO si está disponible
            let fechaCreacion = new Date().toISOString();
            if (orderData._fechaPedido) {
                try {
                    // Formato Dyalogo: "2026-01-16 12:06:20"
                    const fechaDyalogo = new Date(orderData._fechaPedido.replace(' ', 'T') + '-05:00');
                    if (!isNaN(fechaDyalogo.getTime())) {
                        fechaCreacion = fechaDyalogo.toISOString();
                        console.log(`📅 Usando fecha de pedido Dyalogo: ${orderData._fechaPedido} -> ${fechaCreacion}`);
                    }
                } catch (e) {
                    console.warn('⚠️ Error parseando fecha Dyalogo, usando fecha actual:', e);
                }
            }

            // Preparar datos para inserción - campos de la tabla pedidos
            const pedido = {
                cliente: orderData.cliente,
                telefono_cliente: orderData.telefono_cliente,
                direccion: orderData.direccion,
                barrio: orderData.barrio,
                valor_pedido: orderData.valor_pedido,
                valor_domicilio: orderData.valor_domicilio || 0,
                metodo_pago: orderData.metodo_pago || 'efectivo',
                tipo_domiciliario: orderData.tipo_domiciliario || 'propio',
                estado: orderData.estado || 'pendiente',
                notas: orderData.notas || '',
                domiciliario_id: null,
                created_at: fechaCreacion,
                updated_at: fechaCreacion
            };

            console.log('💾 Guardando pedido en Fluxi:', pedido);

            const { data, error } = await window.supabaseClient
                .from('pedidos')
                .insert([pedido])
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log('✅ Pedido creado en Fluxi:', data);

            return data;

        } catch (error) {
            console.error('❌ Error creando pedido en Fluxi:', error);
            throw error;
        }
    }

    /**
     * Sincroniza pedidos desde Dyalogo hacia Fluxi
     * @param {object} options - Opciones de sincronización
     * @returns {Promise<object>} - Resultado de la sincronización
     */
    async syncOrders(options = {}) {
        const startTime = Date.now();

        const result = {
            timestamp: new Date().toISOString(),
            success: false,
            fetched: 0,
            created: 0,
            duplicates: 0,
            errors: [],
            orders: []
        };

        try {
            console.log('🔄 ========== INICIANDO SINCRONIZACIÓN DYALOGO → FLUXI ==========');

            // 1. Obtener datos de Dyalogo
            const dyalogoRecords = await this.fetchFromDyalogo(
                options.limit,
                options.fromDate
            );

            result.fetched = dyalogoRecords.length;

            if (dyalogoRecords.length === 0) {
                console.log('ℹ️ No hay nuevos pedidos en Dyalogo');
                result.success = true;
                return result;
            }

            // 2. Transformar registros a formato Fluxi
            const fluxiOrders = this.transformRecords(dyalogoRecords);

            // 3. Insertar pedidos en Fluxi (verificando duplicados)
            for (const orderData of fluxiOrders) {
                try {
                    // Verificar si ya existe
                    const exists = await this.orderExists(orderData);

                    if (exists) {
                        console.log(`⚠️ Pedido duplicado: ${orderData.cliente_nombre} - ${orderData.cliente_telefono}`);
                        result.duplicates++;
                        continue;
                    }

                    // Crear pedido
                    const createdOrder = await this.createOrderInFluxi(orderData);
                    result.created++;
                    result.orders.push(createdOrder);

                    console.log(`✅ [${result.created}/${fluxiOrders.length}] Pedido creado: ${createdOrder.id}`);

                } catch (orderError) {
                    console.error('❌ Error procesando pedido individual:', orderError);
                    result.errors.push({
                        order: orderData.cliente_nombre,
                        error: orderError.message
                    });
                }
            }

            result.success = true;

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ ========== SINCRONIZACIÓN COMPLETADA en ${duration}s ==========`);
            console.log(`📊 Resumen:`);
            console.log(`   - Obtenidos de Dyalogo: ${result.fetched}`);
            console.log(`   - Creados en Fluxi: ${result.created}`);
            console.log(`   - Duplicados (omitidos): ${result.duplicates}`);
            console.log(`   - Errores: ${result.errors.length}`);

            // Guardar en historial
            this.lastSyncTime = new Date();
            this.syncHistory.push(result);

            // Mantener solo últimas 50 sincronizaciones en historial
            if (this.syncHistory.length > 50) {
                this.syncHistory.shift();
            }

            return result;

        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            result.success = false;
            result.errors.push({
                general: error.message
            });
            return result;
        }
    }

    /**
     * Inicia la sincronización automática
     * @param {number} intervalMs - Intervalo en milisegundos (opcional)
     */
    startAutoSync(intervalMs = null) {
        if (this.isRunning) {
            console.warn('⚠️ La sincronización automática ya está activa');
            return;
        }

        const interval = intervalMs || this.config.syncConfig.autoSyncInterval;

        console.log(`🔄 Iniciando sincronización automática (cada ${interval / 1000}s)`);

        // Ejecutar primera sincronización inmediatamente
        this.syncOrders();

        // Configurar sincronización periódica
        this.autoSyncTimer = setInterval(() => {
            this.syncOrders();
        }, interval);

        this.isRunning = true;
    }

    /**
     * Detiene la sincronización automática
     */
    stopAutoSync() {
        if (!this.isRunning) {
            console.warn('⚠️ La sincronización automática no está activa');
            return;
        }

        console.log('🛑 Deteniendo sincronización automática');

        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }

        this.isRunning = false;
    }

    /**
     * Obtiene el estado actual del servicio
     * @returns {object} - Estado del servicio
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncTime: this.lastSyncTime,
            syncHistoryCount: this.syncHistory.length,
            config: {
                apiUrl: this.config.apiUrl,
                autoSyncInterval: this.config.syncConfig.autoSyncInterval,
                defaultLimit: this.config.syncConfig.defaultLimit
            }
        };
    }

    /**
     * Obtiene el historial de sincronizaciones
     * @param {number} limit - Cantidad de registros a retornar
     * @returns {Array} - Historial de sincronizaciones
     */
    getSyncHistory(limit = 10) {
        return this.syncHistory.slice(-limit);
    }

    /**
     * Ejemplo: Llena el formulario manual con un pedido de Dyalogo
     * @param {object} dyalogoRecord - Registro de Dyalogo
     */
    fillOrderForm(dyalogoRecord) {
        try {
            const orderData = this.config.transformToFluxiFormat(dyalogoRecord);

            if (!orderData) {
                throw new Error('No se pudo transformar el registro');
            }

            // Llenar campos del formulario
            const customerNameInput = document.getElementById('order-customer-name');
            const customerPhoneInput = document.getElementById('order-customer-phone');
            const addressInput = document.getElementById('order-address');
            const neighborhoodInput = document.getElementById('order-neighborhood');
            const valueInput = document.getElementById('order-value');
            const deliveryFeeInput = document.getElementById('order-delivery-fee');
            const totalInput = document.getElementById('order-total');
            const paymentMethodSelect = document.getElementById('order-payment-method');
            const notesInput = document.getElementById('order-notes');

            if (customerNameInput) customerNameInput.value = orderData.cliente_nombre;
            if (customerPhoneInput) customerPhoneInput.value = orderData.cliente_telefono;
            if (addressInput) addressInput.value = orderData.direccion_entrega;
            if (neighborhoodInput) neighborhoodInput.value = orderData.barrio;
            if (valueInput) valueInput.value = orderData.valor_pedido.toLocaleString('es-CO');
            if (deliveryFeeInput) deliveryFeeInput.value = orderData.valor_domicilio.toLocaleString('es-CO');
            if (totalInput) totalInput.value = '$ ' + orderData.total.toLocaleString('es-CO');
            if (paymentMethodSelect) paymentMethodSelect.value = orderData.metodo_pago;
            if (notesInput) notesInput.value = orderData.notas;

            console.log('✅ Formulario llenado con datos de Dyalogo');

        } catch (error) {
            console.error('❌ Error llenando formulario:', error);
            throw error;
        }
    }
}

// Hacer el servicio accesible globalmente
if (typeof window !== 'undefined') {
    window.DyalogoWebhookService = DyalogoWebhookService;
}

// Para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DyalogoWebhookService;
}
