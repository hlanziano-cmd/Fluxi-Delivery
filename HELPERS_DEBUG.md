# 🛠️ HELPERS DE DEBUG - FLUXI DELIVERY

Funciones globales disponibles en la consola del navegador para inspeccionar y debuggear la aplicación.

---

## 🎯 FUNCIONES DISPONIBLES

### 1. `getCurrentController()`

Obtiene el controller actualmente activo de forma segura.

**Uso**:
```javascript
getCurrentController()
```

**Retorna**:
- El controller actual si está cargado
- `null` si no hay controller cargado

**Ejemplo**:
```javascript
> getCurrentController()
✅ Current Controller: CuadreCajaController
< CuadreCajaController {authService: AuthService, orderService: OrderService, ...}
```

**Errores Comunes**:
```javascript
> getCurrentController()
⚠️ No controller loaded yet. Navigate to a route first.
< null
```

**Solución**: Navega a una vista usando el menú antes de ejecutar.

---

### 2. `inspectController()`

Inspecciona el controller actual y muestra sus propiedades principales.

**Uso**:
```javascript
inspectController()
```

**Retorna**:
- Información detallada del controller
- `null` si no hay controller

**Ejemplo - Controller con Arquitectura Correcta** ✅:
```javascript
> inspectController()
✅ Current Controller: CuadreCajaController
📊 Controller Inspection:
  Name: CuadreCajaController
  Has authService: true
  Has orderService: true
  Has deliveryService: true
  Has userService: false
  Has destroy(): true
  Has supabase (direct access): false
✅ Controller uses Services (no direct DB access)
< CuadreCajaController {...}
```

**Ejemplo - Controller con Acceso Directo a DB** ⚠️:
```javascript
> inspectController()
✅ Current Controller: BadController
📊 Controller Inspection:
  Name: BadController
  Has authService: false
  Has orderService: false
  Has deliveryService: false
  Has userService: false
  Has destroy(): false
  Has supabase (direct access): true
⚠️ WARNING: Controller has direct Supabase access! Should use Services instead.
< BadController {...}
```

---

### 3. `window.appRouter`

Acceso directo al router de la aplicación.

**Uso**:
```javascript
window.appRouter.currentController
```

**⚠️ IMPORTANTE**: Solo usar DESPUÉS de que la página haya cargado completamente.

**Uso Seguro**:
```javascript
// ❌ NO HACER - puede fallar si se ejecuta muy rápido
window.appRouter.currentController

// ✅ HACER - usa el helper
getCurrentController()
```

**Propiedades**:
```javascript
window.appRouter.routes          // Object con todas las rutas
window.appRouter.currentController  // Controller actual
```

---

## 📋 CASOS DE USO

### Caso 1: Verificar que Controller usa Services

**Objetivo**: Asegurar que no hay acceso directo a Supabase

```javascript
// 1. Navega a la vista que quieres probar
// 2. Ejecuta:
inspectController()

// 3. Verifica que dice:
// ✅ Controller uses Services (no direct DB access)
```

**✅ Correcto**:
```
Has authService: true
Has orderService: true
Has deliveryService: true
Has supabase (direct access): false
```

**❌ Incorrecto**:
```
Has authService: false
Has supabase (direct access): true
⚠️ WARNING: Controller has direct Supabase access!
```

---

### Caso 2: Verificar método destroy()

**Objetivo**: Asegurar que todos los Controllers limpian recursos

```javascript
// 1. Navega a cualquier vista
inspectController()

// 2. Verifica:
// Has destroy(): true
```

**Prueba funcional**:
```javascript
// 1. Ir a Cuadre de Caja
inspectController()
// Has destroy(): true ✅

// 2. Navegar a Pedidos
// La consola debe mostrar:
// [CuadreCajaController] Destroyed

// 3. Verificar nuevo controller
inspectController()
// Name: OrdersController ✅
```

---

### Caso 3: Explorar propiedades del Controller

**Objetivo**: Ver todas las propiedades disponibles

```javascript
const ctrl = getCurrentController()

// Ver todas las propiedades
console.log(Object.keys(ctrl))

// Acceder a services
ctrl.authService
ctrl.orderService
ctrl.deliveryService

// Ver métodos disponibles
typeof ctrl.loadDeliveries        // 'function'
typeof ctrl.calculateCuadre       // 'function'
typeof ctrl.destroy              // 'function'
```

---

### Caso 4: Simular navegación programática

**Objetivo**: Cambiar de vista desde la consola

```javascript
// Cambiar a Cuadre de Caja
window.location.hash = '#/cuadre-caja'

// Esperar 1 segundo para que cargue
setTimeout(() => {
    inspectController()
}, 1000)

// O en una línea con async/await
(async () => {
    window.location.hash = '#/tiempos-espera'
    await new Promise(r => setTimeout(r, 1000))
    inspectController()
})()
```

---

## 🔍 DEBUGGING AVANZADO

### Ver el estado completo del Router

```javascript
console.log('Router:', window.appRouter)
console.log('Routes registered:', Object.keys(window.appRouter.routes))
console.log('Current controller:', window.appRouter.currentController)
```

