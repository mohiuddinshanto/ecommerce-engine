INSERT INTO `User` (
  `id`, `name`, `email`, `passwordHash`, `emailVerified`, `passwordResetToken`,
  `passwordResetExpiry`, `role`, `staffType`, `allowedCategories`, `createdAt`, `updatedAt`
) VALUES (
  'f9b16f44-4ac0-4d13-b20e-7bfde926fb88',
  'Task Demo Admin',
  'demo@admin.com',
  '$2b$12$gyyX/SHprT6HzjH6sXTdyOmCWpfRujYdp7/Z5oNUa8XROqx9B206m',
  true, NULL, NULL, 'ADMIN', NULL, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `name` = 'Task Demo Admin',
  `passwordHash` = VALUES(`passwordHash`),
  `emailVerified` = true,
  `passwordResetToken` = NULL,
  `passwordResetExpiry` = NULL,
  `role` = 'ADMIN',
  `staffType` = NULL,
  `allowedCategories` = NULL,
  `updatedAt` = CURRENT_TIMESTAMP(3);
