/**
 * Script para importar datos históricos de Dyalogo a Supabase
 *
 * Este script:
 * 1. Lee los archivos JSON con datos de Dyalogo
 * 2. Transforma los registros al formato de la tabla pedidos
 * 3. Inserta los datos en la tabla pedidos de Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const SUPABASE_URL = 'https://lbifbexhmvbanvrjfglp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeo de índices de Dyalogo a campos (CORREGIDO según estructura real de la API)
// Estructura: [0]: dyalogoId, [1]: fechaPedido, [3]: duracion, [9]: agente,
// [13]: nombre, [14]: apellido, [19]: telefono, [23]: direccion, [26]: barrio
const FIELD_MAPPING = {
    dyalogo_id: 0,           // ID único de Dyalogo (25652)
    fecha_pedido: 1,         // FECHA DEL PEDIDO - G4981_C101302 ("2026-01-15 11:45:38")
    duracion_llamada: 3,     // Duración de la llamada "00:02:30"
    agente: 9,               // Nombre del agente ("Faith Irene Galeano Vergara")
    campana: 12,             // Campaña (IN Opción Pedidos VILLA DEL POLLO)
    cliente_nombre: 13,      // Nombre del cliente ("alvaro")
    cliente_apellido: 14,    // Apellido del cliente ("parto")
    cliente_documento: 15,   // ID documento
    cliente_telefono: 19,    // Teléfono del cliente ("3004694097")
    direccion_entrega: 23,   // Dirección de entrega ("CLL 63 SUR 71F 35")
    complemento_direccion: 24, // Complemento de dirección
    barrio: 26,              // Barrio ("perdomo")
    barrio_id: 27,           // ID del barrio
    ciudad_id: 28,           // ID de la ciudad
    valor_pedido: 31         // Valor del pedido
};

/**
 * Transforma un registro de Dyalogo al formato de la tabla pedidos
 */
function transformRecord(record) {
    try {
        const dyalogoId = record[FIELD_MAPPING.dyalogo_id];
        const fechaPedido = record[FIELD_MAPPING.fecha_pedido]; // Fecha del pedido (G4981_C101302)
        const nombre = (record[FIELD_MAPPING.cliente_nombre] || '').trim();
        const apellido = (record[FIELD_MAPPING.cliente_apellido] || '').trim();
        const direccion = (record[FIELD_MAPPING.direccion_entrega] || '').trim();
        const complemento = (record[FIELD_MAPPING.complemento_direccion] || '').trim();
        const barrio = (record[FIELD_MAPPING.barrio] || '').trim();
        const valorPedido = record[FIELD_MAPPING.valor_pedido] || 0;

        // Validar campos requeridos mínimos
        if (!dyalogoId || !fechaPedido) {
            return null;
        }

        // Solo importar registros con datos de cliente válidos
        if (!nombre && !apellido) {
            return null;
        }

        // Solo importar registros con dirección
        if (!direccion) {
            return null;
        }

        // Construir nombre completo
        const nombreCompleto = `${nombre} ${apellido}`.trim();

        // Formatear teléfono
        let telefono = record[FIELD_MAPPING.cliente_telefono];
        if (telefono) {
            telefono = String(telefono).trim();
            if (telefono && !telefono.startsWith('+')) {
                telefono = '+57' + telefono.replace(/^0+/, '');
            }
        }

        // El teléfono es requerido en la tabla pedidos
        // Si no hay teléfono, omitir este registro
        if (!telefono) {
            return null;
        }

        // Construir dirección completa
        let direccionCompleta = direccion;
        if (complemento) {
            direccionCompleta += ' ' + complemento;
        }

        // Convertir fecha de Dyalogo a formato ISO para Supabase
        const fechaISO = new Date(fechaPedido.replace(' ', 'T') + '-05:00').toISOString();

        // Formato de la tabla pedidos
        return {
            cliente: nombreCompleto,
            telefono_cliente: telefono || null,
            direccion: direccionCompleta.trim(),
            barrio: barrio || null,
            valor_pedido: valorPedido > 0 ? valorPedido : 0,
            valor_domicilio: 0,  // No viene en Dyalogo
            metodo_pago: 'efectivo',  // Por defecto
            tipo_domiciliario: 'propio',
            estado: 'entregado',  // Como son históricos, se asumen entregados
            notas: `Importado de Dyalogo - ID: ${dyalogoId} - Agente: ${record[FIELD_MAPPING.agente] || 'N/A'}`,
            created_at: fechaISO,
            updated_at: fechaISO
        };
    } catch (error) {
        console.error('Error transformando registro:', error);
        return null;
    }
}

