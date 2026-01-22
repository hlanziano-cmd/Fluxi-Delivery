const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://lbifbexhmvbanvrjfglp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo'
);

// Consultar Dyalogo
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

async function analyze() {
    console.log('=== ANÁLISIS DE SINCRONIZACIÓN ===\n');

    // 1. Consultar Dyalogo
    console.log('1. Consultando Dyalogo...');
    const dyalogoResp = await fetchDyalogo();
    const dyalogoRecords = dyalogoResp.objSerializar_t || [];
    console.log('   Registros en Dyalogo (21 ene+):', dyalogoRecords.length);

    // Buscar el registro de ejemplo (JUAN FELIPE BOTERO)
    const ejemploRecord = dyalogoRecords.find(r =>
        r[13] === 'JUAN FELIPE' && r[14] === 'BOTERO'
    );

    if (ejemploRecord) {
        console.log('\n   Registro ejemplo encontrado en Dyalogo:');
        console.log('   - Dyalogo ID:', ejemploRecord[0]);
        console.log('   - Fecha:', ejemploRecord[1]);
        console.log('   - Cliente:', ejemploRecord[13], ejemploRecord[14]);
        console.log('   - Teléfono:', ejemploRecord[19]);
        console.log('   - Dirección:', ejemploRecord[23]);
    }

    // Mostrar últimos registros de Dyalogo
    console.log('\n   Últimos 10 registros de Dyalogo:');
    dyalogoRecords.slice(-10).forEach((r, i) => {
        console.log('   ' + (i+1) + '. ID:' + r[0] + ' - ' + r[1] + ' - ' + r[13] + ' ' + r[14]);
    });

    // 2. Consultar Supabase
    console.log('\n2. Consultando Supabase...');
    const { data: supabaseOrders } = await supabase
        .from('pedidos')
        .select('id, cliente, telefono_cliente, direccion, notas, created_at')
        .gte('created_at', '2026-01-21T05:00:00.000Z')
        .order('created_at', { ascending: false });

    console.log('   Pedidos en Supabase (21 ene+):', supabaseOrders?.length || 0);

    // Buscar si JUAN FELIPE BOTERO está en Supabase
    const enSupabase = supabaseOrders?.find(o =>
        o.cliente?.toLowerCase().includes('juan felipe') &&
        o.cliente?.toLowerCase().includes('botero')
    );

    if (enSupabase) {
        console.log('\n   JUAN FELIPE BOTERO SÍ está en Supabase:', enSupabase.id);
    } else {
        console.log('\n   JUAN FELIPE BOTERO NO está en Supabase');
    }

    // 3. Comparar IDs
    console.log('\n3. Comparando registros...');
    const dyalogoIds = new Set(dyalogoRecords.map(r => String(r[0])));

    // Extraer Dyalogo IDs de notas en Supabase
    const supabaseIds = new Set();
    supabaseOrders?.forEach(o => {
        const match = o.notas?.match(/Dyalogo ID: (\d+)/);
        if (match) supabaseIds.add(match[1]);
    });

    // Encontrar faltantes
    const faltantes = [...dyalogoIds].filter(id => !supabaseIds.has(id));
    console.log('   IDs en Dyalogo:', dyalogoIds.size);
    console.log('   IDs importados en Supabase:', supabaseIds.size);
    console.log('   Faltantes por importar:', faltantes.length);

    if (faltantes.length > 0) {
        console.log('\n   IDs faltantes:', faltantes.join(', '));

        // Mostrar detalles de registros faltantes
        console.log('\n   Detalles de registros faltantes:');
        const faltantesRecords = dyalogoRecords.filter(r => faltantes.includes(String(r[0])));
        faltantesRecords.forEach((r, i) => {
            console.log('   ' + (i+1) + '. ID:' + r[0] + ' - ' + r[1] + ' - ' + r[13] + ' ' + r[14] + ' - Tel:' + r[19] + ' - Dir:' + r[23]);
        });
    }
}

analyze().catch(console.error);
