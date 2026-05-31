const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles || []
      };

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ success: false, message: 'Forbidden, no privileges allocated' });
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ success: false, message: 'Forbidden, insufficient permissions' });
    }

    next();
  };
};

module.exports = { protect, restrictTo };
