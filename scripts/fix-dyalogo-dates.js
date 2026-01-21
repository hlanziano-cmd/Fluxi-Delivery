/**
 * Script para corregir las fechas de pedidos importados de Dyalogo
 *
 * Este script:
 * 1. Busca todos los pedidos con notas que contienen "Dyalogo ID"
 * 2. Extrae el ID de Dyalogo de las notas
 * 3. Busca la fecha correcta en los archivos JSON originales
 * 4. Actualiza el campo created_at con la fecha correcta
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const SUPABASE_URL = 'https://lbifbexhmvbanvrjfglp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeo de índices de Dyalogo - Estructura REAL de la API
// [0]: dyalogoId, [1]: fechaPedido, [3]: duracion, [9]: agente,
// [13]: nombre, [14]: apellido, [19]: telefono, [23]: direccion, [26]: barrio
const FIELD_MAPPING_API = {
    dyalogo_id: 0,
    fecha_pedido: 1  // Fecha del pedido (G4981_C101302)
};

// Mapeo alternativo para archivos históricos JSON (estructura diferente)
const FIELD_MAPPING_HISTORICO = {
    dyalogo_id: 0,
    fecha_pedido: 1
};

/**
 * Carga los datos de Dyalogo desde los archivos JSON
 */
function loadDyalogoData() {
    const basePath = path.join(__dirname, '..');
    const files = [
        path.join(basePath, 'dyalogo_3meses.json'),
        path.join(basePath, 'dyalogo_3meses_part2.json')
    ];

    const dyalogoMap = new Map();

    for (const filePath of files) {
        if (fs.existsSync(filePath)) {
            console.log(`📂 Leyendo ${path.basename(filePath)}...`);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            const records = data.objSerializar_t || [];

            // Detectar formato del archivo (histórico vs API)
            // En formato histórico, el ID está en índice 4
            // En formato API, el ID está en índice 1
            let mapping = FIELD_MAPPING_HISTORICO;
            if (records.length > 0) {
                const firstRecord = records[0];
                // Si el índice 0 parece ser duración de llamada (formato HH:MM:SS), es formato API
                if (typeof firstRecord[0] === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(firstRecord[0])) {
                    mapping = FIELD_MAPPING_API;
                    console.log('   → Detectado formato API');
                } else {
                    console.log('   → Detectado formato histórico');
                }
            }

            let loaded = 0;
            records.forEach(record => {
                const dyalogoId = record[mapping.dyalogo_id];
                const fechaPedido = record[mapping.fecha_pedido];
                if (dyalogoId && fechaPedido) {
                    dyalogoMap.set(String(dyalogoId), fechaPedido);
                    loaded++;
                }
            });

            console.log(`   → ${records.length} registros leídos, ${loaded} mapeados`);
        } else {
            console.log(`⚠️ Archivo no encontrado: ${filePath}`);
        }
    }

    console.log(`📊 Total IDs de Dyalogo mapeados: ${dyalogoMap.size}`);
    return dyalogoMap;
}

/**
 * Extrae el ID de Dyalogo de las notas del pedido
 */
function extractDyalogoId(notas) {
    if (!notas) return null;

    // Buscar patrón "Dyalogo ID: XXXXX" o "ID: XXXXX"
    const match = notas.match(/(?:Dyalogo\s+)?ID:\s*(\d+)/i);
    return match ? match[1] : null;
}

/**
 * Función principal
 */
async function fixDyalogoDates() {
    console.log('🔧 ========================================');
    console.log('🔧 CORRECCIÓN DE FECHAS DE PEDIDOS DYALOGO');
    console.log('🔧 ========================================\n');

    // 1. Cargar datos de Dyalogo
    console.log('📥 Paso 1: Cargando datos de Dyalogo...');
    const dyalogoMap = loadDyalogoData();

    if (dyalogoMap.size === 0) {
        console.log('❌ No se encontraron datos de Dyalogo. Abortando.');
        return;
    }

    // 2. Obtener todos los pedidos de Supabase que fueron importados de Dyalogo
    console.log('\n📥 Paso 2: Obteniendo pedidos de Supabase...');
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('id, notas, created_at')
        .or('notas.ilike.%Dyalogo%,notas.ilike.%Importado de Dyalogo%');

    if (error) {
        console.error('❌ Error obteniendo pedidos:', error);
        return;
    }

    console.log(`   → ${pedidos.length} pedidos encontrados con notas de Dyalogo`);

    // 3. Procesar cada pedido
    console.log('\n🔄 Paso 3: Corrigiendo fechas...');
    let updated = 0;
    let notFound = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const pedido of pedidos) {
        const dyalogoId = extractDyalogoId(pedido.notas);

        if (!dyalogoId) {
            console.log(`⚠️ No se pudo extraer ID de Dyalogo para pedido ${pedido.id.substring(0, 8)}`);
            notFound++;
            continue;
        }

        const fechaDyalogo = dyalogoMap.get(dyalogoId);

        if (!fechaDyalogo) {
            console.log(`⚠️ ID de Dyalogo ${dyalogoId} no encontrado en los archivos JSON`);
            notFound++;
            continue;
        }

        // Convertir fecha de Dyalogo a ISO
        try {
            const fechaISO = new Date(fechaDyalogo.replace(' ', 'T') + '-05:00').toISOString();

            // Verificar si la fecha ya es correcta (comparar solo hasta minutos)
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
                console.error(`❌ Error actualizando pedido ${pedido.id.substring(0, 8)}:`, updateError.message);
                errors++;
            } else {
                console.log(`✅ Pedido ${pedido.id.substring(0, 8)} actualizado: ${fechaDyalogo}`);
                updated++;
            }

        } catch (e) {
            console.error(`❌ Error procesando fecha para pedido ${pedido.id.substring(0, 8)}:`, e.message);
            errors++;
        }

        // Pequeña pausa para no sobrecargar la API
        if (updated % 50 === 0 && updated > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // 4. Resumen
    console.log('\n🏁 ========================================');
    console.log('🏁 CORRECCIÓN COMPLETADA');
    console.log('🏁 ========================================');
    console.log(`📊 Pedidos procesados: ${pedidos.length}`);
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`✓ Ya correctos: ${alreadyCorrect}`);
    console.log(`⚠️ ID no encontrado: ${notFound}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('========================================\n');
}

// Ejecutar
fixDyalogoDates().catch(console.error);
