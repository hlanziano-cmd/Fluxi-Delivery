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

console.info('[Supabase] Cliente inicializado correctamente');
