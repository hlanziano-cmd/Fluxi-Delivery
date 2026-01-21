# 📅 Sincronización Histórica Dyalogo

**Fecha**: 22 de Diciembre de 2025
**Funcionalidad**: Importar pedidos históricos desde Dyalogo por rango de fechas

---

## 🎯 Nueva Funcionalidad

Ahora puedes sincronizar pedidos de **cualquier período de tiempo** desde Dyalogo, no solo del día actual.

---

## 📍 Dónde Encontrarlo

### Ubicación: Módulo "Consulta de Pedidos"

```
http://localhost:8080/index.html
  ↓
🔍 Consulta de Pedidos
  ↓
Criterios de Búsqueda
  ├── Fecha Desde: [Campo de fecha]
  ├── Fecha Hasta: [Campo de fecha]
  └── [📡 Sincronizar desde Dyalogo]
```

---

## 🚀 Cómo Usar

### Método 1: Sincronizar Período Específico

1. **Abre el módulo** "🔍 Consulta de Pedidos"

2. **Selecciona el rango de fechas**:
   - **Fecha Desde**: 2025-12-01 (obligatorio)
   - **Fecha Hasta**: 2025-12-15 (opcional - por defecto: hoy)

3. **Click en** `📡 Sincronizar desde Dyalogo`

4. **Espera** mientras sincroniza (puedes ver el progreso)

5. **Resultado**:
   - Se muestran cuántos pedidos fueron importados
   - Se actualiza la lista automáticamente si las fechas coinciden
   - Se validan duplicados

---

### Método 2: Sincronizar Último Mes

**Ejemplo**: Importar todos los pedidos de diciembre 2025

1. **Fecha Desde**: `2025-12-01`
2. **Fecha Hasta**: `2025-12-31` (o déjalo vacío para hasta hoy)
3. Click en `📡 Sincronizar desde Dyalogo`

**Resultado esperado**:
```
✅ Sincronización completada:
   120 obtenidos,
   85 nuevos,
   35 duplicados
```

---

### Método 3: Sincronizar Día Específico

**Ejemplo**: Solo el 15 de diciembre

1. **Fecha Desde**: `2025-12-15`
2. **Fecha Hasta**: `2025-12-15`
3. Click en `📡 Sincronizar desde Dyalogo`

---

## 📊 Ejemplos de Uso

### Caso 1: Primera Vez - Importar Todo el Año

**Objetivo**: Importar todos los pedidos de 2025

```
Fecha Desde: 2025-01-01
Fecha Hasta: 2025-12-31

Click: 📡 Sincronizar desde Dyalogo

Resultado:
  ⏳ Consultando 365 día(s)...
  📡 Consultando API de Dyalogo...
  📦 Se obtuvieron 1,234 registros de Dyalogo
  ✅ 987 nuevo(s), 247 duplicado(s)
```

---

### Caso 2: Actualizar Semana Pasada

**Objetivo**: Importar pedidos de la semana del 15-21 dic

```
Fecha Desde: 2025-12-15
Fecha Hasta: 2025-12-21

Click: 📡 Sincronizar desde Dyalogo

Resultado:
  ⏳ Consultando 7 día(s)...
  ✅ 23 nuevo(s), 5 duplicado(s)
```

---

### Caso 3: Solo Hoy

**Objetivo**: Importar solo pedidos de hoy

```
Fecha Desde: 2025-12-22
Fecha Hasta: (vacío o 2025-12-22)

Click: 📡 Sincronizar desde Dyalogo

Resultado:
  ⏳ Consultando 1 día(s)...
  ✅ 8 nuevo(s), 0 duplicado(s)
```

---

## 🔍 Flujo Completo

