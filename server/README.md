# 🌉 Servidor Proxy Dyalogo

## 🔴 ¿Por qué es Necesario?

La API de Dyalogo **no soporta CORS (Cross-Origin Resource Sharing)**, lo que significa que los navegadores web bloquean las peticiones directas por seguridad.

**Error sin proxy**:
```
Access to fetch at 'http://addons.mercurio2.dyalogo.cloud:8080/...'
from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Solución**: Este servidor proxy actúa como intermediario entre tu navegador y la API de Dyalogo.

---

## 🚀 Uso

### 1. Iniciar el Servidor Proxy

```bash
# Desde la carpeta raíz del proyecto
cd "c:\Users\alanz\Desktop\Fluxi Delivery\Fluxi_New-main"

# Iniciar servidor
node server/dyalogo-proxy.js
```

Deberías ver:
```
🚀 ========================================
🚀 Servidor Proxy Dyalogo Iniciado
🚀 ========================================
📡 Escuchando en: http://localhost:3000
🔗 Endpoint: POST http://localhost:3000/api/dyalogo
🎯 Target: http://addons.mercurio2.dyalogo.cloud:8080/...
🚀 ========================================
```

### 2. Configurar el Frontend

El archivo `config/dyalogo-webhook.config.js` ya está configurado para usar el proxy:

```javascript
apiUrl: 'http://localhost:3000/api/dyalogo',  // ✅ Proxy (funciona)
```

### 3. Usar el Panel de Sincronización

```
http://localhost:8080/dyalogo-sync.html
```

Ahora al hacer click en **"🔌 Probar Conexión"**, la petición irá:

```
Navegador → Proxy (localhost:3000) → Dyalogo API → Proxy → Navegador
          ✅ Sin CORS                  ✅ Funciona
```

---

## 📊 Flujo de Datos

```
┌─────────────┐
│  Navegador  │ http://localhost:8080/dyalogo-sync.html
│   (Fluxi)   │
└──────┬──────┘
       │ POST http://localhost:3000/api/dyalogo
       │ (Sin problema de CORS)
       ▼
┌─────────────┐
│    Proxy    │ http://localhost:3000
│  Node.js    │
└──────┬──────┘
       │ POST http://addons.mercurio2.dyalogo.cloud:8080/...
       │ (Servidor a servidor - sin CORS)
       ▼
┌─────────────┐
│  Dyalogo    │
│     API     │
└─────────────┘
```

---

## 🧪 Probar el Proxy Manualmente

### Con curl

```bash
curl -X POST http://localhost:3000/api/dyalogo \
  -H "Content-Type: application/json" \
  -d '{
    "strUsuario_t": "2e7d6b2a06f38025e770c4350f1b5ee5",
    "strToken_t": "03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c",
    "intIdG_t": "4981",
    "strSQLWhere_t": "G4981_C101301 >= '\''2025-12-15 00:00:00'\''",
    "intLimit_t": "2"
  }'
```

### Con Postman

```
POST http://localhost:3000/api/dyalogo

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "strUsuario_t": "2e7d6b2a06f38025e770c4350f1b5ee5",
  "strToken_t": "03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c",
  "intIdG_t": "4981",
  "strSQLWhere_t": "G4981_C101301 >= '2025-12-15 00:00:00'",
  "intLimit_t": "2"
}
```

---

## 🔧 Logs del Servidor

El proxy muestra logs detallados en consola:

```
📡 Petición recibida del frontend: { strUsuario_t: '...', ... }
🔄 Enviando petición a Dyalogo...
✅ Respuesta recibida de Dyalogo
📦 Registros obtenidos: 5
```

Si hay errores:
```
❌ Error conectando con Dyalogo: <mensaje de error>
```

---

## 🛑 Detener el Servidor

```bash
# Presiona Ctrl+C en la terminal donde está corriendo
```

O si está en segundo plano, usa:
```bash
# Windows
taskkill /F /IM node.exe

# O encuentra el proceso específico
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🔒 Seguridad

### ⚠️ Notas Importantes

1. **Este proxy es solo para desarrollo local**
   - No lo uses en producción sin autenticación
   - Las credenciales están hardcodeadas en el código

2. **Para producción**:
   - Implementa autenticación (JWT, API keys)
   - Usa variables de entorno para credenciales
   - Agrega rate limiting
   - Implementa logging seguro

### 🔐 Mejorar Seguridad (Opcional)

Crear archivo `.env`:
```env
DYALOGO_USUARIO=2e7d6b2a06f38025e770c4350f1b5ee5
DYALOGO_TOKEN=03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c
DYALOGO_ID_G=4981
PORT=3000
```

Modificar `dyalogo-proxy.js`:
```javascript
require('dotenv').config();

const credentials = {
  strUsuario_t: process.env.DYALOGO_USUARIO,
  strToken_t: process.env.DYALOGO_TOKEN,
  intIdG_t: process.env.DYALOGO_ID_G
};
```

---

## 📝 Alternativas al Proxy

### Opción 1: CORS Extension (Solo para desarrollo)

Instalar extensión del navegador:
- Chrome: "Allow CORS: Access-Control-Allow-Origin"
- Firefox: "CORS Everywhere"

**⚠️ No recomendado**: Es inseguro y solo para pruebas rápidas.

### Opción 2: API Gateway en la Nube

Usar servicios como:
- AWS API Gateway
- Vercel Serverless Functions
- Netlify Functions
- Cloudflare Workers

### Opción 3: Backend en Node.js/Python

Implementar un backend completo que:
- Maneje la sincronización en el servidor
- Exponga endpoints seguros al frontend
- Almacene logs y auditoría

---

## 🚀 Próximos Pasos

1. ✅ El proxy está corriendo en `http://localhost:3000`
2. ✅ El servidor web está en `http://localhost:8080`
3. 🔄 Recarga la página: `http://localhost:8080/dyalogo-sync.html`
4. 🧪 Click en **"🔌 Probar Conexión"**
5. ✅ Debería funcionar sin errores de CORS

---

## ❓ Troubleshooting

### Error: "EADDRINUSE: address already in use"

El puerto 3000 ya está en uso. Opciones:

1. Detén el proceso que usa el puerto 3000:
   ```bash
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. O cambia el puerto en `server/dyalogo-proxy.js`:
   ```javascript
   const PORT = 3001;  // Usar otro puerto
   ```

   Y actualiza `config/dyalogo-webhook.config.js`:
   ```javascript
   apiUrl: 'http://localhost:3001/api/dyalogo',
   ```

### Error: "Cannot find module 'http'"

Node.js no está instalado correctamente. Reinstala Node.js desde https://nodejs.org/

---

**Implementado por**: Claude Code
**Fecha**: 22 de Diciembre de 2025
**Puerto**: 3000
**Propósito**: Evitar errores de CORS al consultar API de Dyalogo
