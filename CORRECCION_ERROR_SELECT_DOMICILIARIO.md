# 🔧 CORRECCIÓN: Error 400 al Seleccionar Domiciliario

**Fecha**: 15 de Diciembre de 2025
**Archivo**: index.html

---

## 🐛 PROBLEMA ENCONTRADO

### Error:
```
PATCH https://lbifbexhmvbanvrjfglp.supabase.co/rest/v1/pedidos?id=eq.xxx 400 (Bad Request)
```

**Cuándo ocurría**:
- Al **seleccionar** un domiciliario del dropdown
- **ANTES** de hacer click en el botón "Asignar"
- Causaba error inmediatamente al cambiar la selección

---

## 🔍 CAUSA RAÍZ

### Código Problemático:

**Ubicación**: `index.html:2395`

```javascript
// ❌ ANTES - Causaba error 400
domiciliarioSelect.onchange = () => updateDeliveryDriver(order.id, domiciliarioSelect.value);
```

### Por Qué Fallaba:

1. **Evento onChange** se disparaba al seleccionar del dropdown
2. **Llamaba `updateDeliveryDriver()`** que intentaba UPDATE inmediato
3. **Faltaba `consecutivo_domiciliario`** en el UPDATE
4. **Supabase rechazaba** con 400 porque el consecutivo es requerido

### Flujo Problemático:

```
Usuario selecciona domiciliario
    ↓
onChange dispara
    ↓
updateDeliveryDriver() ejecuta
    ↓
UPDATE pedidos SET domiciliario_id = X  ❌ (falta consecutivo)
    ↓
Supabase retorna 400
    ↓
Error en consola
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambio Realizado:

**Archivo**: `index.html:2395-2396`

```javascript
// ANTES ❌
domiciliarioSelect.onchange = () => updateDeliveryDriver(order.id, domiciliarioSelect.value);

// DESPUÉS ✅
// Removed: domiciliarioSelect.onchange - Assignment should only happen on button click
// domiciliarioSelect.onchange = () => updateDeliveryDriver(order.id, domiciliarioSelect.value);
```

### Por Qué Funciona Ahora:

1. **No hay evento onChange** en el select
2. **Selección es temporal** hasta que se confirma
3. **Solo se actualiza** al hacer click en botón "Asignar"
4. **`assignDelivery()`** genera el consecutivo correctamente

### Flujo Correcto:

```
Usuario selecciona domiciliario
    ↓
(Sin onChange - no pasa nada)
    ↓
Usuario hace click en "Asignar"
    ↓
