# 🔧 SOLUCIÓN: Error de Trigger en Base de Datos

**Fecha**: 15 de Diciembre de 2025
**Error**: `invalid input syntax for type integer: "ANDRÉS#1"`

---

## 🐛 PROBLEMA IDENTIFICADO

El error ocurre porque:

1. ✅ **El código frontend está correcto** - envía:
   - `consecutivo_dia: 1` (integer)
   - `consecutivo_domiciliario: "ANDRÉS#1"` (string)

2. ✅ **Existe un trigger en la base de datos** (`trigger_generate_consecutivo`) que genera automáticamente el `consecutivo_domiciliario`

3. ❌ **PERO el campo `consecutivo_domiciliario` no existe o tiene el tipo de dato incorrecto** en tu tabla `pedidos` en Supabase

### Log de Consola (Evidencia):

```
💾 Guardando updateData: {
    consecutivo_dia: 1,                    ← ✅ Correcto
    consecutivo_domiciliario: "ANDRÉS#1",  ← ✅ Correcto
    ...
}

❌ Error: invalid input syntax for type integer: "ANDRÉS#1"
```

Esto indica que el trigger está intentando asignar el string `"ANDRÉS#1"` a un campo que PostgreSQL cree que es `integer`.

---

## ✅ SOLUCIÓN: Ejecutar Migración en Supabase

### Paso 1: Ir al SQL Editor de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **lbifbexhmvbanvrjfglp**
3. En el menú lateral, click en **SQL Editor**
4. Click en **+ New query**

---

### Paso 2: Ejecutar Script de Verificación

Copia y pega este SQL en el editor:

```sql
-- Verificar si la columna existe y su tipo
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pedidos'
AND column_name IN ('consecutivo_domiciliario', 'consecutivo_dia');
```

**Click en "Run"** y revisa el resultado:

#### Caso A: Si NO aparece `consecutivo_domiciliario`

Significa que **la columna no existe**. Ejecuta el script de creación (Paso 3).

#### Caso B: Si aparece pero con `data_type: integer` o `bigint`

Significa que **el tipo de dato es incorrecto**. Ejecuta el script de corrección (Paso 3).

#### Caso C: Si aparece con `data_type: character varying`

✅ **El campo existe correctamente**. El problema puede ser el trigger. Ir al Paso 4.

---

### Paso 3: Ejecutar Script de Corrección

Copia y pega el contenido del archivo **`FIX_CONSECUTIVO_FIELD.sql`**:

```sql
-- ========================================
-- FIX: Crear campo consecutivo_domiciliario si no existe
-- Date: 2025-12-15
-- ========================================

DO $$
BEGIN
    -- Intenta agregar la columna
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pedidos'
        AND column_name = 'consecutivo_domiciliario'
    ) THEN
        ALTER TABLE pedidos ADD COLUMN consecutivo_domiciliario VARCHAR(50);
        RAISE NOTICE 'Columna consecutivo_domiciliario creada exitosamente';
    ELSE
        -- Si existe, verificar el tipo de dato
        DECLARE
            current_type TEXT;
        BEGIN
            SELECT data_type INTO current_type
            FROM information_schema.columns
            WHERE table_name = 'pedidos'
            AND column_name = 'consecutivo_domiciliario';

            IF current_type != 'character varying' THEN
                RAISE NOTICE 'ADVERTENCIA: consecutivo_domiciliario tiene tipo %, se esperaba VARCHAR', current_type;
                -- Intentar convertir el tipo
                ALTER TABLE pedidos ALTER COLUMN consecutivo_domiciliario TYPE VARCHAR(50) USING consecutivo_domiciliario::VARCHAR;
                RAISE NOTICE 'Tipo de dato convertido a VARCHAR(50)';
            ELSE
                RAISE NOTICE 'Columna consecutivo_domiciliario ya existe con tipo correcto';
            END IF;
        END;
    END IF;
END $$;

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_pedidos_consecutivo_domiciliario
ON pedidos(domiciliario_id, consecutivo_domiciliario);

-- Verificación final
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pedidos'
AND column_name = 'consecutivo_domiciliario';
```

**Click en "Run"**

**Resultado Esperado**:
```
NOTICE: Columna consecutivo_domiciliario creada exitosamente
o
NOTICE: Columna consecutivo_domiciliario ya existe con tipo correcto
```

Y en la tabla de resultados verás:
```
column_name              | data_type          | character_maximum_length | is_nullable
-------------------------|--------------------|--------------------------|--------------
consecutivo_domiciliario | character varying  | 50                       | YES
```

---

### Paso 4: Verificar que el Trigger Existe

Ejecuta este SQL:

```sql
-- Ver triggers activos en la tabla pedidos
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'pedidos'
AND trigger_name = 'trigger_generate_consecutivo';
```

**Resultado Esperado**:

