/**
 * Script para corregir las fechas de pedidos consultando directamente la API de Dyalogo
 *
 * Este script:
 * 1. Obtiene todos los pedidos de Supabase que fueron importados de Dyalogo
 * 2. Para cada pedido, extrae el ID de Dyalogo de las notas
 * 3. Consulta la API de Dyalogo para obtener la fecha real del pedido
 * 4. Actualiza el campo created_at en Supabase con la fecha correcta
 */

const { createClient } = require('@supabase/supabase-js');
const http = require('http');

// Configuración de Supabase
const SUPABASE_URL = 'https://lbifbexhmvbanvrjfglp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuración de Dyalogo
const DYALOGO_PROXY = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/dyalogo'
};

const DYALOGO_CREDENTIALS = {
    strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
    strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
    intIdG_t: '4981'
};

// Mapeo de campos (índice 0 = ID, índice 1 = fecha)
const FIELD_MAPPING = {
    dyalogoId: 0,
    fechaPedido: 1
};

/**
 * Consulta pedidos de Dyalogo por rango de fechas
 */
async function fetchDyalogoOrders(startDate, endDate) {
    return new Promise((resolve, reject) => {
        const requestBody = JSON.stringify({
            ...DYALOGO_CREDENTIALS,
            strSQLWhere_t: `G4981_C101302 >= '${startDate} 00:00:00' AND G4981_C101302 <= '${endDate} 23:59:59'`,
            intLimit_t: '2000'
        });

        const options = {
            ...DYALOGO_PROXY,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const records = json.objSerializar_t || [];
                    resolve(records);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(requestBody);
        req.end();
    });
}

/**
 * Extrae el ID de Dyalogo de las notas del pedido
 */
function extractDyalogoId(notas) {
    if (!notas) return null;
    const match = notas.match(/(?:Dyalogo\s+)?ID:\s*(\d+)/i);
    return match ? match[1] : null;
}

/**
 * Función principal
 */
async function fixDatesFromAPI() {
    console.log('🔧 ========================================');
    console.log('🔧 CORRECCIÓN DE FECHAS DESDE API DYALOGO');
    console.log('🔧 ========================================\n');

    // 1. Obtener pedidos de Supabase importados de Dyalogo
    console.log('📥 Paso 1: Obteniendo pedidos de Supabase...');
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('id, notas, created_at, cliente')
        .or('notas.ilike.%Dyalogo%,notas.ilike.%Importado%');

    if (error) {
        console.error('❌ Error obteniendo pedidos:', error);
        return;
    }

    console.log(`   → ${pedidos.length} pedidos encontrados con notas de Dyalogo`);

    // 2. Crear mapa de IDs de Dyalogo a pedidos de Supabase
    const pedidosPorDyalogoId = new Map();
    pedidos.forEach(p => {
        const dyalogoId = extractDyalogoId(p.notas);
        if (dyalogoId) {
            pedidosPorDyalogoId.set(dyalogoId, p);
        }
    });

    console.log(`   → ${pedidosPorDyalogoId.size} pedidos con ID de Dyalogo válido`);

    // 3. Consultar API de Dyalogo para obtener fechas correctas
    // Consultamos por rangos de fecha para cubrir todos los pedidos posibles
    console.log('\n📡 Paso 2: Consultando API de Dyalogo...');

    const dyalogoMap = new Map();
    const dateRanges = [
        ['2026-01-13', '2026-01-13'],
        ['2026-01-14', '2026-01-14'],
        ['2026-01-15', '2026-01-15'],
        ['2026-01-16', '2026-01-16'],
        ['2026-01-17', '2026-01-17']
    ];

    for (const [start, end] of dateRanges) {
        try {
            console.log(`   → Consultando ${start}...`);
            const records = await fetchDyalogoOrders(start, end);
            console.log(`     ${records.length} registros encontrados`);

            records.forEach(r => {
                const id = String(r[FIELD_MAPPING.dyalogoId]);
                const fecha = r[FIELD_MAPPING.fechaPedido];
                if (id && fecha) {
                    dyalogoMap.set(id, fecha);
                }
            });
        } catch (e) {
            console.error(`   ❌ Error consultando ${start}:`, e.message);
        }
    }

    console.log(`\n📊 Total registros de Dyalogo obtenidos: ${dyalogoMap.size}`);

    // 4. Actualizar pedidos en Supabase
    console.log('\n🔄 Paso 3: Actualizando fechas en Supabase...');

    let updated = 0;
    let notFound = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const [dyalogoId, pedido] of pedidosPorDyalogoId) {
        const fechaDyalogo = dyalogoMap.get(dyalogoId);

        if (!fechaDyalogo) {
            notFound++;
            continue;
        }

        try {
            // Convertir fecha de Dyalogo a ISO
            const fechaISO = new Date(fechaDyalogo.replace(' ', 'T') + '-05:00').toISOString();

            // Verificar si la fecha ya es correcta
            const currentDate = new Date(pedido.created_at);
            const targetDate = new Date(fechaISO);

            // Si las fechas son iguales (dentro de 1 minuto), no actualizar
            if (Math.abs(currentDate.getTime() - targetDate.getTime()) < 60000) {
                alreadyCorrect++;
                continue;
            }

            // Actualizar el pedido
            const { error: updateError } = await supabase
                .from('pedidos')
                .update({
                    created_at: fechaISO,
                    updated_at: fechaISO
                })
                .eq('id', pedido.id);

            if (updateError) {
                console.error(`❌ Error actualizando ${pedido.cliente}:`, updateError.message);
                errors++;
            } else {
                const oldDate = currentDate.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
                const newDate = targetDate.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
                console.log(`✅ ${pedido.cliente}: ${oldDate} → ${newDate}`);
                updated++;
            }

        } catch (e) {
            console.error(`❌ Error procesando ${pedido.cliente}:`, e.message);
            errors++;
        }
    }

    // 5. Resumen
    console.log('\n🏁 ========================================');
    console.log('🏁 CORRECCIÓN COMPLETADA');
    console.log('🏁 ========================================');
    console.log(`📊 Pedidos procesados: ${pedidosPorDyalogoId.size}`);
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`✓ Ya correctos: ${alreadyCorrect}`);
    console.log(`⚠️ No encontrados en Dyalogo: ${notFound}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('========================================\n');
}

// Ejecutar
fixDatesFromAPI().catch(console.error);
