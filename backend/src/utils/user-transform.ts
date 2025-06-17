import { User } from '@shared/types/auth';

/**
 * Transform Prisma user to shared User type
 * Handles null to undefined conversions
 */
export function transformUser(prismaUser: any): User {
  const { passwordHash, twoFactorSecret, backupCodes, ...userFields } = prismaUser;
  
  return {
    ...userFields,
    avatar: userFields.avatar || undefined,
    bio: userFields.bio || undefined,
  };
}