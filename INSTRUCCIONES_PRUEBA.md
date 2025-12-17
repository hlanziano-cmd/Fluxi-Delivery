# 🧪 INSTRUCCIONES DE PRUEBA - FLUXI DELIVERY

**Versión**: Aplicación Modular Corregida
**Fecha**: 15 de Diciembre de 2025

---

## 🚀 INICIO RÁPIDO

### 1. Iniciar Servidor Local

El servidor ya está corriendo en el puerto 8080. Si necesitas reiniciarlo:

```bash
python -m http.server 8080
```

### 2. Acceder a la Aplicación

Abre tu navegador en:
```
http://localhost:8080/admin.html
```

---

## ✅ PRUEBAS BÁSICAS (5 minutos)

### Paso 1: Verificar que no hay errores de consola

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Recarga la página
4. **✅ Debe mostrar**: `✅ Supabase conectado exitosamente` (en verde)
5. **❌ No debe haber**: Errores rojos

### Paso 2: Probar Cuadre de Caja

1. Click en menú "💰 Cuadre de Caja"
2. **✅ Verificar**: Página carga sin errores
3. **✅ Verificar**: Aparece dropdown con domiciliarios
4. Selecciona fecha de hoy
5. Click en "Calcular Cuadre"
6. **✅ Verificar**: Aparecen tarjetas de resumen
7. **✅ Verificar**: Aparece tabla con datos

**Consola debe mostrar**:
```
[CuadreCajaController] Initialized successfully
[CuadreCajaController] Loaded deliveries: X
[CuadreCajaController] Cuadre calculated: X delivery persons
```

### Paso 3: Probar Tiempos de Espera

1. Click en menú "⏱️ Tiempos de Espera"
2. **✅ Verificar**: Página carga sin errores
3. **✅ Verificar**: Fechas por defecto (última semana)
4. **✅ Verificar**: Dropdown con domiciliarios
5. Click en "Buscar"
6. **✅ Verificar**: Aparecen tarjetas con tiempos promedio
7. **✅ Verificar**: Aparece tabla con pedidos

**Consola debe mostrar**:
```
[TiemposEsperaController] Initialized successfully
[TiemposEsperaController] Loaded deliveries: X
[TiemposEsperaController] Found orders: X
```

### Paso 4: Verificar destroy() (Lifecycle)

1. Navega de "Cuadre de Caja" a "Pedidos"
2. **✅ Consola debe mostrar**:
   ```
   [CuadreCajaController] Destroyed
   [OrdersController] Initialized successfully
   ```

3. Navega de "Pedidos" a "Tiempos de Espera"
4. **✅ Consola debe mostrar**:
   ```
   [OrdersController] Destroyed
   [TiemposEsperaController] Initialized successfully
   ```

---

## 🔍 PRUEBAS DETALLADAS (15 minutos)

### Prueba 1: Arquitectura Modular

**Objetivo**: Verificar que no hay acceso directo a Supabase

1. Abre DevTools → Console
2. Navega a Cuadre de Caja usando el menú
3. Ejecuta en consola:
   ```javascript
   // Método 1: Inspección automática
   inspectController()
   ```

   **O usa el método manual**:
   ```javascript
   // Método 2: Inspección manual
   getCurrentController()
   ```

4. **✅ Debe mostrar**:
   ```
   ✅ Current Controller: CuadreCajaController
   📊 Controller Inspection:
     Name: CuadreCajaController
     Has authService: true
     Has orderService: true
     Has deliveryService: true
     Has destroy(): true
     Has supabase (direct access): false
   ✅ Controller uses Services (no direct DB access)
   ```

5. **❌ NO debe tener**: `supabase: true`

### Prueba 2: Manejo de Errores

**Escenario**: Probar sin conexión a Supabase (simulado)

1. Ve a "Cuadre de Caja"
2. Abre DevTools → Console
3. Ejecuta:
   ```javascript
   // Simular error de servicio
   window.appRouter.currentController.orderService.getAllOrders =
       () => Promise.reject(new Error('Simulated error'))
   ```
4. Intenta calcular cuadre
5. **✅ Debe mostrar**: Alert rojo con "Error al calcular el cuadre"
6. **✅ Consola debe mostrar**: Error log con detalles

### Prueba 3: Responsive Design

**Dispositivos Móviles**:

1. DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
2. Selecciona iPhone SE (375px)
3. **✅ Verificar**: Aparece botón de hamburguesa (☰)
4. Click en hamburguesa
5. **✅ Verificar**: Sidebar se abre
6. Click fuera del sidebar
7. **✅ Verificar**: Sidebar se cierra
8. Probar en "Cuadre de Caja" y "Tiempos de Espera"

### Prueba 4: Filtros y Búsquedas

**Cuadre de Caja**:
```
1. Seleccionar fecha específica
2. Seleccionar "Todos los Domiciliarios"
3. Calcular → Debe mostrar todos
4. Seleccionar un domiciliario específico
5. Calcular → Debe mostrar solo ese domiciliario
6. Click "Limpiar Filtros"
7. Verificar que se resetean los valores
```

**Tiempos de Espera**:
```
1. Seleccionar rango de 1 mes
2. Buscar con "Todos"
3. Verificar tabla con múltiples pedidos
4. Filtrar por domiciliario específico
5. Verificar que solo muestra ese domiciliario
6. Click "Limpiar"
7. Verificar que vuelve a última semana
```

