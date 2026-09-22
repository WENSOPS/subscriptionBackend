-- Allow duplicate service titles (match schema: Service.title without @unique)
DROP INDEX `services_title_key` ON `services`;
