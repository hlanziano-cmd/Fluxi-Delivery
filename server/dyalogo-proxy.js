/**
 * Servidor Proxy para Dyalogo
 *
 * Este servidor actúa como intermediario entre el frontend (navegador)
 * y la API de Dyalogo, evitando problemas de CORS
 */

const http = require('http');
const https = require('https');

const PORT = 3000;
const DYALOGO_API_URL = 'http://addons.mercurio2.dyalogo.cloud:8080/dy_servicios_adicionales/svrs/dm/info/data';

const server = http.createServer((req, res) => {
    // Habilitar CORS para todas las peticiones
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar peticiones OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Solo aceptar POST a /api/dyalogo
    if (req.method === 'POST' && req.url === '/api/dyalogo') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                console.log('📡 Petición recibida del frontend:', requestData);

                // Hacer petición a Dyalogo
                const postData = JSON.stringify(requestData);

                const options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                console.log('🔄 Enviando petición a Dyalogo...');

                const proxyReq = http.request(DYALOGO_API_URL, options, (proxyRes) => {
                    let data = '';

                    proxyRes.on('data', chunk => {
                        data += chunk;
                    });

                    proxyRes.on('end', () => {
                        console.log('✅ Respuesta recibida de Dyalogo');

                        try {
                            const jsonData = JSON.parse(data);
                            // Dyalogo devuelve datos en objSerializar_t, no en data
                            const records = jsonData.objSerializar_t || jsonData.data || [];
                            console.log('📦 Registros obtenidos:', Array.isArray(records) ? records.length : 0);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(data);
                        } catch (parseError) {
                            console.error('❌ Error parseando respuesta de Dyalogo:', parseError);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                error: 'Error parseando respuesta de Dyalogo',
                                details: parseError.message
                            }));
                        }
                    });
                });

                proxyReq.on('error', (error) => {
                    console.error('❌ Error en petición a Dyalogo:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Error conectando con Dyalogo',
                        details: error.message
                    }));
                });

                proxyReq.write(postData);
                proxyReq.end();

            } catch (error) {
                console.error('❌ Error procesando petición:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Petición inválida',
                    details: error.message
                }));
            }
        });
    } else {
        // Ruta no encontrada
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ruta no encontrada. Usa POST /api/dyalogo' }));
    }
});

server.listen(PORT, () => {
    console.log('🚀 ========================================');
    console.log('🚀 Servidor Proxy Dyalogo Iniciado');
    console.log('🚀 ========================================');
    console.log(`📡 Escuchando en: http://localhost:${PORT}`);
    console.log(`🔗 Endpoint: POST http://localhost:${PORT}/api/dyalogo`);
    console.log(`🎯 Target: ${DYALOGO_API_URL}`);
    console.log('🚀 ========================================\n');
});
