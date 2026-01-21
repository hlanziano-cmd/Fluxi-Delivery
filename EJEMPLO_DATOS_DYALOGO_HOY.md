# 📋 Ejemplo de Sincronización Dyalogo - Hoy (22 Dic 2025)

## 🔍 Petición a la API de Dyalogo

### URL
```
POST http://addons.mercurio2.dyalogo.cloud:8080/dy_servicios_adicionales/svrs/dm/info/data
```

### Headers
```http
Content-Type: application/json
```

### Body (JSON)
```json
{
  "strUsuario_t": "2e7d6b2a06f38025e770c4350f1b5ee5",
  "strToken_t": "03a6a39a09ccb1c1f2b6417f1023f3ce2e83a17ea1da769f4bbf1224e826f43c",
  "intIdG_t": "4981",
  "strSQLWhere_t": "G4981_C101301 >= '2025-12-22 00:00:00'",
  "intLimit_t": "50"
}
```

---

## 📥 Respuesta Simulada de Dyalogo

```json
{
  "success": true,
  "total": 5,
  "data": [
    {
      "G4981_C101301": "2025-12-22 08:30:15",
      "G4981_C101366": "Carlos",
      "G4981_C101367": "Rodríguez Pérez",
      "G4981_C101372": "3001234567",
      "G4981_C101377": "Calle 123 #45-67, Apartamento 501, Torre B",
      "G4981_C101380": "Chapinero Alto",
      "G4981_C106387": "45000",
      "G4981_C106388": "5000"
    },
    {
      "G4981_C101301": "2025-12-22 09:15:42",
      "G4981_C101366": "María",
      "G4981_C101367": "González López",
      "G4981_C101372": "3109876543",
      "G4981_C101377": "Carrera 15 #78-90, Casa 12, Conjunto Rosales",
      "G4981_C101380": "Usaquén",
      "G4981_C106387": "65000",
      "G4981_C106388": "8000"
    },
    {
      "G4981_C101301": "2025-12-22 10:45:20",
      "G4981_C101366": "Juan Pablo",
      "G4981_C101367": "Martínez Silva",
      "G4981_C101372": "3205551234",
      "G4981_C101377": "Avenida 68 #45-12, Edificio Central, Piso 3",
      "G4981_C101380": "Suba",
      "G4981_C106387": "38000",
      "G4981_C106388": "4500"
    },
    {
      "G4981_C101301": "2025-12-22 11:20:55",
      "G4981_C101366": "Ana María",
      "G4981_C101367": "Ramírez Torres",
      "G4981_C101372": "3157778899",
      "G4981_C101377": "Calle 85 #20-30, Local 5, Centro Comercial Andino",
      "G4981_C101380": "El Chicó",
      "G4981_C106387": "120000",
      "G4981_C106388": "12000"
    },
    {
      "G4981_C101301": "2025-12-22 12:05:33",
      "G4981_C101366": "Diego",
      "G4981_C101367": "Hernández Mora",
      "G4981_C101372": "3006667788",
      "G4981_C101377": "Transversal 45 #123-67, Apto 1102, Edificio Mirador",
      "G4981_C101380": "Cedritos",
      "G4981_C106387": "52000",
      "G4981_C106388": "6000"
    }
  ]
}
```

---

## 🔄 Transformación a Formato Fluxi

### Pedido 1: Carlos Rodríguez Pérez

**Datos de Dyalogo**:
```javascript
{
  "G4981_C101366": "Carlos",
  "G4981_C101367": "Rodríguez Pérez",
  "G4981_C101372": "3001234567",
  "G4981_C101377": "Calle 123 #45-67, Apartamento 501, Torre B",
  "G4981_C101380": "Chapinero Alto",
  "G4981_C106387": "45000",
  "G4981_C106388": "5000"
}
```

**Transformado para Fluxi**:
```javascript
{
  cliente_nombre: "Carlos Rodríguez Pérez",
  cliente_telefono: "+573001234567",
  direccion_entrega: "Calle 123 #45-67, Apartamento 501, Torre B",
  barrio: "Chapinero Alto",
  valor_pedido: 45000,
  valor_domicilio: 5000,
  total: 50000,
  metodo_pago: "efectivo",
  notas: "Pedido importado desde Dyalogo",
  estado: "pendiente",
  domiciliario_id: null,
  tipo_domiciliario: "propio"
}
```

---

### Pedido 2: María González López

**Datos de Dyalogo**:
```javascript
{
  "G4981_C101366": "María",
  "G4981_C101367": "González López",
  "G4981_C101372": "3109876543",
  "G4981_C101377": "Carrera 15 #78-90, Casa 12, Conjunto Rosales",
  "G4981_C101380": "Usaquén",
  "G4981_C106387": "65000",
  "G4981_C106388": "8000"
}
```

