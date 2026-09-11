export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  permissions: string[];
}

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
  sessionId: string;
  familyId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
  familyId: string;
  csrfHash: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
