const jwt = require('jsonwebtoken');
require('dotenv').config();

function requireAuthentication(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    
    // Attach context for downstream controllers and repositories
    req.user = {
      id: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role
    };

    // Also attach to req.tenant for compatibility
    req.tenant = {
      organizationId: decoded.organizationId,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  requireAuthentication,
};
