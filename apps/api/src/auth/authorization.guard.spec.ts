import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard.js';

describe('AuthorizationGuard', () => {
  it('rejects a user who lacks a required backend permission', () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValueOnce(['users.manage'])
        .mockReturnValueOnce(undefined),
    } as unknown as Reflector;
    const guard = new AuthorizationGuard(reflector);
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { roles: ['LEAD_MANAGER'], permissions: ['request.read'] },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
