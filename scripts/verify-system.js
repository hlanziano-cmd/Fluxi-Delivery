/**
 * Script de verificación del sistema Fluxi Delivery
 * Ejecuta pruebas básicas para garantizar el estado del desarrollo
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuración
const SUPABASE_URL = 'https://lbifbexhmvbanvrjfglp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Resultados
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

async function checkHttpServer(port) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 3000
        }, (res) => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

async function runTests() {
    console.log('\n========================================');
    console.log('   VERIFICACIÓN DEL SISTEMA FLUXI');
    console.log('========================================\n');

    // Test 1: Verificar archivo index.html existe
    const indexPath = path.join(__dirname, '..', 'index.html');
    const indexExists = fs.existsSync(indexPath);
    logTest('Archivo index.html existe', indexExists);

    // Test 2: Verificar que index.html contiene las funciones críticas
    if (indexExists) {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');

        // Test 2a: Función de búsqueda de pedidos
        const hasSearchFunction = indexContent.includes('async function searchOrders()');
        logTest('Función searchOrders() existe', hasSearchFunction);

        // Test 2b: Función de renderizado de resultados
        const hasRenderFunction = indexContent.includes('function renderSearchResults');
        logTest('Función renderSearchResults() existe', hasRenderFunction);

        // Test 2c: Columna Fecha en lugar de ID
        const hasFechaColumn = indexContent.includes('<th') && indexContent.includes('Fecha</th>');
        logTest('Columna "Fecha" en tabla de resultados', hasFechaColumn);

        // Test 2d: Campo de búsqueda por teléfono
        const hasPhoneSearch = indexContent.includes('Teléfono') && indexContent.includes('search-id');
        logTest('Campo de búsqueda por Teléfono', hasPhoneSearch);

        // Test 2e: Límite de 10000 registros para consultas históricas
        const hasLargeLimit = indexContent.includes('.limit(10000)');
        logTest('Límite de 10,000 registros configurado', hasLargeLimit);

        // Test 2f: Configuración de Supabase
        const hasSupabaseConfig = indexContent.includes('supabase.co') && indexContent.includes('createClient');
        logTest('Configuración de Supabase presente', hasSupabaseConfig);
    }

    // Test 3: Conexión a Supabase
    console.log('\n--- Pruebas de conectividad ---\n');
    try {
        const { count, error } = await supabase
            .from('pedidos')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        logTest('Conexión a Supabase', true, `${count} pedidos en la base de datos`);
    } catch (err) {
        logTest('Conexión a Supabase', false, err.message);
    }

    // Test 4: Verificar datos históricos (3 meses)
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const { data, error } = await supabase
            .from('pedidos')
            .select('created_at')
            .order('created_at', { ascending: true })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const oldestDate = new Date(data[0].created_at);
            const hasOldData = oldestDate <= threeMonthsAgo;
            logTest('Datos históricos de 3+ meses', hasOldData,
                `Registro más antiguo: ${oldestDate.toLocaleDateString('es-CO')}`);
        } else {
            logTest('Datos históricos de 3+ meses', false, 'No hay datos');
        }
    } catch (err) {
        logTest('Datos históricos de 3+ meses', false, err.message);
    }

    // Test 5: Servidor HTTP (puerto 8000)
    const http8000 = await checkHttpServer(8000);
    logTest('Servidor HTTP activo (puerto 8000)', http8000);

    // Test 6: Proxy Dyalogo (puerto 3000)
    const http3000 = await checkHttpServer(3000);
    logTest('Proxy Dyalogo activo (puerto 3000)', http3000);

    // Test 7: Verificar archivos de scripts
    const scriptsPath = path.join(__dirname);
    const dyalogoProxy = fs.existsSync(path.join(__dirname, '..', 'server', 'dyalogo-proxy.js'));
    logTest('Archivo dyalogo-proxy.js existe', dyalogoProxy);

    // Resumen
    console.log('\n========================================');
    console.log('           RESUMEN DE PRUEBAS');
    console.log('========================================');
    console.log(`✅ Pasadas: ${results.passed}`);
    console.log(`❌ Fallidas: ${results.failed}`);
    console.log(`📊 Total: ${results.passed + results.failed}`);
    console.log(`📈 Porcentaje: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
    console.log('========================================\n');

    if (results.failed > 0) {
        console.log('⚠️ Algunas pruebas fallaron. Revisa los detalles arriba.\n');
        process.exit(1);
    } else {
        console.log('🎉 ¡Todas las pruebas pasaron!\n');
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Error ejecutando pruebas:', err);
    process.exit(1);
});
