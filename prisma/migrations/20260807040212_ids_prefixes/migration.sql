-- =============================================================================
-- MIGRATION: 20260807040212_ids_prefixes  (v7 — drop _CouponToPackage/_OfferToPackage FKs too)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _drop_fk;
CREATE PROCEDURE _drop_fk(IN tbl VARCHAR(100), IN fk VARCHAR(200))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA    = DATABASE()
      AND TABLE_NAME      = tbl
      AND CONSTRAINT_NAME = fk
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @_sql = CONCAT('ALTER TABLE `', tbl, '` DROP FOREIGN KEY `', fk, '`');
    PREPARE _stmt FROM @_sql;
    EXECUTE _stmt;
    DEALLOCATE PREPARE _stmt;
  END IF;
END;

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


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Drop _PackageServices (leftover, blocks packages.id alter)
-- ─────────────────────────────────────────────────────────────────────────────
CALL _drop_fk('_PackageServices', '_PackageServices_A_fkey');
CALL _drop_fk('_PackageServices', '_PackageServices_B_fkey');
DROP TABLE IF EXISTS `_PackageServices`;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Drop ALL FK constraints conditionally
--           Includes _CouponToPackage and _OfferToPackage which block
--           altering coupons.id, packages.id and offers.id
-- ─────────────────────────────────────────────────────────────────────────────

-- _CouponToPackage FKs (block ALTER TABLE coupons and packages)
CALL _drop_fk('_CouponToPackage', '_CouponToPackage_A_fkey');
CALL _drop_fk('_CouponToPackage', '_CouponToPackage_B_fkey');

-- _OfferToPackage FKs (block ALTER TABLE offers and packages)
CALL _drop_fk('_OfferToPackage',  '_OfferToPackage_A_fkey');
CALL _drop_fk('_OfferToPackage',  '_OfferToPackage_B_fkey');