```
1. Seleccionar Fechas
   ↓
2. Click "📡 Sincronizar desde Dyalogo"
   ↓
3. Validación
   ├── ✅ Fecha Desde obligatoria
   └── ✅ Fecha Hasta opcional (default: hoy)
   ↓
4. Construcción de Query SQL
   WHERE G4981_C101301 >= '2025-12-01 00:00:00'
     AND G4981_C101301 <= '2025-12-31 23:59:59'
   ↓
5. Petición a Dyalogo (vía proxy)
   Límite: 500 registros
   ↓
6. Transformación y Validación
   ├── Valida campos obligatorios
   ├── Formatea teléfonos
   └── Calcula totales
   ↓
7. Detección de Duplicados
   Compara: teléfono + dirección (últimas 24h)
   ↓
8. Creación en Supabase
   ├── Nuevos: Se crean
   └── Duplicados: Se omiten
   ↓
9. Actualización de UI
   ├── Muestra resultado
   └── Recarga búsqueda si aplica
```

---

## 📝 Logs en Consola

### Logs Exitosos

```javascript
📅 Sincronizando rango: 2025-12-01 → 2025-12-31 (31 días)
🔄 ========== INICIANDO SINCRONIZACIÓN DYALOGO → FLUXI ==========
📡 Consultando API de Dyalogo...
✅ Respuesta de Dyalogo: {data: Array(120)}
📋 Estructura de respuesta: {tieneData: true, ...}
📦 Se obtuvieron 120 registros de Dyalogo
🔄 Transformando 120 registros...

🔄 Transformando registro: {G4981_C101366: "Carlos", ...}
✅ Registro transformado: {cliente_nombre: "Carlos Rodríguez", ...}

✅ [1/120] Pedido creado: abc-123
✅ [2/120] Pedido creado: def-456
⚠️ Pedido duplicado: María González - +573109876543
...

✅ ========== SINCRONIZACIÓN COMPLETADA en 15.43s ==========
📊 Resumen:
   - Obtenidos de Dyalogo: 120
   - Creados en Fluxi: 85
   - Duplicados (omitidos): 35
   - Errores: 0

📊 Recargando resultados de búsqueda...
```

---

### Logs con Registros Inválidos

```javascript
🔄 Transformando registro: {G4981_C101366: "", ...}
⚠️ Registro omitido: nombre vacío

🔄 Transformando registro: {G4981_C101366: "Juan", G4981_C101372: "", ...}
⚠️ Registro omitido: teléfono vacío

🔄 Transformando registro: {..., G4981_C106387: "0"}
⚠️ Registro omitido: valor del pedido inválido
```

---

## ⚙️ Configuración Técnica

### Límite de Registros

Por defecto, se consultan hasta **500 registros** por sincronización para fechas históricas.

**Modificar** en `index.html` línea 4341:

```javascript
// ANTES (500 registros):
const result = await webhookService.syncOrders({ limit: 500 });

// DESPUÉS (1000 registros):
const result = await webhookService.syncOrders({ limit: 1000 });
```

### Formato de Fechas

Las fechas se convierten automáticamente al formato de Dyalogo:

```javascript
// Input del usuario:
Fecha Desde: 2025-12-15
Fecha Hasta: 2025-12-31

// Se convierte a:
WHERE G4981_C101301 >= '2025-12-15 00:00:00'
  AND G4981_C101301 <= '2025-12-31 23:59:59'
```

### Campo de Fecha en Dyalogo

Configurado en `config/dyalogo-webhook.config.js`:

```javascript
fieldMapping: {
  fechaCreacion: 'G4981_C101301'  // ← Campo de fecha en Dyalogo
}
```

---

## 🛡️ Validaciones

### 1. Fecha Desde Obligatoria

```javascript
if (!fechaDesde) {
  showAlert('Por favor selecciona una "Fecha Desde" para sincronizar', 'warning');
  return;
}
```

### 2. Fecha Hasta Opcional

Si no se proporciona "Fecha Hasta", se usa **hoy**:

```javascript
const toDate = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date();
```

### 3. Duplicados Automáticos

Se omiten automáticamente pedidos que ya existen (teléfono + dirección en últimas 24h).

---

## 📊 Interfaz de Usuario

### Antes de Sincronizar

```
[Fecha Desde: 2025-12-01] [Fecha Hasta: 2025-12-31]

[🔍 Buscar] [🗑️ Limpiar]     [📡 Sincronizar desde Dyalogo]
```

