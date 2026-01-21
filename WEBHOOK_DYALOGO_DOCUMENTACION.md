# 📡 Webhook Dyalogo → Fluxi

## 🎯 Descripción General

Este webhook permite importar pedidos automáticamente desde el sistema **Dyalogo** hacia **Fluxi**. Los pedidos se sincronizan de forma automática o manual, evitando duplicados y transformando los datos al formato correcto.

---

## 📂 Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `config/dyalogo-webhook.config.js` | Configuración, credenciales y mapeo de campos |
| `services/dyalogo-webhook.service.js` | Lógica de sincronización y consumo de API |
| `dyalogo-sync.html` | Interfaz de usuario para gestionar sincronización |
| `WEBHOOK_DYALOGO_DOCUMENTACION.md` | Este archivo (documentación completa) |

---

## 🔑 Credenciales de Acceso

### API de Dyalogo

```javascript
URL: http://addons.mercurio2.dyalogo.cloud:8080/dy_servicios_adicionales/svrs/dm/info/data

Credenciales:
{
  "strUsuario_t": "2e7d6b2a06f38025e770c4350f1b5ee5",
  "strToken_t": "03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c",
  "intIdG_t": "4981"
}
```

---

## 🗺️ Mapeo de Campos

| Campo en Fluxi | Campo en Dyalogo | Descripción |
|----------------|------------------|-------------|
| `cliente_nombre` | `G4981_C101366` + `G4981_C101367` | Nombres + Apellidos (con espacio) |
| `cliente_telefono` | `G4981_C101372` | Teléfono móvil (con prefijo +57) |
| `direccion_entrega` | `G4981_C101377` | Dirección de entrega |
| `barrio` | `G4981_C101380` | Barrio |
| `valor_pedido` | `G4981_C106387` | Valor del pedido |
| `valor_domicilio` | `G4981_C106388` | Valor del domicilio |
| `total` | Calculado | `valor_pedido + valor_domicilio` |
| `metodo_pago` | `'efectivo'` (por defecto) | Método de pago |
| `estado` | `'pendiente'` | Estado inicial del pedido |

---

## 🚀 Cómo Usar

### Opción 1: Interfaz Web (Recomendado)

1. **Abrir la interfaz de sincronización**:
   ```
   http://tu-servidor/dyalogo-sync.html
   ```

2. **Probar la conexión**:
   - Click en **"🔌 Probar Conexión"**
   - Verifica que aparezca "✅ Conexión exitosa"

3. **Sincronización Manual**:
   - Click en **"🔄 Sincronizar Ahora"**
   - Los pedidos se importarán inmediatamente

4. **Sincronización Automática**:
   - Configura el intervalo (ej: 5 minutos)
   - Click en **"▶️ Iniciar Auto-Sync"**
   - El sistema sincronizará automáticamente cada X minutos
   - Para detener: Click en **"⏸️ Detener Auto-Sync"**

---

### Opción 2: Desde Consola de Navegador

1. **Abrir `index.html` en el navegador**

2. **Abrir la consola** (F12)

3. **Cargar los scripts**:
   ```javascript
   // Cargar configuración
   const script1 = document.createElement('script');
   script1.src = 'config/dyalogo-webhook.config.js';
   document.head.appendChild(script1);

   // Cargar servicio
   const script2 = document.createElement('script');
   script2.src = 'services/dyalogo-webhook.service.js';
   document.head.appendChild(script2);
   ```

4. **Esperar unos segundos y ejecutar**:
   ```javascript
   // Inicializar servicio
   const webhookService = new DyalogoWebhookService(DyalogoWebhookConfig);

   // Sincronizar pedidos
   const result = await webhookService.syncOrders();
   console.log('Resultado:', result);
   ```

---

## 📝 Ejemplo de Uso Programático

### Sincronización Simple

```javascript
// Crear instancia del servicio
const webhookService = new DyalogoWebhookService(DyalogoWebhookConfig);

// Sincronizar pedidos de hoy
const result = await webhookService.syncOrders();

console.log(`
  Obtenidos de Dyalogo: ${result.fetched}
  Creados en Fluxi: ${result.created}
  Duplicados (omitidos): ${result.duplicates}
  Errores: ${result.errors.length}
`);
```

### Sincronización con Opciones

```javascript
// Sincronizar solo los últimos 10 pedidos
const result = await webhookService.syncOrders({
  limit: 10
});

// Sincronizar desde una fecha específica
const result = await webhookService.syncOrders({
  fromDate: new Date('2025-12-15')
});
```

### Auto-Sincronización

```javascript
// Iniciar sincronización automática cada 3 minutos
webhookService.startAutoSync(3 * 60 * 1000);

// Detener auto-sincronización
webhookService.stopAutoSync();

// Ver estado
const status = webhookService.getStatus();
console.log(status);
```

### Llenar Formulario Manualmente