/**
 * Inserta registros en lotes
 */
async function insertBatch(records, batchNumber, totalBatches) {
    try {
        const { data, error } = await supabase
            .from('pedidos')
            .insert(records);

        if (error) {
            console.error(`❌ Error en lote ${batchNumber}/${totalBatches}:`, error.message);
            return { success: false, error: error.message };
        }

        console.log(`✅ Lote ${batchNumber}/${totalBatches} insertado (${records.length} registros)`);
        return { success: true, count: records.length };
    } catch (error) {
        console.error(`❌ Error en lote ${batchNumber}/${totalBatches}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Función principal de importación
 */
async function importDyalogoData() {
    console.log('🚀 ========================================');
    console.log('🚀 IMPORTACIÓN DE DATOS HISTÓRICOS DYALOGO');
    console.log('🚀 ========================================\n');

    const startTime = Date.now();

    // Leer archivos JSON
    const basePath = path.join(__dirname, '..');
    const files = [
        path.join(basePath, 'dyalogo_3meses.json'),
        path.join(basePath, 'dyalogo_3meses_part2.json')
    ];

    let allRecords = [];

    for (const filePath of files) {
        if (fs.existsSync(filePath)) {
            console.log(`📂 Leyendo ${path.basename(filePath)}...`);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            const records = data.objSerializar_t || [];
            console.log(`   → ${records.length} registros encontrados`);
            allRecords = allRecords.concat(records);
        } else {
            console.log(`⚠️ Archivo no encontrado: ${filePath}`);
        }
    }

    console.log(`\n📊 Total registros a procesar: ${allRecords.length}`);

    // Eliminar duplicados por dyalogo_id
    const uniqueRecords = new Map();
    for (const record of allRecords) {
        const id = record[0];
        if (!uniqueRecords.has(id)) {
            uniqueRecords.set(id, record);
        }
    }

    console.log(`📊 Registros únicos: ${uniqueRecords.size}`);

    // Transformar registros
    console.log('\n🔄 Transformando registros...');
    const transformedRecords = [];

    for (const record of uniqueRecords.values()) {
        const transformed = transformRecord(record);
        if (transformed) {
            transformedRecords.push(transformed);
        }
    }

    console.log(`✅ ${transformedRecords.length} registros transformados correctamente`);

    // Insertar en lotes de 500
    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
        batches.push(transformedRecords.slice(i, i + BATCH_SIZE));
    }

    console.log(`\n📦 Insertando ${batches.length} lotes de hasta ${BATCH_SIZE} registros cada uno...\n`);

    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches.length; i++) {
        const result = await insertBatch(batches[i], i + 1, batches.length);
        if (result.success) {
            totalInserted += result.count;
        } else {
            totalErrors++;
        }

        // Pequeña pausa entre lotes para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n🏁 ========================================');
    console.log('🏁 IMPORTACIÓN COMPLETADA');
    console.log('🏁 ========================================');
    console.log(`⏱️  Duración: ${duration} segundos`);
    console.log(`📊 Registros procesados: ${transformedRecords.length}`);
    console.log(`✅ Lotes exitosos: ${batches.length - totalErrors}`);
    console.log(`❌ Lotes con error: ${totalErrors}`);
    console.log('========================================\n');
}

// Ejecutar
importDyalogoData().catch(console.error);
