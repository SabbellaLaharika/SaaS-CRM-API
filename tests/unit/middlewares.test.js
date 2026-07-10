const jwt = require('jsonwebtoken');
const { requireAuthentication } = require('../../src/middlewares/auth');
const { requireRole } = require('../../src/middlewares/rbac');

jest.mock('jsonwebtoken');

describe('Middleware Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('requireAuthentication Middleware', () => {
    test('Should return 401 if Authorization header is missing', () => {
      requireAuthentication(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('Should return 401 if token is missing in Authorization header', () => {
      req.headers.authorization = 'Bearer ';

      requireAuthentication(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('Should return 401 if JWT verification fails', () => {
      req.headers.authorization = 'Bearer invalid_token';
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      requireAuthentication(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('Should call next and attach user context if JWT is valid', () => {
      req.headers.authorization = 'Bearer valid_token';
      const mockDecoded = {
        userId: 'user-123',
        organizationId: 'org-456',
        role: 'member',
      };
      jwt.verify.mockReturnValue(mockDecoded);

      requireAuthentication(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'user-123',
        organizationId: 'org-456',
        role: 'member',
      });
      expect(req.tenant).toEqual({
        organizationId: 'org-456',
        role: 'member',
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole Middleware', () => {
    test('Should return 403 if req.user is missing', () => {
      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    test('Should return 403 if user role is not allowed', () => {
      req.user = { role: 'viewer' };
      const middleware = requireRole(['owner', 'admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    test('Should call next if user role is allowed', () => {
      req.user = { role: 'admin' };
      const middleware = requireRole(['owner', 'admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