**Transformado para Fluxi**:
```javascript
{
  cliente_nombre: "María González López",
  cliente_telefono: "+573109876543",
  direccion_entrega: "Carrera 15 #78-90, Casa 12, Conjunto Rosales",
  barrio: "Usaquén",
  valor_pedido: 65000,
  valor_domicilio: 8000,
  total: 73000,
  metodo_pago: "efectivo",
  notas: "Pedido importado desde Dyalogo",
  estado: "pendiente",
  domiciliario_id: null,
  tipo_domiciliario: "propio"
}
```

---

### Pedido 3: Juan Pablo Martínez Silva

**Transformado para Fluxi**:
```javascript
{
  cliente_nombre: "Juan Pablo Martínez Silva",
  cliente_telefono: "+573205551234",
  direccion_entrega: "Avenida 68 #45-12, Edificio Central, Piso 3",
  barrio: "Suba",
  valor_pedido: 38000,
  valor_domicilio: 4500,
  total: 42500,
  metodo_pago: "efectivo",
  notas: "Pedido importado desde Dyalogo",
  estado: "pendiente",
  domiciliario_id: null,
  tipo_domiciliario: "propio"
}
```

---

### Pedido 4: Ana María Ramírez Torres

**Transformado para Fluxi**:
```javascript
{
  cliente_nombre: "Ana María Ramírez Torres",
  cliente_telefono: "+573157778899",
  direccion_entrega: "Calle 85 #20-30, Local 5, Centro Comercial Andino",
  barrio: "El Chicó",
  valor_pedido: 120000,
  valor_domicilio: 12000,
  total: 132000,
  metodo_pago: "efectivo",
  notas: "Pedido importado desde Dyalogo",
  estado: "pendiente",
  domiciliario_id: null,
  tipo_domiciliario: "propio"
}
```

---

### Pedido 5: Diego Hernández Mora

**Transformado para Fluxi**:
```javascript
{
  cliente_nombre: "Diego Hernández Mora",
  cliente_telefono: "+573006667788",
  direccion_entrega: "Transversal 45 #123-67, Apto 1102, Edificio Mirador",
  barrio: "Cedritos",
  valor_pedido: 52000,
  valor_domicilio: 6000,
  total: 58000,
  metodo_pago: "efectivo",
  notas: "Pedido importado desde Dyalogo",
  estado: "pendiente",
  domiciliario_id: null,
  tipo_domiciliario: "propio"
}
```

---

## 💾 Cómo se Ven en la Base de Datos (Supabase)

### Tabla: `pedidos`

| id | cliente_nombre | cliente_telefono | direccion_entrega | barrio | valor_pedido | valor_domicilio | total | metodo_pago | estado | domiciliario_id | created_at |
|----|----------------|------------------|-------------------|--------|--------------|-----------------|-------|-------------|--------|-----------------|------------|
| uuid-1 | Carlos Rodríguez Pérez | +573001234567 | Calle 123 #45-67... | Chapinero Alto | 45000 | 5000 | 50000 | efectivo | pendiente | NULL | 2025-12-22 15:30:45 |
| uuid-2 | María González López | +573109876543 | Carrera 15 #78-90... | Usaquén | 65000 | 8000 | 73000 | efectivo | pendiente | NULL | 2025-12-22 15:30:46 |
| uuid-3 | Juan Pablo Martínez Silva | +573205551234 | Avenida 68 #45-12... | Suba | 38000 | 4500 | 42500 | efectivo | pendiente | NULL | 2025-12-22 15:30:47 |
| uuid-4 | Ana María Ramírez Torres | +573157778899 | Calle 85 #20-30... | El Chicó | 120000 | 12000 | 132000 | efectivo | pendiente | NULL | 2025-12-22 15:30:48 |
| uuid-5 | Diego Hernández Mora | +573006667788 | Transversal 45 #123-67... | Cedritos | 52000 | 6000 | 58000 | efectivo | pendiente | NULL | 2025-12-22 15:30:49 |

---

## 📊 Resultado de Sincronización

```javascript
{
  timestamp: "2025-12-22T15:30:50.123Z",
  success: true,
  fetched: 5,         // 5 pedidos obtenidos de Dyalogo
  created: 5,         // 5 pedidos creados en Fluxi
  duplicates: 0,      // 0 duplicados (primera sincronización del día)
  errors: [],         // Sin errores
  orders: [
    { id: "uuid-1", cliente_nombre: "Carlos Rodríguez Pérez", total: 50000 },
    { id: "uuid-2", cliente_nombre: "María González López", total: 73000 },
    { id: "uuid-3", cliente_nombre: "Juan Pablo Martínez Silva", total: 42500 },
    { id: "uuid-4", cliente_nombre: "Ana María Ramírez Torres", total: 132000 },
    { id: "uuid-5", cliente_nombre: "Diego Hernández Mora", total: 58000 }
  ]
}
```

---

## 🎯 Cómo se Ven en el Panel de Fluxi

### Estadísticas Actualizadas

```
📊 Dashboard

⏳ Pendientes: 5
📋 Asignados: 0
🚴 En Camino: 0
✅ Entregados (Hoy): 0
💰 Total Recaudado: $0
```

### Lista de Pedidos Pendientes

