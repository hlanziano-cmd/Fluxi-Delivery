# Fix: Corrección de llamados a showAlert()

## Problema
La función `showAlert()` requiere **3 parámetros**:
```javascript
function showAlert(containerId, type, message)
```

Sin embargo, había varios llamados que solo pasaban 2 parámetros, causando el error:
```
Uncaught (in promise) TypeError: Cannot set properties of null (setting 'innerHTML')
```

## Cambios Realizados

### 1. Módulo de Consulta de Pedidos - Sincronización Histórica

**Línea 4307** - ✅ Validación de fecha
```javascript
// ANTES (2 parámetros):
showAlert('Por favor selecciona una "Fecha Desde" para sincronizar', 'warning');

// DESPUÉS (3 parámetros):
showAlert('search-alert', 'error', 'Por favor selecciona una "Fecha Desde" para sincronizar');
```

**Línea 4364** - ✅ Mensaje de éxito
```javascript
// ANTES (2 parámetros):
showAlert(msg.replace(/\s+/g, ' '), 'success');

// DESPUÉS (3 parámetros):
showAlert('search-alert', 'success', msg.replace(/\s+/g, ' '));
```

**Línea 4382** - ✅ Mensaje de error
```javascript
// ANTES (2 parámetros):
showAlert('Error al sincronizar: ' + error.message, 'danger');

// DESPUÉS (3 parámetros):
showAlert('search-alert', 'danger', 'Error al sincronizar: ' + error.message);
```

### 2. Función updateDyalogoStatus - Línea 5543

**Problema**: Esta función se llama desde múltiples contextos (módulo de pedidos, consulta, configuración, auto-sync), cada uno con su propio `containerId`.

**Solución**: Eliminé el `showAlert()` de esta función. Ahora cada llamador decide si mostrar alerta según su contexto.

```javascript
// ANTES:
function updateDyalogoStatus(result) {
    // ... actualizar estado ...

    if (result.created > 0) {
        showAlert(`✅ ${result.created} nuevo(s) pedido(s) importado(s) desde Dyalogo`, 'success');
    }
}

// DESPUÉS:
function updateDyalogoStatus(result) {
    // ... actualizar estado ...

    // No mostramos alerta aquí porque esta función se llama desde múltiples contextos
    // Cada llamador decidirá si mostrar alerta según su propio containerId
}
```

### 3. Módulo de Pedidos - Botón Actualizar (Línea 3447)

Agregué alerta cuando el botón "Actualizar" importa nuevos pedidos desde Dyalogo:

```javascript
const result = await window.webhookService.syncOrders({ limit: 100 });
updateDyalogoStatus(result);

// Mostrar alerta si hay nuevos pedidos
if (result.created > 0) {
    showAlert('orders-alert', 'success', `📡 ${result.created} nuevo(s) pedido(s) importado(s) desde Dyalogo`);
}
```

### 4. Módulo de Configuración - Sincronización Manual

**Línea 1170** - Agregué contenedor de alertas:
```html
<div class="card" style="margin-top: 20px;">
    <h4 style="margin-bottom: 15px;">🔄 Sincronización con Dyalogo</h4>
    <div id="dyalogo-config-alert"></div>  <!-- NUEVO -->
    <div class="alert alert-info">
        ...
```

**Línea 5617** - Mensaje de éxito:
```javascript
const result = await webhookService.syncOrders({ limit: 100 });
updateDyalogoStatus(result);

// Mostrar resultado
const msg = `✅ Sincronización completada: ${result.fetched} obtenidos, ${result.created} nuevos, ${result.duplicates} duplicados`;
showAlert('dyalogo-config-alert', 'success', msg);
```

**Línea 5632** - Mensaje de error:
```javascript
// ANTES (2 parámetros):
showAlert('Error al sincronizar con Dyalogo: ' + error.message, 'danger');

// DESPUÉS (3 parámetros):
showAlert('dyalogo-config-alert', 'danger', 'Error al sincronizar con Dyalogo: ' + error.message);
```

## Resumen

- ✅ **Total de correcciones**: 5 llamados a showAlert() + 1 contenedor HTML nuevo
- ✅ **Archivos modificados**: index.html
- ✅ **Módulos afectados**:
  - Consulta de Pedidos (sincronización histórica)
  - Gestión de Pedidos (botón Actualizar)
  - Configuración (sincronización manual)
- ✅ **Verificación**: Todos los 53 llamados a `showAlert()` ahora tienen correctamente 3 parámetros

## Próximos Pasos

1. Recargar la página en el navegador (Ctrl+Shift+R)
2. Probar sincronización histórica desde "Consulta de Pedidos"
3. Probar sincronización manual desde "Configuración"
4. Verificar que no aparezcan errores de "Cannot set properties of null"