```javascript
// Obtener un registro de Dyalogo
const records = await webhookService.fetchFromDyalogo(1);

// Llenar el formulario de "Nuevo Pedido" con ese registro
webhookService.fillOrderForm(records[0]);
```

---

## 🔍 Ejemplo con Datos de Hoy

### Petición a Dyalogo (POST)

```json
{
  "strUsuario_t": "2e7d6b2a06f38025e770c4350f1b5ee5",
  "strToken_t": "03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c",
  "intIdG_t": "4981",
  "strSQLWhere_t": "G4981_C101301 >= '2025-12-22 00:00:00'",
  "intLimit_t": "2"
}
```

### Respuesta Simulada de Dyalogo

```json
{
  "data": [
    {
      "G4981_C101366": "Carlos",
      "G4981_C101367": "Rodríguez",
      "G4981_C101372": "3001234567",
      "G4981_C101377": "Calle 123 #45-67, Apto 501",
      "G4981_C101380": "Chapinero",
      "G4981_C106387": "45000",
      "G4981_C106388": "5000",
      "G4981_C101301": "2025-12-22 10:30:00"
    },
    {
      "G4981_C101366": "María",
      "G4981_C101367": "González",
      "G4981_C101372": "3109876543",
      "G4981_C101377": "Carrera 15 #78-90, Casa 12",
      "G4981_C101380": "Usaquén",
      "G4981_C106387": "65000",
      "G4981_C106388": "8000",
      "G4981_C101301": "2025-12-22 11:15:00"
    }
  ]
}
```

### Datos Transformados para Fluxi

```javascript
[
  {
    cliente_nombre: "Carlos Rodríguez",
    cliente_telefono: "+573001234567",
    direccion_entrega: "Calle 123 #45-67, Apto 501",
    barrio: "Chapinero",
    valor_pedido: 45000,
    valor_domicilio: 5000,
    total: 50000,
    metodo_pago: "efectivo",
    notas: "Pedido importado desde Dyalogo"
  },
  {
    cliente_nombre: "María González",
    cliente_telefono: "+573109876543",
    direccion_entrega: "Carrera 15 #78-90, Casa 12",
    barrio: "Usaquén",
    valor_pedido: 65000,
    valor_domicilio: 8000,
    total: 73000,
    metodo_pago: "efectivo",
    notas: "Pedido importado desde Dyalogo"
  }
]
```

### Pedidos Creados en Supabase (tabla `pedidos`)

```sql
INSERT INTO pedidos (
  cliente_nombre,
  cliente_telefono,
  direccion_entrega,
  barrio,
  valor_pedido,
  valor_domicilio,
  total,
  metodo_pago,
  notas,
  estado,
  domiciliario_id,
  tipo_domiciliario,
  created_at
) VALUES
(
  'Carlos Rodríguez',
  '+573001234567',
  'Calle 123 #45-67, Apto 501',
  'Chapinero',
  45000,
  5000,
  50000,
  'efectivo',
  'Pedido importado desde Dyalogo',
  'pendiente',
  NULL,
  'propio',
  '2025-12-22 15:45:30'
),
(
  'María González',
  '+573109876543',
  'Carrera 15 #78-90, Casa 12',
  'Usaquén',
  65000,
  8000,
  73000,
  'efectivo',
  'Pedido importado desde Dyalogo',
  'pendiente',
  NULL,
  'propio',
  '2025-12-22 15:45:31'
);
```

---

## 🔧 Configuración Avanzada

### Modificar Intervalo de Auto-Sync

Editar `config/dyalogo-webhook.config.js`:

```javascript
syncConfig: {
  autoSyncInterval: 180000,  // 3 minutos (en milisegundos)
  defaultLimit: 100,          // Traer hasta 100 pedidos por sync
  daysBack: 1,                // Consultar pedidos de ayer y hoy
  defaultPaymentMethod: 'datafono'  // Cambiar método de pago por defecto
}
```

### Modificar Mapeo de Campos

Si Dyalogo cambia los códigos de campos:

```javascript
fieldMapping: {
  clienteNombres: 'G4981_C101366',      // ← Cambiar aquí
  clienteApellidos: 'G4981_C101367',
  // ... etc
}
```

### Agregar Validaciones Personalizadas

Editar `services/dyalogo-webhook.service.js`, método `transformRecords()`:

```javascript
transformRecords(dyalogoRecords) {
  const transformed = dyalogoRecords
    .map(record => this.config.transformToFluxiFormat(record))
    .filter(record => {
      // ✅ Validación personalizada
      if (!record) return false;

      // Solo importar pedidos con valor > $10,000
      if (record.valor_pedido < 10000) {
        console.warn('Pedido omitido por valor bajo:', record);
        return false;
      }

      // Solo importar pedidos con teléfono válido
      if (!record.cliente_telefono.startsWith('+57')) {
        console.warn('Pedido omitido por teléfono inválido:', record);
        return false;
      }

      return true;
    });

  return transformed;
}
```