```
📦 PEDIDOS PENDIENTES

┌──────────────────────────────┬─────────────────┬──────────────┬───────────┐
│ Cliente                      │ Teléfono        │ Barrio       │ Total     │
├──────────────────────────────┼─────────────────┼──────────────┼───────────┤
│ Carlos Rodríguez Pérez       │ +573001234567   │ Chapinero    │ $50,000   │
│ María González López         │ +573109876543   │ Usaquén      │ $73,000   │
│ Juan Pablo Martínez Silva    │ +573205551234   │ Suba         │ $42,500   │
│ Ana María Ramírez Torres     │ +573157778899   │ El Chicó     │ $132,000  │
│ Diego Hernández Mora         │ +573006667788   │ Cedritos     │ $58,000   │
└──────────────────────────────┴─────────────────┴──────────────┴───────────┘

[Asignar Domiciliario] [Ver Detalles] [Editar]
```

---

## 🔄 Segunda Sincronización (30 minutos después)

### Nueva Petición a Dyalogo

```json
{
  "strSQLWhere_t": "G4981_C101301 >= '2025-12-22 00:00:00'",
  "intLimit_t": "50"
}
```

### Nueva Respuesta (con pedidos anteriores + nuevos)

```json
{
  "total": 7,
  "data": [
    // ... Los 5 pedidos anteriores ...
    {
      "G4981_C101301": "2025-12-22 15:45:10",
      "G4981_C101366": "Laura",
      "G4981_C101367": "Gómez Ruiz",
      "G4981_C101372": "3123334455",
      "G4981_C101377": "Calle 170 #55-30, Apto 803",
      "G4981_C101380": "Toberin",
      "G4981_C106387": "42000",
      "G4981_C106388": "5500"
    },
    {
      "G4981_C101301": "2025-12-22 16:10:25",
      "G4981_C101366": "Roberto",
      "G4981_C101367": "Castro Díaz",
      "G4981_C101372": "3008889900",
      "G4981_C101377": "Carrera 7 #32-16, Oficina 201",
      "G4981_C101380": "La Candelaria",
      "G4981_C106387": "28000",
      "G4981_C106388": "3500"
    }
  ]
}
```

### Resultado de Sincronización #2

```javascript
{
  timestamp: "2025-12-22T16:15:30.456Z",
  success: true,
  fetched: 7,         // 7 pedidos obtenidos de Dyalogo
  created: 2,         // Solo 2 nuevos creados
  duplicates: 5,      // 5 duplicados detectados y omitidos
  errors: [],
  orders: [
    { id: "uuid-6", cliente_nombre: "Laura Gómez Ruiz", total: 47500 },
    { id: "uuid-7", cliente_nombre: "Roberto Castro Díaz", total: 31500 }
  ]
}
```

**Logs**:
```
✅ Conexión con Dyalogo establecida
📦 Se obtuvieron 7 registros de Dyalogo
🔄 Transformando 7 registros...
⚠️ Pedido duplicado: Carlos Rodríguez Pérez - +573001234567
⚠️ Pedido duplicado: María González López - +573109876543
⚠️ Pedido duplicado: Juan Pablo Martínez Silva - +573205551234
⚠️ Pedido duplicado: Ana María Ramírez Torres - +573157778899
⚠️ Pedido duplicado: Diego Hernández Mora - +573006667788
✅ [1/2] Pedido creado: uuid-6
✅ [2/2] Pedido creado: uuid-7
✅ Sincronización completada en 2.45s
📊 Resumen:
   - Obtenidos de Dyalogo: 7
   - Creados en Fluxi: 2
   - Duplicados (omitidos): 5
   - Errores: 0
```

---

## 🧪 Comando para Probar

### En la Consola del Navegador

```javascript
// 1. Cargar scripts
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

await loadScript('config/dyalogo-webhook.config.js');
await loadScript('services/dyalogo-webhook.service.js');

// 2. Crear servicio
const webhookService = new DyalogoWebhookService(DyalogoWebhookConfig);

// 3. Sincronizar
const result = await webhookService.syncOrders({ limit: 5 });

// 4. Ver resultado
console.log('📊 Resultado de sincronización:');
console.log(`   ✅ Obtenidos: ${result.fetched}`);
console.log(`   ✅ Creados: ${result.created}`);
console.log(`   ⚠️ Duplicados: ${result.duplicates}`);
console.table(result.orders);
```

---

## 📝 Resumen

| Métrica | Valor |
|---------|-------|
| **Pedidos en Dyalogo (hoy)** | 7 |
| **Importados a Fluxi (sync #1)** | 5 |
| **Importados a Fluxi (sync #2)** | 2 |
| **Total en Fluxi** | 7 |
| **Duplicados evitados** | 5 |
| **Total a cobrar** | $434,500 |
| **Promedio por pedido** | $62,071 |

---

**Fecha del Ejemplo**: 22 de Diciembre de 2025
**Hora de Sincronización**: 15:30 y 16:15
**Estado**: ✅ Todos los pedidos importados correctamente