-- All other FKs
CALL _drop_fk('orders',                        'orders_packageId_fkey');
CALL _drop_fk('orders',                        'Order_userId_fkey');
CALL _drop_fk('orders',                        'orders_userId_fkey');
CALL _drop_fk('package_media',                 'package_media_packageId_fkey');
CALL _drop_fk('package_services',              'package_services_packageId_fkey');
CALL _drop_fk('package_services',              'PackageService_serviceId_fkey');
CALL _drop_fk('package_services',              'package_services_serviceId_fkey');
CALL _drop_fk('subscriptions',                 'subscriptions_packageId_fkey');
CALL _drop_fk('subscriptions',                 'subscriptions_userId_fkey');
CALL _drop_fk('subscriptions',                 'Subscription_userId_fkey');
CALL _drop_fk('bookings',                      'Booking_userId_fkey');
CALL _drop_fk('bookings',                      'bookings_userId_fkey');
CALL _drop_fk('offer_benefits',                'offer_benefits_offerId_fkey');
CALL _drop_fk('ReferralProgramRefereePackage', 'ReferralProgramRefereePackage_referralProgramId_fkey');
CALL _drop_fk('ReferralProgramReferrerPackage','ReferralProgramReferrerPackage_referralProgramId_fkey');
CALL _drop_fk('ReferralReward',                'ReferralReward_userId_fkey');
CALL _drop_fk('ReferralTriggerPackage',        'ReferralTriggerPackage_referralProgramId_fkey');
CALL _drop_fk('TrackReferral',                 'TrackReferral_refereeUserId_fkey');
CALL _drop_fk('TrackReferral',                 'TrackReferral_referralProgramId_fkey');
CALL _drop_fk('TrackReferral',                 'TrackReferral_referrerUserId_fkey');
CALL _drop_fk('trips',                         'trips_userId_fkey');
CALL _drop_fk('trips',                         'Trip_userId_fkey');
CALL _drop_fk('trips',                         'trips_subscriptionId_fkey');
CALL _drop_fk('trips',                         'Trip_subscriptionId_fkey');
CALL _drop_fk('user_referral_category_track',  'user_referral_category_track_referralProgramId_fkey');
CALL _drop_fk('user_referral_category_track',  'user_referral_category_track_userId_fkey');
CALL _drop_fk('users',                         'users_referredByUserId_fkey');


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — Drop ALL indexes conditionally
-- ─────────────────────────────────────────────────────────────────────────────
CALL _drop_idx('_CouponToPackage',               '_CouponToPackage_A_fkey');
CALL _drop_idx('_CouponToPackage',               '_CouponToPackage_B_fkey');
CALL _drop_idx('_OfferToPackage',                '_OfferToPackage_A_fkey');
CALL _drop_idx('_OfferToPackage',                '_OfferToPackage_B_fkey');
CALL _drop_idx('bookings',                       'Booking_userId_fkey');
CALL _drop_idx('bookings',                       'bookings_userId_fkey');
CALL _drop_idx('offer_benefits',                 'offer_benefits_offerId_fkey');
CALL _drop_idx('orders',                         'orders_packageId_fkey');
CALL _drop_idx('orders',                         'Order_userId_fkey');
CALL _drop_idx('orders',                         'orders_userId_fkey');
CALL _drop_idx('package_media',                  'package_media_packageId_fkey');
CALL _drop_idx('package_services',               'package_services_packageId_fkey');
CALL _drop_idx('package_services',               'PackageService_serviceId_fkey');
CALL _drop_idx('package_services',               'package_services_serviceId_fkey');
CALL _drop_idx('ReferralProgramRefereePackage',  'ReferralProgramRefereePackage_referralProgramId_fkey');
CALL _drop_idx('ReferralProgramReferrerPackage', 'ReferralProgramReferrerPackage_referralProgramId_fkey');
CALL _drop_idx('ReferralReward',                 'ReferralReward_userId_fkey');
CALL _drop_idx('subscriptions',                  'subscriptions_packageId_fkey');
CALL _drop_idx('subscriptions',                  'subscriptions_userId_fkey');
CALL _drop_idx('subscriptions',                  'Subscription_userId_fkey');
CALL _drop_idx('TrackReferral',                  'TrackReferral_referralProgramId_fkey');
CALL _drop_idx('trips',                          'Trip_subscriptionId_fkey');
CALL _drop_idx('trips',                          'trips_subscriptionId_fkey');
CALL _drop_idx('trips',                          'Trip_userId_fkey');
CALL _drop_idx('trips',                          'trips_userId_fkey');
CALL _drop_idx('user_referral_category_track',   'user_referral_category_track_referralProgramId_fkey');
CALL _drop_idx('users',                          'users_referredByUserId_fkey');


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — Alter all tables to VARCHAR(50)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `bookings` DROP PRIMARY KEY,
    MODIFY `id`        VARCHAR(50) NOT NULL,
    MODIFY `userId`    VARCHAR(50) NOT NULL,
    MODIFY `packageId` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `coupons` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `offer_benefits` DROP PRIMARY KEY,
    MODIFY `id`      VARCHAR(50) NOT NULL,
    MODIFY `offerId` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `offers` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `orders` DROP PRIMARY KEY,
    MODIFY `id`                      VARCHAR(50) NOT NULL,
    MODIFY `userId`                  VARCHAR(50) NOT NULL,
    MODIFY `packageId`               VARCHAR(50) NOT NULL,
    MODIFY `couponId`                VARCHAR(50) NULL,
    MODIFY `appliedReferralRewardId` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `package_media` DROP PRIMARY KEY,
    MODIFY `id`        VARCHAR(50) NOT NULL,
    MODIFY `packageId` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `package_services` DROP PRIMARY KEY,
    MODIFY `id`        VARCHAR(50) NOT NULL,
    MODIFY `packageId` VARCHAR(50) NOT NULL,
    MODIFY `serviceId` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `packages` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `ReferralProgram` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `ReferralProgramRefereePackage` DROP PRIMARY KEY,
    MODIFY `id`                VARCHAR(50) NOT NULL,
    MODIFY `referralProgramId` VARCHAR(50) NOT NULL,
    MODIFY `packageId`         VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `ReferralProgramReferrerPackage` DROP PRIMARY KEY,
    MODIFY `id`                VARCHAR(50) NOT NULL,
    MODIFY `referralProgramId` VARCHAR(50) NOT NULL,
    MODIFY `packageId`         VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `ReferralReward` DROP PRIMARY KEY,
    MODIFY `id`     VARCHAR(50) NOT NULL,
    MODIFY `userId` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `ReferralTriggerPackage` DROP PRIMARY KEY,
    MODIFY `id`                VARCHAR(50) NOT NULL,
    MODIFY `referralProgramId` VARCHAR(50) NOT NULL,
    MODIFY `packageId`         VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `services` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `subscriptions` DROP PRIMARY KEY,
    MODIFY `id`         VARCHAR(50) NOT NULL,
    MODIFY `userId`     VARCHAR(50) NOT NULL,
    MODIFY `packageId`  VARCHAR(50) NOT NULL,
    MODIFY `verifiedBy` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `TrackReferral` DROP PRIMARY KEY,
    MODIFY `id`                       VARCHAR(50) NOT NULL,
    MODIFY `referralProgramId`        VARCHAR(50) NOT NULL,
    MODIFY `referrerUserId`           VARCHAR(50) NOT NULL,
    MODIFY `refereeUserId`            VARCHAR(50) NOT NULL,
    MODIFY `referrerReferralRewardId` VARCHAR(50) NULL,
    MODIFY `triggeringOrderId`        VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `trips` DROP PRIMARY KEY,
    MODIFY `id`             VARCHAR(50) NOT NULL,
    MODIFY `userId`         VARCHAR(50) NOT NULL,
    MODIFY `subscriptionId` VARCHAR(50) NOT NULL,
    MODIFY `confirmedBy`    VARCHAR(50) NULL,
    MODIFY `cancelledBy`    VARCHAR(50) NULL,
    MODIFY `createdBy`      VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `user_referral_category_track` DROP PRIMARY KEY,
    MODIFY `id`                VARCHAR(50) NOT NULL,
    MODIFY `userId`            VARCHAR(50) NOT NULL,
    MODIFY `referralProgramId` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id`               VARCHAR(50) NOT NULL,
    MODIFY `referredByUserId` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — Resize _CouponToPackage / _OfferToPackage columns
--           (tables exist from earlier migrations, FKs already dropped above)
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS _migrate_coupon_package;
CREATE PROCEDURE _migrate_coupon_package()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CouponToPackage'
  ) THEN
    ALTER TABLE `_CouponToPackage`
      MODIFY `A` VARCHAR(50) NOT NULL,
      MODIFY `B` VARCHAR(50) NOT NULL;
  ELSE
    CREATE TABLE `_CouponToPackage` (
      `A` VARCHAR(50) NOT NULL,
      `B` VARCHAR(50) NOT NULL,
      UNIQUE INDEX `_CouponToPackage_AB_unique` (`A`, `B`),
      INDEX `_CouponToPackage_B_index` (`B`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  END IF;
END;
CALL _migrate_coupon_package();
DROP PROCEDURE _migrate_coupon_package;

DROP PROCEDURE IF EXISTS _migrate_offer_package;
CREATE PROCEDURE _migrate_offer_package()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_OfferToPackage'
  ) THEN
    ALTER TABLE `_OfferToPackage`
      MODIFY `A` VARCHAR(50) NOT NULL,
      MODIFY `B` VARCHAR(50) NOT NULL;
  ELSE
    CREATE TABLE `_OfferToPackage` (
      `A` VARCHAR(50) NOT NULL,
      `B` VARCHAR(50) NOT NULL,
      UNIQUE INDEX `_OfferToPackage_AB_unique` (`A`, `B`),
      INDEX `_OfferToPackage_B_index` (`B`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  END IF;
END;
CALL _migrate_offer_package();
DROP PROCEDURE _migrate_offer_package;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6 — Re-add all FK constraints
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `users`
    ADD CONSTRAINT `users_referredByUserId_fkey`
    FOREIGN KEY (`referredByUserId`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `package_media`
    ADD CONSTRAINT `package_media_packageId_fkey`
    FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `package_services`
    ADD CONSTRAINT `package_services_packageId_fkey`
    FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `package_services`
    ADD CONSTRAINT `package_services_serviceId_fkey`
    FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `orders`
    ADD CONSTRAINT `orders_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `orders`
    ADD CONSTRAINT `orders_packageId_fkey`
    FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `subscriptions`
    ADD CONSTRAINT `subscriptions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `subscriptions`
    ADD CONSTRAINT `subscriptions_packageId_fkey`
    FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `trips`
    ADD CONSTRAINT `trips_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `trips`
    ADD CONSTRAINT `trips_subscriptionId_fkey`
    FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `bookings`
    ADD CONSTRAINT `bookings_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `offer_benefits`
    ADD CONSTRAINT `offer_benefits_offerId_fkey`
    FOREIGN KEY (`offerId`) REFERENCES `offers`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ReferralTriggerPackage`
    ADD CONSTRAINT `ReferralTriggerPackage_referralProgramId_fkey`
    FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ReferralProgramReferrerPackage`
    ADD CONSTRAINT `ReferralProgramReferrerPackage_referralProgramId_fkey`
    FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ReferralProgramRefereePackage`
    ADD CONSTRAINT `ReferralProgramRefereePackage_referralProgramId_fkey`
    FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_referral_category_track`
    ADD CONSTRAINT `user_referral_category_track_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_referral_category_track`
    ADD CONSTRAINT `user_referral_category_track_referralProgramId_fkey`
    FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TrackReferral`
    ADD CONSTRAINT `TrackReferral_referralProgramId_fkey`
    FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `TrackReferral`
    ADD CONSTRAINT `TrackReferral_referrerUserId_fkey`
    FOREIGN KEY (`referrerUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `TrackReferral`
    ADD CONSTRAINT `TrackReferral_refereeUserId_fkey`
    FOREIGN KEY (`refereeUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ReferralReward`
    ADD CONSTRAINT `ReferralReward_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_CouponToPackage`
    ADD CONSTRAINT `_CouponToPackage_A_fkey`
    FOREIGN KEY (`A`) REFERENCES `coupons`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_CouponToPackage`
    ADD CONSTRAINT `_CouponToPackage_B_fkey`
    FOREIGN KEY (`B`) REFERENCES `packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_OfferToPackage`
    ADD CONSTRAINT `_OfferToPackage_A_fkey`
    FOREIGN KEY (`A`) REFERENCES `offers`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_OfferToPackage`
    ADD CONSTRAINT `_OfferToPackage_B_fkey`
    FOREIGN KEY (`B`) REFERENCES `packages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS _drop_fk;
DROP PROCEDURE IF EXISTS _drop_idx;