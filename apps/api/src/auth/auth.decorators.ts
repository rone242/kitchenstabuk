import { SetMetadata } from '@nestjs/common';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ROLES_KEY,
} from './auth.constants.js';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
