/**
 * Supabase Configuration (For Vite Build)
 *
 * ⚠️ NOTA IMPORTANTE:
 * Este archivo está diseñado para ser usado con Vite (compilación con bundler).
 * NO se usa en admin.html que carga Supabase desde UMD bundle.
 *
 * Si decides migrar a un build system como Vite en el futuro,
 * este archivo se usará automáticamente en lugar de la configuración inline.
 *
 * Para desarrollo con HTML estático (actual):
 * - Ver admin.html líneas 83-96 para la configuración activa
 * - window.supabaseClient es el cliente global que se usa en toda la app
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false, // Manejamos sesión manualmente
        autoRefreshToken: false,
    },
});

console.info('[Supabase] Cliente inicializado correctamente (Vite build)');
