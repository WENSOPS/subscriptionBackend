-- Allow duplicate service titles (match schema: Service.title without @unique)
-- Idempotent: index name/table varied across environments (case renames, prior manual drops)

DROP PROCEDURE IF EXISTS _drop_idx;
CREATE PROCEDURE _drop_idx(IN tbl VARCHAR(100), IN idx VARCHAR(200))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx
  ) THEN
    SET @_sql = CONCAT('DROP INDEX `', idx, '` ON `', tbl, '`');
    PREPARE _stmt FROM @_sql;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END;

CALL _drop_idx('services', 'services_title_key');
CALL _drop_idx('services', 'Service_title_key');
CALL _drop_idx('Service', 'Service_title_key');
CALL _drop_idx('Service', 'services_title_key');

DROP PROCEDURE IF EXISTS _drop_idx;
