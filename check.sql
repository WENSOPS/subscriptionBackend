SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'package_backend'
AND table_name LIKE '%Referral%';
