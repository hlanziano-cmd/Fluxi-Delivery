-- ========================================
-- FIX: Crear campo consecutivo_domiciliario si no existe
-- Date: 2025-12-15
-- Description: Asegurar que el campo existe con el tipo correcto
-- ========================================

-- Paso 1: Verificar y crear la columna si no existe
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

-- Paso 2: Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_pedidos_consecutivo_domiciliario
ON pedidos(domiciliario_id, consecutivo_domiciliario);

-- Paso 3: Verificar que el trigger existe y funciona correctamente
-- Si ya existe el trigger de la migración anterior, no es necesario recrearlo
-- Solo verificar que existe

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_generate_consecutivo'
    ) THEN
        RAISE NOTICE '✅ Trigger trigger_generate_consecutivo existe';
    ELSE
        RAISE NOTICE '⚠️ Trigger trigger_generate_consecutivo NO existe - ejecutar update-orders-consecutivo-v3.sql';
    END IF;
END $$;

-- Paso 4: Verificación final
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pedidos'
AND column_name = 'consecutivo_domiciliario';

-- Si todo está bien, deberías ver:
-- column_name: consecutivo_domiciliario
-- data_type: character varying
-- character_maximum_length: 50
-- is_nullable: YES
