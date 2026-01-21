-- Script para crear la tabla dyalogo_historico en Supabase
-- Ejecutar en la consola SQL de Supabase: https://supabase.com/dashboard/project/lbifbexhmvbanvrjfglp/sql

-- Crear la tabla principal
CREATE TABLE IF NOT EXISTS dyalogo_historico (
    id BIGSERIAL PRIMARY KEY,
    dyalogo_id INTEGER UNIQUE NOT NULL,
    fecha_creacion TIMESTAMP,
    url_grabacion TEXT,
    duracion_llamada VARCHAR(20),
    agente VARCHAR(255),
    fecha_gestion TIMESTAMP,
    campana VARCHAR(255),
    cliente_nombre VARCHAR(255),
    cliente_documento VARCHAR(50),
    cliente_telefono VARCHAR(50),
    cliente_email VARCHAR(255),
    direccion_entrega TEXT,
    complemento_direccion TEXT,
    barrio VARCHAR(255),
    barrio_id INTEGER,
    ciudad_id INTEGER,
    valor_pedido DECIMAL(12,2),
    datos_raw JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_dyalogo_historico_fecha ON dyalogo_historico(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_dyalogo_historico_agente ON dyalogo_historico(agente);
CREATE INDEX IF NOT EXISTS idx_dyalogo_historico_cliente ON dyalogo_historico(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_dyalogo_historico_barrio ON dyalogo_historico(barrio);
CREATE INDEX IF NOT EXISTS idx_dyalogo_historico_valor ON dyalogo_historico(valor_pedido);

-- Habilitar RLS (Row Level Security) - opcional
ALTER TABLE dyalogo_historico ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura a usuarios autenticados" ON dyalogo_historico
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "Permitir inserción a usuarios autenticados" ON dyalogo_historico
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "Permitir actualización a usuarios autenticados" ON dyalogo_historico
    FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Comentarios de la tabla
COMMENT ON TABLE dyalogo_historico IS 'Datos históricos importados desde Dyalogo';
COMMENT ON COLUMN dyalogo_historico.dyalogo_id IS 'ID único del registro en Dyalogo';
COMMENT ON COLUMN dyalogo_historico.fecha_creacion IS 'Fecha y hora de creación del registro en Dyalogo';
COMMENT ON COLUMN dyalogo_historico.agente IS 'Nombre del agente que atendió la llamada';
COMMENT ON COLUMN dyalogo_historico.valor_pedido IS 'Valor total del pedido en COP';
COMMENT ON COLUMN dyalogo_historico.datos_raw IS 'Datos originales de Dyalogo en formato JSON';
