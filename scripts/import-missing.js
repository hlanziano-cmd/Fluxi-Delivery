/**
 * Script para importar pedidos faltantes del 21 de enero
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://lbifbexhmvbanvrjfglp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo'
);

const FIELD_MAPPING = {
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
};

function fetchDyalogo() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
            strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
            intIdG_t: '4981',
            strSQLWhere_t: "G4981_C101301 >= '2026-01-21 00:00:00'",
            intLimit_t: '500'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/dyalogo',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function transformRecord(record) {
    const fm = FIELD_MAPPING;

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

    // Validaciones mínimas
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

    let direccionCompleta = direccion;
    if (complemento) direccionCompleta += ' ' + complemento;

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

async function orderExistsByDyalogoId(dyalogoId) {
    const searchPattern = `Dyalogo ID: ${dyalogoId}`;
    const { data, error } = await supabase
        .from('pedidos')
        .select('id')
        .ilike('notas', `%${searchPattern}%`)
        .limit(1);

    return !error && data && data.length > 0;
}

async function insertOrder(orderData) {
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

async function main() {
    console.log('\n========================================');
    console.log('  IMPORTACIÓN DE PEDIDOS FALTANTES');
    console.log('========================================\n');

    try {
        // Obtener registros de Dyalogo
        console.log('📡 Consultando Dyalogo...');
        const response = await fetchDyalogo();
        const records = response.objSerializar_t || [];
        console.log(`   Total registros: ${records.length}`);

        // Transformar y filtrar válidos
        const validRecords = records
            .map(transformRecord)
            .filter(r => r !== null);
        console.log(`   Registros válidos: ${validRecords.length}`);

        // Importar faltantes
        let imported = 0;
        let duplicates = 0;
        let errors = 0;

        for (const order of validRecords) {
            try {
                const exists = await orderExistsByDyalogoId(order.dyalogoId);

                if (exists) {
                    duplicates++;
                    continue;
                }

                await insertOrder(order);
                imported++;
                console.log(`✅ [${imported}] Importado: ${order.cliente} (ID: ${order.dyalogoId})`);

            } catch (err) {
                errors++;
                console.error(`❌ Error: ${order.cliente} - ${err.message}`);
            }
        }

        console.log('\n========================================');
        console.log('           RESUMEN');
        console.log('========================================');
        console.log(`📦 Total en Dyalogo: ${records.length}`);
        console.log(`✅ Válidos: ${validRecords.length}`);
        console.log(`✅ Importados: ${imported}`);
        console.log(`⚠️ Ya existían: ${duplicates}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Error general:', error);
        process.exit(1);
    }
}

main();
