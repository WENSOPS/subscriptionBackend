-- Normalize legacy string values before type change (seeded expo)
UPDATE `expos`
SET
  `airportDistance` = '28',
  `airportTravelTime` = '1'
WHERE `slug` = 'gcprs-2026';

UPDATE `expos`
SET `airportDistance` = NULL
WHERE `airportDistance` IS NOT NULL
  AND `airportDistance` NOT REGEXP '^[0-9]+(\\.[0-9]+)?$';

UPDATE `expos`
SET `airportTravelTime` = NULL
WHERE `airportTravelTime` IS NOT NULL
  AND `airportTravelTime` NOT REGEXP '^[0-9]+(\\.[0-9]+)?$';

ALTER TABLE `expos`
  MODIFY `airportDistance` DOUBLE NULL,
  MODIFY `airportTravelTime` DOUBLE NULL;
