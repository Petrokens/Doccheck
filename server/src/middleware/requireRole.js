// requireRole.js
module.exports = function (allowedRoleIds = []) {
  return function (req, res, next) {
    if (!req.user || !allowedRoleIds.includes(req.user.role_id)) {
      return res.status(403).json({ error: 'Access denied: insufficient role_id' });
    }
    next();
  };
};