const jwt = require('jsonwebtoken');
require('dotenv').config();

function requireAuthentication(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

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