### Durante Sincronización

```
[Fecha Desde: 2025-12-01] [Fecha Hasta: 2025-12-31]

[🔍 Buscar] [🗑️ Limpiar]     [⏳ Sincronizando...]  Consultando 31 día(s)...
```

### Después de Sincronizar (Éxito)

```
[Fecha Desde: 2025-12-01] [Fecha Hasta: 2025-12-31]

[🔍 Buscar] [🗑️ Limpiar]     [✅ Sincronizado]  85 nuevo(s), 35 duplicado(s)
```

### Después de Sincronizar (Error)

```
[Fecha Desde: 2025-12-01] [Fecha Hasta: 2025-12-31]

[🔍 Buscar] [🗑️ Limpiar]     [❌ Error]  Error
```

---

## 🎯 Casos de Uso Comunes

### 1. Migración Inicial

**Escenario**: Primera vez usando Fluxi, necesitas importar todo el histórico.

```
Fecha Desde: 2024-01-01
Fecha Hasta: 2025-12-22

Resultado: Importa todos los pedidos del último año
```

### 2. Actualización Diaria

**Escenario**: Ya tienes pedidos, solo quieres actualizar con los de hoy.

```
Fecha Desde: 2025-12-22
Fecha Hasta: (vacío)

Resultado: Solo pedidos de hoy
```

### 3. Corrección de Datos

**Escenario**: Hubo un problema el 15 de diciembre, quieres re-sincronizar ese día.

```
Fecha Desde: 2025-12-15
Fecha Hasta: 2025-12-15

Resultado: Re-importa solo ese día (duplicados se omiten)
```

### 4. Reporte Mensual

**Escenario**: Necesitas todos los pedidos de noviembre para un reporte.

```
Fecha Desde: 2025-11-01
Fecha Hasta: 2025-11-30

Resultado: Importa todo noviembre
```

---

## 🔄 Auto-Recarga de Resultados

Si las fechas de sincronización **coinciden** con las fechas de búsqueda, la tabla se recarga automáticamente:

```javascript
// Sincronizaste:
Fecha Desde: 2025-12-01
Fecha Hasta: 2025-12-15

// Y tu búsqueda tiene:
Fecha Desde: 2025-12-01
Fecha Hasta: 2025-12-15

// Entonces: ✅ Se recarga automáticamente la tabla con los nuevos pedidos
```

---

## 📋 Checklist de Verificación

Después de sincronizar un rango histórico:

- [x] Verifica en consola: "✅ Sincronización completada"
- [x] Verifica el número de pedidos creados
- [x] Verifica el número de duplicados omitidos
- [x] Si hay errores, revisa los logs detallados
- [x] Comprueba que los pedidos aparezcan en Consulta de Pedidos
- [x] Verifica que no haya pedidos duplicados en la BD

---

## ⚠️ Limitaciones

### 1. Límite de Registros por Petición

- **Default**: 500 pedidos por sincronización
- **Solución**: Si tienes más, repite la sincronización (detectará duplicados)

### 2. Tiempo de Sincronización

- **Promedio**: ~0.1s por pedido
- **Ejemplo**: 500 pedidos ≈ 50 segundos
- **Solución**: Espera pacientemente, verás progreso en consola

### 3. API de Dyalogo

- Depende de la disponibilidad de la API de Dyalogo
- Usa el proxy local para evitar problemas de CORS

---

## 🚀 Próximas Mejoras Sugeridas

1. **Barra de Progreso Visual**
   - Mostrar % de avance durante sincronización

2. **Sincronización por Lotes**
   - Dividir rangos grandes en lotes de 100 pedidos

3. **Programar Sincronizaciones**
   - Auto-sincronizar cada noche a las 2 AM

4. **Exportar Logs**
   - Descargar reporte de sincronización en CSV

---

**Implementado por**: Claude Code
**Fecha**: 22 de Diciembre de 2025
**Versión**: 1.0
**Ubicación**: Módulo "Consulta de Pedidos"