### Prueba 5: Cálculos

**Cuadre de Caja - Verificación Manual**:

1. Calcular cuadre para hoy
2. Tomar nota de un domiciliario:
   - Arranque inicial: A
   - Efectivo pedidos: E
   - Descargas: D
   - Total efectivo: T
3. **✅ Verificar**: T = A + E - D
4. **✅ Verificar**: Total general = Suma de todos

**Tiempos de Espera - Verificación Manual**:

1. Buscar pedidos
2. Verificar tarjeta "Tiempo Recorrido Promedio"
3. Ver tabla y calcular promedio manual
4. **✅ Verificar**: Promedio coincide

---

## 🐛 DETECCIÓN DE PROBLEMAS

### Problemas Comunes y Soluciones

#### 1. Error: "supabaseClient is not defined"

**Causa**: Supabase no se cargó correctamente
**Solución**:
```bash
# Verificar que admin.html incluye el script UMD
grep "supabase.min.js" admin.html
```

#### 2. Error: "Cannot read property 'getAllOrders' of undefined"

**Causa**: Service no se instanció correctamente
**Solución**:
```javascript
// En consola, verificar:
window.appRouter.currentController.orderService
// Debe devolver un objeto, no undefined
```

#### 3. Tabla vacía en Cuadre de Caja

**Causa**: No hay pedidos entregados para esa fecha
**Solución**:
- Probar con fecha diferente
- Verificar que hay pedidos con estado "entregado" en DB

#### 4. Tiempos promedio muestran "--"

**Causa**: No hay pedidos con datos de tiempos
**Solución**:
- Normal si no hay datos
- Verificar que campo `tiempo_recorrido` existe en DB

---

## 📊 CHECKLIST COMPLETO

### Funcionalidad ✅

- [ ] Todas las vistas cargan sin errores
- [ ] Cuadre de Caja calcula correctamente
- [ ] Tiempos de Espera busca correctamente
- [ ] Filtros funcionan en ambos módulos
- [ ] Botón "Limpiar" resetea valores
- [ ] Logout funciona en todos los módulos

### Arquitectura ✅

- [ ] Ningún Controller accede directamente a Supabase
- [ ] Todos los Controllers usan Services
- [ ] Método destroy() se llama al cambiar vista
- [ ] No hay errores en consola
- [ ] No hay warnings de memory leaks

### UI/UX ✅

- [ ] Menú mobile funciona
- [ ] Sidebar se cierra al hacer click fuera
- [ ] Alertas se muestran correctamente
- [ ] Alertas de éxito se auto-ocultan
- [ ] Formato de moneda correcto (COP)
- [ ] Formato de fechas correcto (es-CO)

### Performance ✅

- [ ] Vistas cargan en < 1 segundo
- [ ] Cambio entre vistas es instantáneo
- [ ] Cálculos terminan en < 500ms
- [ ] No hay lag en la interfaz

---

## 📈 MÉTRICAS ESPERADAS

### Rendimiento

| Métrica | Valor Esperado | Cómo Medir |
|---------|----------------|------------|
| Tiempo de carga inicial | < 500ms | DevTools → Network |
| Tiempo de carga de vista | < 200ms | Observar transición |
| Tiempo de cálculo cuadre | < 500ms | Cronómetro |
| Tiempo de búsqueda tiempos | < 500ms | Cronómetro |

### Consola

**Debe tener**:
- ✅ Mensajes de inicialización de Controllers
- ✅ Mensajes de destroy al cambiar vista
- ✅ Supabase conectado correctamente

**NO debe tener**:
- ❌ Errores rojos
- ❌ Warnings amarillos (excepto deprecations de librerías)
- ❌ Mensajes "undefined" o "null"

---

## 🎯 REPORTE DE PRUEBAS

Después de completar las pruebas, documenta:

### Resultados

```
✅ APROBADO / ❌ FALLADO

Funcionalidad:
- Cuadre de Caja: [ ]
- Tiempos de Espera: [ ]
- Navegación: [ ]
- Responsive: [ ]

Arquitectura:
- Sin acceso directo a Supabase: [ ]
- Uso de Services: [ ]
- Métodos destroy(): [ ]

Performance:
- Carga rápida: [ ]
- Sin lag: [ ]

Errores encontrados:
1. ...
2. ...

Comentarios:
...
```

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Revisa la consola**: La mayoría de errores aparecen ahí
2. **Verifica Supabase**: Asegúrate que está funcionando
3. **Revisa documentación**: Lee [CORRECCIONES_IMPLEMENTADAS.md](CORRECCIONES_IMPLEMENTADAS.md)
4. **Logs útiles**: Todos los Controllers logean sus acciones con `APP_CONFIG.enableDebug`

---

## ✨ PRÓXIMOS PASOS

Una vez completadas todas las pruebas exitosamente:

1. ✅ Marcar como "APROBADO"
2. 🚀 Deploy a staging environment
3. 🧪 Testing E2E automatizado (opcional)
4. 👥 User Acceptance Testing (UAT)
5. 🚀 Deploy a producción

---

**Preparado por**: Claude Code
**Versión**: 1.0.0
**Fecha**: 15 de Diciembre de 2025