Si el trigger existe, verás:
```
trigger_name                  | event_manipulation | event_object_table | action_statement
------------------------------|--------------------|--------------------|------------------
trigger_generate_consecutivo  | INSERT             | pedidos            | EXECUTE FUNCTION ...
trigger_generate_consecutivo  | UPDATE             | pedidos            | EXECUTE FUNCTION ...
```

#### Si NO aparece el trigger:

Necesitas ejecutar el archivo **`update-orders-consecutivo-v3.sql`** completo en el SQL Editor.

---

### Paso 5: Probar la Asignación

1. **Recarga index.html** con Ctrl + Shift + R
2. **Asigna un pedido** a un domiciliario
3. **Verifica en consola**:
   ```
   ✅ Pedido asignado correctamente - Consecutivo: ANDRÉS#1
   ```
4. **NO debe aparecer error 400**

---

## 🧪 VERIFICACIÓN EN BASE DE DATOS

Después de asignar un pedido, ejecuta en SQL Editor:

```sql
-- Ver el último pedido asignado
SELECT
    id,
    cliente,
    domiciliario_nombre,
    consecutivo_dia,
    consecutivo_domiciliario,
    estado,
    created_at
FROM pedidos
WHERE domiciliario_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

**Resultado Esperado**:
```
id   | cliente          | domiciliario_nombre | consecutivo_dia | consecutivo_domiciliario | estado
-----|------------------|---------------------|-----------------|-------------------------|----------
xxx  | Andrés Lanziano  | Andrés              | 1               | ANDRÉS#1                | asignado
```

---

## 🔍 DIAGNÓSTICO ADICIONAL

### Si el Error Persiste

Ejecuta este query para ver TODOS los campos relacionados:

```sql
SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pedidos'
AND column_name LIKE '%consecutivo%'
ORDER BY column_name;
```

**Deberías ver**:

```
column_name               | data_type          | character_maximum_length
--------------------------|--------------------|--------------------------
consecutivo_dia           | integer            | NULL
consecutivo_domiciliario  | character varying  | 50
```

### Si `consecutivo_domiciliario` NO existe:

```sql
-- Crear manualmente
ALTER TABLE pedidos ADD COLUMN consecutivo_domiciliario VARCHAR(50);
```

### Si `consecutivo_domiciliario` tiene tipo `integer`:

```sql
-- Convertir el tipo de dato
ALTER TABLE pedidos ALTER COLUMN consecutivo_domiciliario TYPE VARCHAR(50);
```

---

## 📊 RESUMEN DE LA SOLUCIÓN

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Verificar columna existe | Ver `consecutivo_domiciliario` con tipo VARCHAR |
| 2 | Si no existe, crear con FIX_CONSECUTIVO_FIELD.sql | NOTICE: Columna creada |
| 3 | Verificar trigger existe | Ver `trigger_generate_consecutivo` |
| 4 | Probar asignación en index.html | ✅ Sin error 400 |
| 5 | Verificar en base de datos | Ver consecutivo: ANDRÉS#1 |

---

## 🎯 POR QUÉ OCURRE ESTE ERROR

### Explicación Técnica:

1. **El trigger SQL** (`trigger_generate_consecutivo`) se ejecuta **ANTES** de la operación UPDATE
2. El trigger intenta asignar un valor a `NEW.consecutivo_domiciliario`
3. **Si la columna no existe**, PostgreSQL no puede asignar el valor
4. **Si la columna existe pero es INTEGER**, PostgreSQL rechaza el string con error 22P02

### Error 22P02:

El código `22P02` en PostgreSQL significa:
```
invalid_text_representation
```

Es decir: **"Estás intentando poner un texto en un campo numérico"**

---

## ✅ DESPUÉS DE EJECUTAR LA SOLUCIÓN

**Antes** ❌:
```
UPDATE pedidos SET consecutivo_domiciliario = 'ANDRÉS#1'
  ↓
❌ ERROR: invalid input syntax for type integer: "ANDRÉS#1"
```

**Después** ✅:
```
UPDATE pedidos SET consecutivo_domiciliario = 'ANDRÉS#1'
  ↓
Trigger ejecuta: NEW.consecutivo_domiciliario := 'ANDRÉS#1'
  ↓
✅ Campo VARCHAR(50) acepta el string
  ↓
✅ Pedido asignado correctamente
```

---

## 📞 SI NECESITAS AYUDA ADICIONAL

Si después de ejecutar estos pasos el error persiste:

1. Exporta el resultado de:
   ```sql
   \d pedidos
   ```
   (O su equivalente en Supabase para ver la estructura completa)

2. Captura el mensaje de error completo del Network tab en DevTools

3. Verifica que el archivo `update-orders-consecutivo-v3.sql` se haya ejecutado completamente

---

**Implementado por**: Claude Code
**Fecha**: 15 de Diciembre de 2025
**Tipo de problema**: Incompatibilidad de tipos de datos en base de datos
**Solución**: Crear/corregir campo `consecutivo_domiciliario` con tipo VARCHAR(50)
