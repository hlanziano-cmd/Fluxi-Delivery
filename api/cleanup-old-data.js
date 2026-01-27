/**
 * Vercel Serverless Function - Limpieza de datos antiguos
 *
 * Esta función elimina pedidos con más de 90 días de antigüedad
 * para mantener la base de datos optimizada.
 *
 * IMPORTANTE: Esta función requiere la service_role key para eliminar datos.
 * Se debe ejecutar manualmente o programar con Vercel Cron.
 */

const { createClient } = require('@supabase/supabase-js');

// NOTA: Para eliminación masiva se necesita la service_role key
// La anon key tiene restricciones de RLS que pueden impedir la eliminación
const supabase = createClient(
    'https://lbifbexhmvbanvrjfglp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaWZiZXhobXZiYW52cmpmZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjg5MDQsImV4cCI6MjA3NjUwNDkwNH0.ZXjCv4DkNobkn3IDK9wYBjjOV55Bf_UwcSxhkt6YqGo'
);

const DATA_RETENTION_DAYS = 90;

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir POST para operaciones de eliminación
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        // Calcular fecha límite
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
        const cutoffISO = cutoffDate.toISOString();

        console.log(`🗑️ Buscando pedidos anteriores a: ${cutoffISO}`);

        // Primero contar cuántos registros se eliminarán
        const { count: toDelete, error: countError } = await supabase
            .from('pedidos')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', cutoffISO);

        if (countError) {
            throw countError;
        }

        console.log(`📊 Registros a eliminar: ${toDelete}`);

        // Si hay modo "dry-run", solo reportar
        const dryRun = req.query?.dryRun === 'true' || req.body?.dryRun === true;

        if (dryRun) {
            return res.status(200).json({
                success: true,
                dryRun: true,
                cutoffDate: cutoffISO,
                recordsToDelete: toDelete,
                message: `Se eliminarían ${toDelete} registros anteriores a ${cutoffISO.split('T')[0]}`
            });
        }

        // Eliminar en lotes para evitar timeouts
        let deleted = 0;
        const BATCH_SIZE = 100;

        while (deleted < toDelete) {
            // Obtener IDs de registros a eliminar
            const { data: oldRecords, error: selectError } = await supabase
                .from('pedidos')
                .select('id')
                .lt('created_at', cutoffISO)
                .limit(BATCH_SIZE);

            if (selectError) {
                console.error('Error seleccionando registros:', selectError);
                break;
            }

            if (!oldRecords || oldRecords.length === 0) {
                break;
            }

            const idsToDelete = oldRecords.map(r => r.id);

            // Eliminar el lote
            const { error: deleteError } = await supabase
                .from('pedidos')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) {
                console.error('Error eliminando lote:', deleteError);
                // Puede ser un problema de permisos RLS
                return res.status(500).json({
                    success: false,
                    error: 'Error de permisos. Se requiere service_role key para eliminar datos.',
                    details: deleteError.message,
                    deletedSoFar: deleted
                });
            }

            deleted += idsToDelete.length;
            console.log(`✅ Eliminados: ${deleted}/${toDelete}`);
        }

        console.log(`🎉 Limpieza completada: ${deleted} registros eliminados`);

        return res.status(200).json({
            success: true,
            cutoffDate: cutoffISO,
            recordsDeleted: deleted,
            message: `Se eliminaron ${deleted} registros anteriores a ${cutoffISO.split('T')[0]}`
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
