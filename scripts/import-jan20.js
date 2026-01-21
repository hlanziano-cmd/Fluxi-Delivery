/**
 * Script para importar pedidos del 20 de enero de 2026 desde Dyalogo
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = 'https://lbifbexhmvbanvrjfglp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuración Dyalogo
const DYALOGO_CONFIG = {
    credentials: {
        strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
        strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
        intIdG_t: '4981'
    },
    fieldMapping: {
        dyalogoId: 0,
        fechaPedido: 1,
        agente: 9,
        clienteNombres: 13,
        clienteApellidos: 14,
        clienteTelefono: 19,
        direccionEntrega: 23,
        complementoDireccion: 24,
        barrio: 26,
        valorPedido: 31
    }
};

// Función para hacer petición al proxy local
function fetchFromDyalogo(whereClause, limit) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            strUsuario_t: DYALOGO_CONFIG.credentials.strUsuario_t,
            strToken_t: DYALOGO_CONFIG.credentials.strToken_t,
            intIdG_t: DYALOGO_CONFIG.credentials.intIdG_t,
            strSQLWhere_t: whereClause,
            intLimit_t: String(limit)
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/dyalogo',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Error parsing response: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Transformar registro de Dyalogo a formato Fluxi
function transformRecord(record) {
    const fm = DYALOGO_CONFIG.fieldMapping;

    const dyalogoId = record[fm.dyalogoId];
    const fechaPedido = record[fm.fechaPedido];
    const agente = record[fm.agente] || 'N/A';
    const nombres = (record[fm.clienteNombres] || '').toString().trim();
    const apellidos = (record[fm.clienteApellidos] || '').toString().trim();
    const direccion = (record[fm.direccionEntrega] || '').toString().trim();
    const complemento = (record[fm.complementoDireccion] || '').toString().trim();
    const barrio = (record[fm.barrio] || '').toString().trim();
    const valorPedido = parseFloat(record[fm.valorPedido]) || 0;
    let telefono = record[fm.clienteTelefono];

    // Validaciones
    if (!dyalogoId || !fechaPedido) return null;

    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    if (!nombreCompleto || !direccion) return null;

    // Formatear teléfono
    if (telefono) {
        telefono = String(telefono).trim();
        if (telefono && !telefono.startsWith('+')) {
            telefono = '+57' + telefono.replace(/^0+/, '');
        }
    }
    if (!telefono) return null;

    // Dirección completa
    let direccionCompleta = direccion;
    if (complemento) {
        direccionCompleta += ' ' + complemento;
    }

    return {
        dyalogoId,
        fechaPedido,
        cliente: nombreCompleto,
        telefono_cliente: telefono,
        direccion: direccionCompleta.trim(),
        barrio: barrio || null,
        valor_pedido: valorPedido > 0 ? valorPedido : 0,
        valor_domicilio: 0,
        metodo_pago: 'efectivo',
        tipo_domiciliario: 'propio',
        estado: 'pendiente',
        notas: `Dyalogo ID: ${dyalogoId} - Agente: ${agente}`
    };
}

// Verificar si el pedido ya existe
async function orderExists(dyalogoId, telefono, direccion) {
    // Buscar por Dyalogo ID en notas
    const searchPattern = `Dyalogo ID: ${dyalogoId}`;
    const { data, error } = await supabase
        .from('pedidos')
        .select('id, notas')
        .ilike('notas', `%${searchPattern}%`)
        .limit(1);

    if (!error && data && data.length > 0) {
        return true;
    }

    // Fallback: buscar por teléfono y dirección
    const { data: data2 } = await supabase
        .from('pedidos')
        .select('id')
        .eq('telefono_cliente', telefono)
        .eq('direccion', direccion)
        .gte('created_at', '2026-01-20T00:00:00.000Z')
        .lte('created_at', '2026-01-21T00:00:00.000Z')
        .limit(1);

    return data2 && data2.length > 0;
}

// Insertar pedido en Supabase
async function insertOrder(orderData) {
    // Convertir fecha de Dyalogo a ISO
    let fechaCreacion = new Date().toISOString();
    if (orderData.fechaPedido) {
        try {
            const fechaDyalogo = new Date(orderData.fechaPedido.replace(' ', 'T') + '-05:00');
            if (!isNaN(fechaDyalogo.getTime())) {
                fechaCreacion = fechaDyalogo.toISOString();
            }
        } catch (e) {}
    }

    const pedido = {
        cliente: orderData.cliente,
        telefono_cliente: orderData.telefono_cliente,
        direccion: orderData.direccion,
        barrio: orderData.barrio,
        valor_pedido: orderData.valor_pedido,
        valor_domicilio: orderData.valor_domicilio,
        metodo_pago: orderData.metodo_pago,
        tipo_domiciliario: orderData.tipo_domiciliario,
        estado: orderData.estado,
        notas: orderData.notas,
        domiciliario_id: null,
        created_at: fechaCreacion,
        updated_at: fechaCreacion
    };

    const { data, error } = await supabase
        .from('pedidos')
        .insert([pedido])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Función principal
async function main() {
    console.log('\n========================================');
    console.log('  IMPORTACIÓN PEDIDOS 20 ENERO 2026');
    console.log('========================================\n');

    try {
        // Consultar Dyalogo para el 20 de enero
        const whereClause = "G4981_C101301 >= '2026-01-20 00:00:00' AND G4981_C101301 < '2026-01-21 00:00:00'";

        console.log('📡 Consultando Dyalogo...');
        console.log(`   WHERE: ${whereClause}`);

        const response = await fetchFromDyalogo(whereClause, 500);

        let records = [];
        if (response.objSerializar_t && Array.isArray(response.objSerializar_t)) {
            records = response.objSerializar_t;
        } else if (Array.isArray(response)) {
            records = response;
        }

        console.log(`\n📦 Registros obtenidos de Dyalogo: ${records.length}`);

        if (records.length === 0) {
            console.log('ℹ️ No hay registros para importar');
            return;
        }

        // Transformar registros
        const transformed = records
            .map(transformRecord)
            .filter(r => r !== null);

        console.log(`✅ Registros válidos para importar: ${transformed.length}`);

        // Importar cada pedido
        let created = 0;
        let duplicates = 0;
        let errors = 0;

        for (const order of transformed) {
            try {
                const exists = await orderExists(order.dyalogoId, order.telefono_cliente, order.direccion);

                if (exists) {
                    console.log(`⚠️ Duplicado: ${order.cliente} (Dyalogo ID: ${order.dyalogoId})`);
                    duplicates++;
                    continue;
                }

                const inserted = await insertOrder(order);
                created++;
                console.log(`✅ [${created}] Importado: ${order.cliente} - ${order.direccion}`);

            } catch (err) {
                errors++;
                console.error(`❌ Error: ${order.cliente} - ${err.message}`);
            }
        }

        // Resumen
        console.log('\n========================================');
        console.log('           RESUMEN IMPORTACIÓN');
        console.log('========================================');
        console.log(`📦 Total de Dyalogo: ${records.length}`);
        console.log(`✅ Importados: ${created}`);
        console.log(`⚠️ Duplicados: ${duplicates}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error general:', error);
        process.exit(1);
    }
}

main();
