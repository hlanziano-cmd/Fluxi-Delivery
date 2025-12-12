-- ========================================
-- Migration: ID Consecutivo con formato: NOMBRE#NUMERO
-- Date: 2025-12-11
-- Description: ID format: [Nombre completo del domiciliario] + # + [consecutivo diario]
-- Example: CARLOS#1, CARLOS#2, JUAN CARLOS#1, JUAN CARLOS#2
-- Se reinicia cada día
-- ========================================

-- Ensure columns exist (from previous migrations)
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS consecutivo_domiciliario VARCHAR(50);

ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS voucher_estado VARCHAR(20) DEFAULT 'pendiente'
CHECK (voucher_estado IN ('pendiente', 'entregado'));

ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS numero_datafono VARCHAR(4);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pedidos_consecutivo_domiciliario
ON pedidos(domiciliario_id, consecutivo_domiciliario);

CREATE INDEX IF NOT EXISTS idx_pedidos_voucher_estado
ON pedidos(voucher_estado);

-- Index on created_at for date queries (will still be efficient for date comparisons)
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at
ON pedidos(created_at);

-- Update existing records to have default voucher_estado
UPDATE pedidos
SET voucher_estado = 'pendiente'
WHERE voucher_estado IS NULL;

-- ========================================
-- Function to generate consecutivo with format: NOMBRE#NUMERO
-- Format: [Nombre completo] + # + [Daily consecutive number]
-- ========================================

CREATE OR REPLACE FUNCTION generate_consecutivo_domiciliario_v3()
RETURNS TRIGGER AS $$
DECLARE
    nombre_domiciliario VARCHAR(255);
    daily_count INTEGER;
    today_date DATE;
BEGIN
    -- Only generate consecutivo when a domiciliario is assigned
    IF NEW.domiciliario_id IS NOT NULL AND (OLD.domiciliario_id IS NULL OR OLD.domiciliario_id != NEW.domiciliario_id) THEN

        -- Get delivery person name
        SELECT nombre INTO nombre_domiciliario
        FROM domiciliarios
        WHERE id = NEW.domiciliario_id;

        -- If delivery person not found, use generic prefix
        IF nombre_domiciliario IS NULL THEN
            nombre_domiciliario := 'PEDIDO';
        ELSE
            -- Convert to uppercase and trim spaces
            nombre_domiciliario := UPPER(TRIM(nombre_domiciliario));
        END IF;

        -- Get today's date
        today_date := CURRENT_DATE;

        -- Get the count of orders for this domiciliario today
        SELECT COUNT(*) + 1 INTO daily_count
        FROM pedidos
        WHERE domiciliario_id = NEW.domiciliario_id
          AND DATE(created_at) = today_date
          AND id != NEW.id;  -- Exclude current order if updating

        -- Generate the consecutivo: NOMBRE#NUMBER
        -- Example: "CARLOS#1", "CARLOS#2", "JUAN CARLOS#1"
        NEW.consecutivo_domiciliario := nombre_domiciliario || '#' || daily_count::TEXT;

        -- Ensure it doesn't exceed 50 characters (column limit)
        IF LENGTH(NEW.consecutivo_domiciliario) > 50 THEN
            -- If it exceeds, truncate name to make room
            nombre_domiciliario := LEFT(nombre_domiciliario, 50 - LENGTH('#' || daily_count::TEXT));
            NEW.consecutivo_domiciliario := nombre_domiciliario || '#' || daily_count::TEXT;
        END IF;

    END IF;

    -- If domiciliario is removed, clear the consecutivo
    IF NEW.domiciliario_id IS NULL THEN
        NEW.consecutivo_domiciliario := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_generate_consecutivo ON pedidos;

-- Create trigger to auto-generate consecutivo_domiciliario
CREATE TRIGGER trigger_generate_consecutivo
    BEFORE INSERT OR UPDATE OF domiciliario_id
    ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION generate_consecutivo_domiciliario_v3();

-- ========================================
-- Comments for documentation
-- ========================================

COMMENT ON COLUMN pedidos.consecutivo_domiciliario IS 'ID format: [Nombre completo] + # + [Daily consecutive]. Max 50 chars. Example: CARLOS#1, JUAN CARLOS#2';
COMMENT ON COLUMN pedidos.voucher_estado IS 'Voucher delivery status: pendiente or entregado';
COMMENT ON COLUMN pedidos.numero_datafono IS 'Last 4 digits of POS terminal number (only for datafono payment method)';

-- ========================================
-- Test the trigger (optional - comment out in production)
-- ========================================

-- Test query to see the format:
-- SELECT
--     id,
--     consecutivo_domiciliario,
--     domiciliario_id,
--     DATE(created_at) as fecha,
--     d.nombre as domiciliario_nombre
-- FROM pedidos p
-- LEFT JOIN domiciliarios d ON d.id = p.domiciliario_id
-- WHERE domiciliario_id IS NOT NULL
-- ORDER BY d.nombre, created_at DESC
-- LIMIT 20;

-- ========================================
-- Verification queries
-- ========================================

-- Run these to verify the migration:
-- SELECT column_name, data_type, column_default, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'pedidos'
-- AND column_name IN ('consecutivo_domiciliario', 'voucher_estado', 'numero_datafono');