**Output esperado**:
```
Router: Router {routes: {...}, currentController: CuadreCajaController}
Routes registered: ['/users', '/deliveries', '/orders', '/order-history',
                    '/reports', '/cuadre-caja', '/tiempos-espera', '/settings']
Current controller: CuadreCajaController {authService: AuthService, ...}
```

---

### Verificar que todas las rutas están registradas

```javascript
Object.keys(window.appRouter.routes).forEach(route => {
    console.log(`✅ ${route}`)
})
```

**Output esperado**:
```
✅ /users
✅ /deliveries
✅ /orders
✅ /order-history
✅ /reports
✅ /cuadre-caja
✅ /tiempos-espera
✅ /settings
```

---

### Probar destroy() manualmente

```javascript
const ctrl = getCurrentController()

// Ver si tiene destroy
console.log('Has destroy:', typeof ctrl.destroy === 'function')

// Llamar destroy manualmente (CUIDADO: puede romper la vista actual)
ctrl.destroy()

// La consola debería mostrar:
// [NombreController] Destroyed
```

---

## 🧪 TESTS AUTOMATIZADOS EN CONSOLA

### Test Suite Completo

```javascript
async function testAllControllers() {
    const routes = [
        '/users',
        '/deliveries',
        '/orders',
        '/order-history',
        '/reports',
        '/cuadre-caja',
        '/tiempos-espera',
        '/settings'
    ];

    console.log('🧪 Testing all controllers...\n');

    for (const route of routes) {
        // Navegar a la ruta
        window.location.hash = '#' + route;

        // Esperar carga
        await new Promise(r => setTimeout(r, 1500));

        // Inspeccionar
        const ctrl = getCurrentController();
        if (!ctrl) {
            console.error(`❌ ${route}: Controller not loaded`);
            continue;
        }

        const name = ctrl.constructor.name;
        const hasAuth = !!ctrl.authService;
        const hasDestroy = typeof ctrl.destroy === 'function';
        const hasSupabase = !!ctrl.supabase;

        console.log(`\n📍 Route: ${route}`);
        console.log(`   Name: ${name}`);
        console.log(`   AuthService: ${hasAuth ? '✅' : '❌'}`);
        console.log(`   destroy(): ${hasDestroy ? '✅' : '❌'}`);
        console.log(`   Direct DB: ${hasSupabase ? '⚠️ YES (bad)' : '✅ NO (good)'}`);
    }

    console.log('\n\n✅ Test complete!');
}

// Ejecutar
testAllControllers();
```

---

## ⚠️ PROBLEMAS COMUNES

### Error: "Cannot read properties of undefined"

**Causa**: Intentas acceder a `window.appRouter` antes de que se inicialice.

**Solución**:
```javascript
// ❌ NO HACER
window.appRouter.currentController

// ✅ HACER
getCurrentController()
```

---

### Warning: "No controller loaded yet"

**Causa**: No has navegado a ninguna vista aún.

**Solución**:
1. Haz click en cualquier opción del menú (Usuarios, Cuadre de Caja, etc.)
2. Luego ejecuta `inspectController()`

---

### Controller retorna null

**Causa**: La vista aún no terminó de cargar.

**Solución**:
```javascript
// Esperar 1 segundo
setTimeout(() => {
    inspectController()
}, 1000)
```

---

## 📚 REFERENCIA RÁPIDA

| Comando | Uso | Retorna |
|---------|-----|---------|
| `getCurrentController()` | Obtener controller actual | Controller o null |
| `inspectController()` | Inspeccionar controller | Información + Controller |
| `window.appRouter` | Acceso al router | Router object |
| `window.appRouter.routes` | Ver rutas registradas | Object |
| `window.appRouter.currentController` | Controller actual (unsafe) | Controller o undefined |

---

## ✅ VERIFICACIÓN DE ARQUITECTURA

**Checklist para cada Controller**:

```javascript
inspectController()

// Debe mostrar:
✅ Has authService: true
✅ Has orderService: true (si usa pedidos)
✅ Has deliveryService: true (si usa domiciliarios)
✅ Has destroy(): true
✅ Has supabase (direct access): false
✅ Controller uses Services (no direct DB access)
```

---

## 🎓 TIPS PRO

### 1. Guardar referencia al controller

```javascript
// Guardar para uso posterior
const ctrl = getCurrentController()
window.myCtrl = ctrl

// Ahora puedes acceder desde cualquier parte
window.myCtrl.calculateCuadre()
```

### 2. Watch para cambios de controller

```javascript
let lastController = null;

setInterval(() => {
    const current = window.appRouter?.currentController;
    if (current !== lastController) {
        console.log('🔄 Controller changed:', current?.constructor.name);
        lastController = current;
    }
}, 1000);
```

### 3. Log automático de navegación

```javascript
window.addEventListener('hashchange', () => {
    console.log('🧭 Navigated to:', window.location.hash);
    setTimeout(() => inspectController(), 500);
});
```

---

**Creado por**: Claude Code
**Fecha**: 15 de Diciembre de 2025
**Versión**: 1.0.0
