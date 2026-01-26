/**
 * Vercel Serverless Function - Proxy para Dyalogo
 *
 * Esta función actúa como intermediario entre el frontend y la API de Dyalogo
 * para evitar problemas de CORS
 */

const https = require('https');
const http = require('http');

const DYALOGO_API_URL = 'http://addons.mercurio2.dyalogo.cloud:8080/dy_servicios_adicionales/svrs/dm/info/data';

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo aceptar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const requestData = req.body;
        console.log('📡 Petición recibida:', JSON.stringify(requestData).substring(0, 200));

        // Hacer petición a Dyalogo
        const dyalogoResponse = await makeRequest(DYALOGO_API_URL, requestData);

        console.log('✅ Respuesta de Dyalogo recibida');

        return res.status(200).json(dyalogoResponse);

    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({
            error: 'Error comunicando con Dyalogo',
            message: error.message
        });
    }
};

function makeRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const protocol = urlObj.protocol === 'https:' ? https : http;

        const request = protocol.request(options, (response) => {
            let responseData = '';

            response.on('data', chunk => {
                responseData += chunk;
            });

            response.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Error parsing Dyalogo response'));
                }
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });

        request.write(postData);
        request.end();
    });
}
