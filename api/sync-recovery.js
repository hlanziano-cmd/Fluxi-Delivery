/**
 * Vercel Serverless Function - Recuperación de datos faltantes de Dyalogo
 *
 * Esta función verifica los últimos N días y recupera cualquier dato faltante.
 * Puede ejecutarse manualmente o programarse con Vercel Cron.
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const DYALOGO_API_URL = 'http://addons.mercurio2.dyalogo.cloud:8080/dy_servicios_adicionales/svrs/dm/info/data';

const supabase = createClient(
    'https://lbifbexhmvbanvrjfglp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo'
);

// Mapeo de campos de Dyalogo
const fieldMapping = {
    dyalogoId: 0, fechaPedido: 1, agente: 9,
    clienteNombres: 13, clienteApellidos: 14,
    clienteTelefono: 19, direccionEntrega: 23,
    complementoDireccion: 24, barrio: 26, valorPedido: 31
};

function fetchDyalogo(date) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
            strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
            intIdG_t: '4981',
            strSQLWhere_t: `G4981_C101301 >= '${date} 00:00:00' AND G4981_C101301 < '${date} 23:59:59'`,
            intLimit_t: '500'
        });

        const urlObj = new URL(DYALOGO_API_URL);
        const req = http.request({
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.objSerializar_t || []);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.write(postData);
        req.end();
    });
}

function transformToFluxiFormat(record) {
    const dyalogoId = record[fieldMapping.dyalogoId];
    const fechaPedido = record[fieldMapping.fechaPedido];
    const agente = record[fieldMapping.agente] || 'N/A';
    const nombres = (record[fieldMapping.clienteNombres] || '').toString().trim();
    const apellidos = (record[fieldMapping.clienteApellidos] || '').toString().trim();
    const direccion = (record[fieldMapping.direccionEntrega] || '').toString().trim();
    const complemento = (record[fieldMapping.complementoDireccion] || '').toString().trim();
    const barrio = (record[fieldMapping.barrio] || '').toString().trim();
    const valorPedido = parseFloat(record[fieldMapping.valorPedido]) || 0;
    let telefono = record[fieldMapping.clienteTelefono];

    if (!dyalogoId || !fechaPedido) return null;

    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    if (!nombreCompleto || !direccion) return null;

    if (telefono) {
        telefono = String(telefono).trim();
        if (!telefono.startsWith('+')) {
            telefono = '+57' + telefono.replace(/^0+/, '');
        }
    }
    if (!telefono) return null;

    let direccionCompleta = direccion;
    if (complemento) direccionCompleta += ' ' + complemento;

    // Convertir fecha de Dyalogo a ISO con timezone Colombia
    const isoDate = fechaPedido.replace(' ', 'T') + '-05:00';

    return {
        cliente: nombreCompleto,
        telefono_cliente: telefono,
        direccion: direccionCompleta.trim(),
        barrio: barrio || null,
        valor_pedido: valorPedido > 0 ? valorPedido : 0,
        valor_domicilio: 0,
        metodo_pago: 'efectivo',
        tipo_domiciliario: 'propio',
        estado: 'pendiente',
        notas: `Dyalogo ID: ${dyalogoId} - Agente: ${agente}`,
        created_at: isoDate,
        _dyalogoId: dyalogoId
    };
}

async function getExistingDyalogoIds() {
    const existingIds = new Set();
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data } = await supabase
            .from('pedidos')
            .select('notas')
            .like('notas', 'Dyalogo ID:%')
            .range(offset, offset + 999);

        if (data && data.length > 0) {
            data.forEach(o => {
                const match = o.notas?.match(/Dyalogo ID: (\d+)/);
                if (match) existingIds.add(match[1]);
            });
            offset += data.length;
            hasMore = data.length === 1000;
        } else {
            hasMore = false;
        }
    }

    return existingIds;
}

async function importDateData(date, existingIds) {
    const records = await fetchDyalogo(date);

    const toInsert = [];
    for (const record of records) {
        const dyalogoId = String(record[0]);
        if (existingIds.has(dyalogoId)) continue;

        const transformed = transformToFluxiFormat(record);
        if (transformed) {
            delete transformed._dyalogoId;
            toInsert.push(transformed);
            existingIds.add(dyalogoId); // Evitar duplicados en la misma ejecución
        }
    }

    if (toInsert.length > 0) {
        const batchSize = 50;
        let inserted = 0;

        for (let i = 0; i < toInsert.length; i += batchSize) {
            const batch = toInsert.slice(i, i + batchSize);
            const { error } = await supabase.from('pedidos').insert(batch);
            if (!error) inserted += batch.length;
        }

        return { dyalogo: records.length, inserted };
    }

    return { dyalogo: records.length, inserted: 0 };
}

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Parámetro: días a verificar (default: 7)
        const daysBack = parseInt(req.query?.days || req.body?.days) || 7;
        const maxDays = 90; // Máximo permitido
        const checkDays = Math.min(daysBack, maxDays);

        console.log(`🔄 Verificando últimos ${checkDays} días...`);

        // Obtener IDs ya existentes en Supabase
        const existingIds = await getExistingDyalogoIds();
        console.log(`📊 IDs existentes en Supabase: ${existingIds.size}`);

        // Generar lista de fechas a verificar
        const dates = [];
        const today = new Date();
        for (let i = 0; i < checkDays; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dates.push(dateStr);
        }

        // Verificar e importar cada fecha
        const results = [];
        let totalInserted = 0;

        for (const date of dates) {
            try {
                const result = await importDateData(date, existingIds);
                if (result.inserted > 0) {
                    results.push({ date, ...result });
                    totalInserted += result.inserted;
                }
            } catch (error) {
                console.error(`Error en ${date}:`, error.message);
            }
        }

        console.log(`✅ Total insertados: ${totalInserted}`);

        return res.status(200).json({
            success: true,
            daysChecked: checkDays,
            totalInserted,
            details: results
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
