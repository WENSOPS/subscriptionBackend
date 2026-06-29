-- Safe: just renames tables, zero data loss
RENAME TABLE `user` TO `users`;
RENAME TABLE `service` TO `services`;
RENAME TABLE `package` TO `packages`;
RENAME TABLE `packageservice` TO `package_services`;
RENAME TABLE `coupon` TO `coupons`;
RENAME TABLE `order` TO `orders`;
RENAME TABLE `subscription` TO `subscriptions`;
RENAME TABLE `trip` TO `trips`;
RENAME TABLE `booking` TO `bookings`;