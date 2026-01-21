/**
 * Configuración del Webhook para integración con Dyalogo
 *
 * Este archivo contiene las credenciales y mapeo de campos para
 * importar pedidos automáticamente desde Dyalogo a Fluxi
 */

const DyalogoWebhookConfig = {
    // URL del servicio de Dyalogo
    // NOTA: Usar proxy local para evitar problemas de CORS
    apiUrl: 'http://localhost:3000/api/dyalogo',  // Proxy local
    // apiUrl: 'http://addons.mercurio2.dyalogo.cloud:8080/dy_servicios_adicionales/svrs/dm/info/data',  // Directo (CORS error)

    // Credenciales de autenticación
    credentials: {
        strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
        strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
        intIdG_t: '4981'
    },

    // Mapeo de campos: índices de array de Dyalogo → nombres de campos Fluxi
    // Dyalogo devuelve arrays, no objetos. Estructura REAL verificada:
    // [0]: dyalogoId, [1]: fechaPedido, [2]: url, [3]: duracion, [4]: ?, [5]: ?,
    // [6-8]: null, [9]: agente, [10-11]: fechas gestion, [12]: campaña,
    // [13]: nombre, [14]: apellido, [15]: docId, [16-18]: ?, [19]: telefono,
    // [20-22]: ?, [23]: direccion, [24]: complemento, [25]: ?, [26]: barrio,
    // [27-28]: barrioId/ciudadId, [29-30]: valores, [31]: valorPedido
    fieldMapping: {
        // Índices del array de Dyalogo (CORREGIDOS según estructura real)
        dyalogoId: 0,              // ID único de Dyalogo (25652)
        fechaPedido: 1,            // FECHA DEL PEDIDO - G4981_C101302 ("2026-01-15 11:45:38")
        duracionLlamada: 3,        // Duración de la llamada "00:02:30"
        agente: 9,                 // Nombre del agente ("Faith Irene Galeano Vergara")
        campana: 12,               // Campaña (IN Opción Pedidos VILLA DEL POLLO)
        clienteNombres: 13,        // Nombre del cliente ("alvaro")
        clienteApellidos: 14,      // Apellido del cliente ("parto")
        clienteDocumento: 15,      // ID documento
        clienteTelefono: 19,       // Teléfono del cliente ("3004694097")
        direccionEntrega: 23,      // Dirección de entrega ("CLL 63 SUR 71F 35")
        complementoDireccion: 24,  // Complemento de dirección
        barrio: 26,                // Barrio ("perdomo")
        barrioId: 27,              // ID del barrio
        ciudadId: 28,              // ID de la ciudad
        valorPedido: 31,           // Valor del pedido

        // Nombre del campo SQL para filtrado de fecha (G4981_C101301 es la fecha del pedido)
        fechaCreacionSQL: 'G4981_C101301'
    },

    // Configuración de sincronización
    syncConfig: {
        // Intervalo de sincronización automática (en milisegundos)
        // 60000 = 1 minuto, 300000 = 5 minutos
        autoSyncInterval: 300000, // 5 minutos por defecto

        // Límite de registros por consulta
        defaultLimit: 50,

        // Días hacia atrás para consultar pedidos (por defecto: solo hoy)
        daysBack: 0,

        // Método de pago por defecto para pedidos importados
        defaultPaymentMethod: 'efectivo'
    },

    /**
     * Construye la consulta SQL WHERE para filtrar pedidos
     * @param {Date} fromDate - Fecha desde la cual consultar
     * @returns {string} - Condición SQL WHERE
     */
    buildWhereClause(fromDate = null) {
        const date = fromDate || new Date();

        // Calcular fecha de inicio según daysBack
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - this.syncConfig.daysBack);

        // Formatear fecha: YYYY-MM-DD HH:mm:ss
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');

        const dateStr = `${year}-${month}-${day} 00:00:00`;

        return `${this.fieldMapping.fechaCreacionSQL} >= '${dateStr}'`;
    },

    /**
     * Construye el body completo de la petición
     * @param {number} limit - Límite de registros
     * @param {Date} fromDate - Fecha desde la cual consultar
     * @returns {object} - Body para la petición POST
     */
    buildRequestBody(limit = null, fromDate = null) {
        return {
            strUsuario_t: this.credentials.strUsuario_t,
            strToken_t: this.credentials.strToken_t,
            intIdG_t: this.credentials.intIdG_t,
            strSQLWhere_t: this.buildWhereClause(fromDate),
            intLimit_t: String(limit || this.syncConfig.defaultLimit)
        };
    },

    /**
     * Transforma un registro de Dyalogo al formato de la tabla pedidos de Fluxi
     * @param {Array} dyalogoRecord - Registro de Dyalogo (array con índices)
     * @returns {object} - Objeto con formato de tabla pedidos
     */
    transformToFluxiFormat(dyalogoRecord) {
        try {
            // Dyalogo devuelve arrays, extraemos por índice
            const fm = this.fieldMapping;

            const dyalogoId = dyalogoRecord[fm.dyalogoId];
            const fechaPedido = dyalogoRecord[fm.fechaPedido]; // Fecha del pedido (G4981_C101302)
            const agente = dyalogoRecord[fm.agente] || 'N/A';
            const nombres = (dyalogoRecord[fm.clienteNombres] || '').toString().trim();
            const apellidos = (dyalogoRecord[fm.clienteApellidos] || '').toString().trim();
            const direccion = (dyalogoRecord[fm.direccionEntrega] || '').toString().trim();
            const complemento = (dyalogoRecord[fm.complementoDireccion] || '').toString().trim();
            const barrio = (dyalogoRecord[fm.barrio] || '').toString().trim();
            const valorPedido = parseFloat(dyalogoRecord[fm.valorPedido]) || 0;
            let telefono = dyalogoRecord[fm.clienteTelefono];

            // Validar campos requeridos mínimos
            if (!dyalogoId || !fechaPedido) {
                return null;
            }

            // Construir nombre completo
            const nombreCompleto = `${nombres} ${apellidos}`.trim();

            // Solo importar registros con datos de cliente válidos
            if (!nombreCompleto) {
                console.warn('⚠️ Registro omitido: nombre vacío');
                return null;
            }

            // Solo importar registros con dirección
            if (!direccion) {
                console.warn('⚠️ Registro omitido: dirección vacía');
                return null;
            }

            // Formatear teléfono (agregar +57 si no lo tiene)
            if (telefono) {
                telefono = String(telefono).trim();
                if (telefono && !telefono.startsWith('+')) {
                    telefono = '+57' + telefono.replace(/^0+/, '');
                }
            }

            // El teléfono es requerido en la tabla pedidos
            if (!telefono) {
                console.warn('⚠️ Registro omitido: teléfono vacío');
                return null;
            }

            // Construir dirección completa
            let direccionCompleta = direccion;
            if (complemento) {
                direccionCompleta += ' ' + complemento;
            }

            // Formato compatible con la tabla "pedidos" de Supabase
            const transformedData = {
                cliente: nombreCompleto,
                telefono_cliente: telefono,
                direccion: direccionCompleta.trim(),
                barrio: barrio || null,
                valor_pedido: valorPedido > 0 ? valorPedido : 0,
                valor_domicilio: 0,
                metodo_pago: this.syncConfig.defaultPaymentMethod,
                tipo_domiciliario: 'propio',
                estado: 'pendiente',
                notas: `Dyalogo ID: ${dyalogoId} - Agente: ${agente}`,

                // Datos adicionales para referencia interna (no se guardan)
                _dyalogoId: dyalogoId,
                _fechaPedido: fechaPedido
            };

            return transformedData;
        } catch (error) {
            console.error('❌ Error transformando registro de Dyalogo:', error);
            return null;
        }
    }
};

// Hacer la configuración accesible globalmente
if (typeof window !== 'undefined') {
    window.DyalogoWebhookConfig = DyalogoWebhookConfig;
}

// Para uso en Node.js (si se implementa backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DyalogoWebhookConfig;
}
