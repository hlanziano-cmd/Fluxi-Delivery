const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://lbifbexhmvbanvrjfglp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo'
);

function fetchDyalogo(whereClause) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            strUsuario_t: '2e7d6b2a06f38025e770c4350f1b5ee5',
            strToken_t: '03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c',
            intIdG_t: '4981',
            strSQLWhere_t: whereClause,
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
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Error parsing response'));
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function check() {
    console.log('=== VERIFICACIÓN DE SINCRONIZACIÓN ===\n');

    // Obtener fecha de hoy en formato para Dyalogo
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Consultar Dyalogo - pedidos de hoy
    console.log('1. Consultando Dyalogo (hoy ' + todayStr + ')...');
    try {
        const dyalogoResp = await fetchDyalogo("G4981_C101301 >= '" + todayStr + " 00:00:00'");
        const dyalogoRecords = dyalogoResp.objSerializar_t || [];
        console.log('   Registros en Dyalogo hoy:', dyalogoRecords.length);

        if (dyalogoRecords.length > 0) {
            console.log('\n   Últimos 5 registros de Dyalogo:');
            dyalogoRecords.slice(-5).forEach((r, i) => {
                console.log('   ' + (i+1) + '. ID:' + r[0] + ' - ' + r[1] + ' - ' + (r[13] || '') + ' ' + (r[14] || ''));
            });
        }

        // Consultar Supabase - pedidos de hoy
        console.log('\n2. Consultando Supabase (hoy)...');
        const startOfDay = todayStr + 'T05:00:00.000Z'; // 00:00 Colombia = 05:00 UTC

        const { data: supabaseOrders, count } = await supabase
            .from('pedidos')
            .select('id, cliente, notas, created_at', { count: 'exact' })
            .gte('created_at', startOfDay)
            .order('created_at', { ascending: false });

        console.log('   Registros en Supabase hoy:', count);

        // Comparar IDs
        console.log('\n3. Comparando registros...');
        const dyalogoIds = new Set(dyalogoRecords.map(r => String(r[0])));

        const supabaseIds = new Set();
        supabaseOrders?.forEach(o => {
            const match = o.notas?.match(/Dyalogo ID: (\d+)/);
            if (match) supabaseIds.add(match[1]);
        });

        const faltantes = [...dyalogoIds].filter(id => !supabaseIds.has(id));

        console.log('   IDs en Dyalogo:', dyalogoIds.size);
        console.log('   IDs importados en Supabase:', supabaseIds.size);
        console.log('   Faltantes por importar:', faltantes.length);

        if (faltantes.length > 0 && faltantes.length <= 20) {
            console.log('\n   IDs faltantes:', faltantes.join(', '));
        }

        // Resumen general
        console.log('\n=== RESUMEN GENERAL ===');
        const { count: totalSupabase } = await supabase
            .from('pedidos')
            .select('*', { count: 'exact', head: true });

        console.log('Total pedidos en Supabase:', totalSupabase);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n⚠️ El proxy de Dyalogo no está corriendo.');
            console.log('   Ejecuta: pm2 start server/dyalogo-proxy.js --name "fluxi-dyalogo-proxy"');
        }
    }
}

check();