---

## 🛡️ Detección de Duplicados

El sistema evita crear pedidos duplicados comparando:

- **Teléfono del cliente** (`cliente_telefono`)
- **Dirección de entrega** (`direccion_entrega`)
- **Fecha**: Solo en las últimas 24 horas

Si encuentra un pedido con el mismo teléfono y dirección en las últimas 24h, **lo omite** y lo marca como duplicado en el log.

---

## 🔍 Logs y Monitoreo

### Ver Logs en la Interfaz

La interfaz `dyalogo-sync.html` muestra logs en tiempo real:

- 🔵 **Info**: Operaciones normales
- 🟢 **Success**: Operaciones exitosas
- 🟡 **Warning**: Advertencias (ej: duplicados)
- 🔴 **Error**: Errores

### Ver Historial de Sincronizaciones

```javascript
const history = webhookService.getSyncHistory(10); // Últimas 10
console.table(history);
```

### Logs en Consola del Navegador

Todos los eventos se registran en la consola con el prefijo `📡`, `✅`, `⚠️` o `❌`.

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si hay un error de red con Dyalogo?

El sistema registra el error en el log y continúa. No detiene el auto-sync. En el próximo intento, volverá a consultar.

### ¿Los pedidos importados quedan asignados a un domiciliario?

No. Los pedidos se crean con estado `'pendiente'` y `domiciliario_id = null`. El administrador debe asignarlos manualmente desde el panel de Fluxi.

### ¿Puedo cambiar el método de pago por defecto?

Sí. Edita `config/dyalogo-webhook.config.js`:

```javascript
syncConfig: {
  defaultPaymentMethod: 'rappi'  // ← Cambiar aquí
}
```

### ¿Cómo sé si la sincronización funcionó?

Verifica en el panel de Fluxi (`index.html`) que aparezcan nuevos pedidos en estado "Pendientes".

### ¿Puedo sincronizar pedidos de fechas anteriores?

Sí. Ajusta `daysBack`:

```javascript
syncConfig: {
  daysBack: 7  // Consultar pedidos de los últimos 7 días
}
```

O usa sincronización manual con fecha específica:

```javascript
webhookService.syncOrders({
  fromDate: new Date('2025-12-01')
});
```

---

## 🧪 Pruebas

### 1. Probar Conexión a Dyalogo

```javascript
const records = await webhookService.fetchFromDyalogo(1);
console.log('✅ Conexión exitosa:', records);
```

### 2. Probar Transformación de Datos

```javascript
const records = await webhookService.fetchFromDyalogo(1);
const transformed = webhookService.transformRecords(records);
console.log('Datos transformados:', transformed);
```

### 3. Probar Creación en Fluxi (Sin Guardar)

```javascript
const testOrder = {
  cliente_nombre: "Test Usuario",
  cliente_telefono: "+573001111111",
  direccion_entrega: "Calle Test 123",
  barrio: "Test Barrio",
  valor_pedido: 30000,
  valor_domicilio: 5000,
  total: 35000,
  metodo_pago: "efectivo",
  notas: "Pedido de prueba"
};

console.log('Datos de prueba:', testOrder);
// No ejecutar createOrderInFluxi() en pruebas
```

---

## 📊 Estructura del Código

```
Fluxi_New-main/
├── config/
│   └── dyalogo-webhook.config.js    ← Configuración y mapeo
├── services/
│   └── dyalogo-webhook.service.js   ← Lógica de sincronización
├── dyalogo-sync.html                ← Interfaz de usuario
└── WEBHOOK_DYALOGO_DOCUMENTACION.md ← Esta documentación
```

---

## 🎯 Próximos Pasos Sugeridos

1. **Integrar en el Panel de Admin**:
   - Agregar botón "🔄 Sincronizar Dyalogo" en `index.html`
   - Mostrar contador de pedidos importados hoy

2. **Notificaciones**:
   - Enviar notificación al administrador cuando se importen nuevos pedidos
   - Email o WhatsApp con resumen de sincronización

3. **Webhook Inverso** (Fluxi → Dyalogo):
   - Cuando un pedido se complete en Fluxi, actualizar estado en Dyalogo

4. **API Backend (Opcional)**:
   - Implementar endpoint Node.js/Python para sincronización en servidor
   - Evitar exponer credenciales en el frontend

---

## 🤝 Soporte

Para modificaciones o ajustes al webhook:

1. Revisa esta documentación
2. Consulta los comentarios en el código
3. Prueba en la consola del navegador antes de modificar

---

**Implementado por**: Claude Code
**Fecha**: 22 de Diciembre de 2025
**Versión**: 1.0
**Archivos**: 4 archivos creados (config, service, HTML, documentación)
