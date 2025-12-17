# 🔧 CORRECCIÓN: Asignación de Pedidos y Consecutivo

**Fecha**: 15 de Diciembre de 2025

---

## 🐛 PROBLEMAS ENCONTRADOS

### 1. Error 400 al Asignar Pedido

**Error Original**:
```
Failed to load resource: the server responded with a status of 400
❌ Error al actualizar pedido
```

**Causa Raíz**:
El BaseRepository intentaba importar Supabase desde el archivo ES6 modules (`supabase.config.js`), pero la aplicación usa el cliente UMD global (`window.supabaseClient`).

```javascript
// ❌ ANTES - Causaba error 400
import { supabase } from '../core/config/supabase.config.js';
this.db = supabase;  // undefined en runtime
```

### 2. Falta de Consecutivo al Asignar

**Problema**:
Al asignar un pedido a un domiciliario, no se generaba el consecutivo con formato `NOMBRE#NUMERO`.

**Comportamiento Anterior**:
```
consecutivo_domiciliario: null
```

**Comportamiento Esperado**:
```
consecutivo_domiciliario: "DANIELA#1"
consecutivo_domiciliario: "DANIELA#2"
consecutivo_domiciliario: "CARLOS#1"
```

---

## ✅ SOLUCIONES IMPLEMENTADAS

### Solución 1: Corregir Referencia a Supabase

**Archivo**: [src/repositories/base.repository.js](src/repositories/base.repository.js:1-10)

**ANTES** ❌:
```javascript
import { supabase } from '../core/config/supabase.config.js';
import { APP_CONFIG } from '../core/config/app.config.js';

export class BaseRepository {
    constructor(tableName) {
        this.table = tableName;
        this.db = supabase;  // ❌ undefined - causa error 400
    }
}
```

**DESPUÉS** ✅:
```javascript
import { APP_CONFIG } from '../core/config/app.config.js';

export class BaseRepository {
    constructor(tableName) {
        this.table = tableName;
        // Use global Supabase client from admin.html
        this.db = window.supabaseClient;  // ✅ Cliente correcto
    }
}
```

**Beneficios**:
- ✅ Usa el cliente Supabase correcto (UMD)
- ✅ Elimina error 400 en operaciones de actualización
- ✅ Consistente con el resto de la aplicación

---

### Solución 2: Generar Consecutivo al Asignar

**Archivo**: [src/repositories/order.repository.js](src/repositories/order.repository.js:229-268)

**ANTES** ❌:
```javascript
async assignToDelivery(orderId, deliveryId) {
    return this.update(orderId, {
        domiciliario_id: deliveryId,
        estado: 'asignado',
        // ❌ No generaba consecutivo_domiciliario
    });
}
```

**DESPUÉS** ✅:
```javascript
async assignToDelivery(orderId, deliveryId) {
    try {
        // 1. Get delivery person name
        const { data: delivery } = await this.db
            .from('domiciliarios')
            .select('nombre')
            .eq('id', deliveryId)
            .single();

        // 2. Count today's orders for this delivery person
        const today = new Date().toISOString().split('T')[0];
        const { data: todayOrders } = await this.db
            .from(this.table)
            .select('id')
            .eq('domiciliario_id', deliveryId)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

        // 3. Calculate next number for today
        const orderNumber = (todayOrders?.length || 0) + 1;

        // 4. Generate consecutivo: NOMBRE#NUMERO
        const consecutivo = `${delivery.nombre.toUpperCase()}#${orderNumber}`;

        // 5. Update order with assignment and consecutivo
        return this.update(orderId, {
            domiciliario_id: deliveryId,
            estado: 'asignado',
            consecutivo_domiciliario: consecutivo,  // ✅ Generado automáticamente
        });
    } catch (error) {
        console.error('assignToDelivery failed:', error);
        throw error;
    }
}
```

**Cómo Funciona**:

1. **Obtiene el nombre del domiciliario** de la tabla `domiciliarios`
2. **Cuenta los pedidos del día** para ese domiciliario
3. **Calcula el siguiente número** (cantidad + 1)
4. **Genera el consecutivo** en formato `NOMBRE#NUMERO`
5. **Actualiza el pedido** con domiciliario, estado y consecutivo

**Ejemplos**:

```javascript
// Primer pedido del día para Daniela
Domiciliario: Daniela (ID: 1)
Pedidos hoy: 0
Consecutivo generado: "DANIELA#1"

// Segundo pedido del día para Daniela
Domiciliario: Daniela (ID: 1)
Pedidos hoy: 1
Consecutivo generado: "DANIELA#2"

// Primer pedido del día para Carlos
Domiciliario: Carlos (ID: 2)
Pedidos hoy: 0
Consecutivo generado: "CARLOS#1"
```

---

## 🧪 CÓMO PROBAR

### Prueba Manual

1. **Recarga la página** con Ctrl + Shift + R
2. **Ve a Pedidos**
3. **Crea un pedido nuevo** o usa uno pendiente
4. **Asigna a un domiciliario**
5. **Verifica en consola**:
   ```
   ✅ No debe haber error 400
   ✅ Debe mostrar: "Pedido asignado correctamente"
   ```
6. **Verifica el consecutivo** en la tabla:
   ```
   Consecutivo: DANIELA#1 (o el nombre del domiciliario)
   ```

### Prueba desde Consola

