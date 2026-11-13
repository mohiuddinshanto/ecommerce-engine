ALTER TABLE `User`
  MODIFY `role` ENUM('ADMIN', 'STAFF', 'CUSTOMER', 'REVIEWER') NOT NULL DEFAULT 'CUSTOMER';

UPDATE `User`
SET `role` = 'REVIEWER', `staffType` = NULL, `allowedCategories` = NULL,
    `passwordResetToken` = NULL, `passwordResetExpiry` = NULL
WHERE `email` = 'reviewer@epic-store.example.com'
  AND `role` = 'CUSTOMER';