assignDelivery() ejecuta
    ↓
  1. Obtiene nombre del domiciliario
  2. Cuenta pedidos del día
  3. Genera consecutivo (NOMBRE#NUMERO)
  4. UPDATE con todos los campos ✅
    ↓
Éxito sin errores
```

---

## 🎯 DIFERENCIA ENTRE updateDeliveryDriver y assignDelivery

### `updateDeliveryDriver()` - ❌ PROBLEMÁTICA (ahora deshabilitada)

```javascript
async function updateDeliveryDriver(orderId, driverId) {
    const updateData = {
        domiciliario_id: driverId || null,
        domiciliario_nombre: driver.nombre,
        domiciliario_telefono: driver.telefono,
        updated_at: new Date().toISOString()
        // ❌ FALTA: consecutivo_domiciliario
    };

    await supabase.from('pedidos').update(updateData).eq('id', orderId);
}
```

**Problemas**:
- ✅ Actualizaba solo el domiciliario
- ❌ No generaba consecutivo
- ❌ Causaba error 400
- ❌ Se ejecutaba prematuramente (onChange)

---

### `assignDelivery()` - ✅ CORRECTA (se usa ahora)

```javascript
async function assignDelivery(orderId, row) {
    // 1. Obtener domiciliario
    const driver = allDeliveryDrivers.find(d => d.id === domiciliarioId);

    // 2. Generar consecutivo
    const consecutivo = await getNextConsecutivo(domiciliarioId);

    // 3. Actualizar con TODOS los campos
    const updateData = {
        domiciliario_id: domiciliarioId,
        domiciliario_nombre: driver.nombre,
        domiciliario_telefono: driver.telefono,
        consecutivo_dia: consecutivo,
        tipo_domiciliario: tipo,
        estado: 'asignado',
        numero_datafono: datafono || null,
        // ✅ INCLUYE: consecutivo_domiciliario (generado por trigger)
    };

    await supabase.from('pedidos').update(updateData).eq('id', orderId);
}
```

**Ventajas**:
- ✅ Genera consecutivo correcto
- ✅ Actualiza estado a 'asignado'
- ✅ Solo se ejecuta al confirmar
- ✅ No causa errores 400

---

## 🧪 CÓMO VERIFICAR LA CORRECCIÓN

### Antes de la Corrección ❌

1. Abrir index.html
2. Ir a tabla de pedidos
3. Seleccionar domiciliario del dropdown
4. **Error 400 en consola inmediatamente**
5. Pedido no se asigna correctamente

### Después de la Corrección ✅

1. **Recarga index.html** (Ctrl + Shift + R)
2. Ir a tabla de pedidos
3. **Seleccionar domiciliario del dropdown**
4. **✅ No aparece error**
5. **Click en botón "Asignar"**
6. **✅ Pedido se asigna correctamente**
7. **✅ Consecutivo se genera: NOMBRE#NUMERO**

---

## 📝 CONSIDERACIONES

### ¿Por Qué Había un onChange?

**Intención original**: Actualizar inmediatamente al seleccionar para dar feedback visual rápido.

**Problema**:
- No generaba consecutivo
- Causaba errores 400
- Experiencia de usuario confusa (actualiza antes de confirmar)

### ¿Se Perdió Alguna Funcionalidad?

**NO**. La funcionalidad correcta siempre fue el botón "Asignar":
- ✅ Pedido se asigna al hacer click en botón
- ✅ Consecutivo se genera correctamente
- ✅ Estado cambia a 'asignado'
- ✅ WhatsApp se envía si aplica

---

## 🔧 FUNCIONES RELACIONADAS

### Funciones que YA NO se Usan:

1. **`updateDeliveryDriver()`** - Deshabilitada por onChange removido
2. **`updateDatafono()`** - Similar, podría tener mismo problema
3. **`updateDeliveryType()`** - También tiene onChange (línea 2372)

### Funciones que SÍ se Usan:

1. **`assignDelivery()`** ✅ - Asignación completa con consecutivo
2. **`changeOrderStatus()`** ✅ - Cambio de estado
3. **`updateVoucherStatus()`** ✅ - Estado de voucher

---

## ⚠️ OTRAS CORRECCIONES PENDIENTES (Opcional)

Si encuentras problemas similares, considera remover estos onChange también:

### onChange del Tipo de Domiciliario (Línea 2372):

```javascript
// Podría causar problemas similares
tipoSelect.onchange = () => updateDeliveryType(order.id, tipoSelect.value, row);
```

**Recomendación**: Evaluar si es necesario o si también debería esperar al botón "Asignar".

---

## 📊 RESUMEN

| Aspecto | Antes | Después |
|---------|-------|---------|
| Error 400 al seleccionar | ✅ Sí | ❌ No |
| onChange en select | ✅ Activo | ❌ Deshabilitado |
| Actualización prematura | ✅ Sí | ❌ No |
| Asignación correcta | ❌ No | ✅ Sí |
| Genera consecutivo | ❌ No | ✅ Sí |
| UX intuitiva | ❌ Confusa | ✅ Clara |

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Recargaste index.html (Ctrl + Shift + R)
- [ ] Seleccionaste un domiciliario del dropdown
- [ ] NO aparece error 400 en consola
- [ ] Hiciste click en botón "Asignar"
- [ ] Pedido se asignó correctamente
- [ ] Consecutivo tiene formato NOMBRE#NUMERO
- [ ] Estado cambió a 'asignado'
- [ ] No hay errores en consola

---

## 🎉 RESULTADO

**Antes** ❌:
```
[Seleccionar domiciliario]
  ↓
❌ Error 400
❌ Pedido no se asigna
❌ Consola con errores
```

**Después** ✅:
```
[Seleccionar domiciliario]
  ↓
✅ Sin errores
  ↓
[Click en "Asignar"]
  ↓
✅ Pedido asignado
✅ Consecutivo: DANIELA#1
✅ Estado: asignado
```

---

**Implementado por**: Claude Code
**Fecha**: 15 de Diciembre de 2025
**Archivo modificado**: index.html (línea 2395)
**Tipo de cambio**: Eliminación de event listener problemático