```javascript
// 1. Navegar a Pedidos
window.location.hash = '#/orders'

// 2. Esperar carga
await new Promise(r => setTimeout(r, 1000))

// 3. Obtener controller
const ctrl = getCurrentController()

// 4. Verificar que OrderService está disponible
console.log('Has orderService:', !!ctrl.orderService)

// 5. Probar asignación (usa IDs reales de tu DB)
const testOrderId = 1  // ID de un pedido pendiente
const testDeliveryId = 1  // ID de un domiciliario

try {
    await ctrl.orderService.assignOrder(testOrderId, testDeliveryId)
    console.log('✅ Asignación exitosa')
} catch (error) {
    console.error('❌ Error:', error)
}
```

---

## 📊 VERIFICACIÓN DE BASE DE DATOS

### Query SQL para Verificar Consecutivos

```sql
-- Ver pedidos asignados hoy con consecutivo
SELECT
    p.id,
    p.cliente,
    p.consecutivo_domiciliario,
    d.nombre as domiciliario,
    p.estado,
    p.created_at
FROM pedidos p
LEFT JOIN domiciliarios d ON p.domiciliario_id = d.id
WHERE p.created_at >= CURRENT_DATE
  AND p.estado IN ('asignado', 'en_camino', 'entregado')
ORDER BY p.domiciliario_id, p.created_at;
```

**Resultado Esperado**:
```
id | cliente      | consecutivo_domiciliario | domiciliario | estado
---|--------------|--------------------------|--------------|----------
1  | Juan Pérez   | DANIELA#1                | Daniela      | asignado
2  | Ana García   | DANIELA#2                | Daniela      | en_camino
3  | Luis Torres  | CARLOS#1                 | Carlos       | asignado
4  | María López  | CARLOS#2                 | Carlos       | entregado
```

---

## 🔍 DEBUGGING

### Si Aún Aparece Error 400

**1. Verificar que window.supabaseClient existe**:
```javascript
console.log('Supabase Client:', window.supabaseClient)
// Debe retornar: SupabaseClient {url: "...", key: "..."}
```

**2. Verificar que BaseRepository lo usa**:
```javascript
import { OrderRepository } from './src/repositories/order.repository.js'
const repo = new OrderRepository()
console.log('DB Client:', repo.db)
// Debe retornar: SupabaseClient {url: "...", key: "..."}
```

**3. Ver error completo en Network tab**:
- Abrir DevTools → Network
- Filtrar por "pedidos"
- Intentar asignar pedido
- Ver detalles del request que falla (400)
- Revisar Request Payload y Response

---

### Si el Consecutivo No Se Genera

**1. Verificar que el domiciliario existe**:
```javascript
const { data, error } = await window.supabaseClient
    .from('domiciliarios')
    .select('*')
    .eq('id', 1)  // ID del domiciliario

console.log('Domiciliario:', data)
```

**2. Verificar permisos en tabla pedidos**:
```sql
-- En Supabase SQL Editor
SELECT * FROM information_schema.table_privileges
WHERE table_name = 'pedidos';
```

**3. Verificar que el campo existe**:
```sql
-- Verificar columna consecutivo_domiciliario
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pedidos'
  AND column_name = 'consecutivo_domiciliario';
```

---

## 📝 NOTAS TÉCNICAS

### Por Qué window.supabaseClient y No Import

**Razón 1: Compatibilidad con HTML Estático**
- admin.html carga Supabase desde CDN (UMD)
- No usa bundler (Webpack/Vite)
- Los imports ES6 no resuelven correctamente el cliente UMD

**Razón 2: Configuración Centralizada**
- `window.supabaseClient` se inicializa en un solo lugar (admin.html)
- Todos los repositorios usan la misma instancia
- No hay conflictos de configuración

**Razón 3: Debug Más Fácil**
- Puedes acceder desde consola: `window.supabaseClient`
- Fácil verificar estado y configuración
- Consistente con el resto de la aplicación

---

### Formato del Consecutivo

**Decisión de Diseño**:
```
NOMBRE#NUMERO
```

**Alternativas Consideradas**:
```
nombre#numero           ❌ Difícil de leer
NOMBRE-NUMERO           ❌ Menos visual
NOMBRE_NUMERO           ❌ Confunde con snake_case
NOMBRE#NUMERO           ✅ Elegido - Claro y conciso
```

**Ventajas**:
- ✅ Fácil de leer visualmente
- ✅ `#` es universal para "número"
- ✅ Nombres en mayúsculas destacan
- ✅ Fácil de parsear si se necesita

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de implementar las correcciones, verifica:

- [ ] No aparece error 400 al asignar pedido
- [ ] Pedido cambia a estado "asignado"
- [ ] Se genera consecutivo_domiciliario
- [ ] Formato es "NOMBRE#NUMERO"
- [ ] Número incrementa correctamente
- [ ] Diferentes domiciliarios tienen numeración independiente
- [ ] Al día siguiente, numeración resetea a #1
- [ ] Consola no muestra errores
- [ ] UI se actualiza correctamente

---

## 🎉 RESULTADO ESPERADO

**Antes** ❌:
```
Error 400
consecutivo_domiciliario: null
```

**Después** ✅:
```
✅ Pedido asignado correctamente
consecutivo_domiciliario: "DANIELA#1"
estado: "asignado"
domiciliario_id: 1
```

---

**Implementado por**: Claude Code
**Fecha**: 15 de Diciembre de 2025
**Archivos modificados**:
- src/repositories/base.repository.js
- src/repositories/order.repository.js
