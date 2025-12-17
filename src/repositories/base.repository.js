import { APP_CONFIG } from '../core/config/app.config.js';

/**
 * Base repository class for database operations
 */
export class BaseRepository {
    constructor(tableName) {
        this.table = tableName;
        // Use global Supabase client from admin.html
        this.db = window.supabaseClient;

        if (APP_CONFIG.enableDebug) {
            console.info(`[${this.table}Repository] Initialized`);
        }
    }

    /**
     * Find all records
     * @param {Object} options - Query options
     * @returns {Promise<Array>}
     */
    async findAll(options = {}) {
        try {
            let query = this.db.from(this.table).select('*');

            // Order by
            if (options.orderBy) {
                query = query.order(options.orderBy.field, {
                    ascending: options.orderBy.ascending !== false,
                });
            }

            // Limit
            if (options.limit) {
                query = query.limit(options.limit);
            }

            // Offset
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error(`[${this.table}] Error in findAll:`, error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error(`[${this.table}Repository] findAll failed:`, error);
            throw error;
        }
    }

    /**
     * Find record by ID
     * @param {number|string} id
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                console.error(`[${this.table}] Error in findById:`, error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] findById failed:`, error);
            throw error;
        }
    }

    /**
     * Create new record
     * @param {Object} record
     * @returns {Promise<Object>}
     */
    async create(record) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .insert(record)
                .select()
                .single();

            if (error) {
                console.error(`[${this.table}] Error in create:`, error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] create failed:`, error);
            throw error;
        }
    }

    /**
     * Update record
     * @param {number|string} id
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async update(id, updates) {
        try {
            const { data, error } = await this.db
                .from(this.table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error(`[${this.table}] Error in update:`, error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`[${this.table}Repository] update failed:`, error);
            throw error;
        }
    }

    /**
     * Delete record
     * @param {number|string} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            const { error } = await this.db.from(this.table).delete().eq('id', id);

            if (error) {
                console.error(`[${this.table}] Error in delete:`, error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error(`[${this.table}Repository] delete failed:`, error);
            throw error;
        }
    }

    /**
     * Find records matching conditions
     * @param {Object} conditions - Key-value pairs for filtering
     * @returns {Promise<Array>}
     */
    async findWhere(conditions) {
        try {
            let query = this.db.from(this.table).select('*');

            for (const [key, value] of Object.entries(conditions)) {
                query = query.eq(key, value);
            }

            const { data, error } = await query;

            if (error) {
                console.error(`[${this.table}] Error in findWhere:`, error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error(`[${this.table}Repository] findWhere failed:`, error);
            throw error;
        }
    }

    /**
     * Count records
     * @param {Object} conditions - Optional conditions
     * @returns {Promise<number>}
     */
    async count(conditions = {}) {
        try {
            let query = this.db.from(this.table).select('*', { count: 'exact', head: true });

            for (const [key, value] of Object.entries(conditions)) {
                query = query.eq(key, value);
            }

            const { count, error } = await query;

            if (error) {
                console.error(`[${this.table}] Error in count:`, error);
                throw error;
            }

            return count || 0;
        } catch (error) {
            console.error(`[${this.table}Repository] count failed:`, error);
            throw error;
        }
    }
}
