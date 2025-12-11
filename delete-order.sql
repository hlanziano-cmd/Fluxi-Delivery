-- ========================================
-- Delete specific order by ID
-- ========================================

DELETE FROM pedidos
WHERE id = 'ed8e8b63-fec4-43a4-aa6b-1a5444d845f3';

-- Verify deletion
SELECT COUNT(*) as remaining_count
FROM pedidos
WHERE id = 'ed8e8b63-fec4-43a4-aa6b-1a5444d845f3';

-- This should return 0 if the deletion was successful
