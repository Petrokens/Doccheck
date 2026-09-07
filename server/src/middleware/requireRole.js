module.exports = function requireRole(allowedIds) {
  const ids = Array.isArray(allowedIds) ? allowedIds.map(Number) : [Number(allowedIds)];
  return (req, res, next) => {
    const roleId = Number(req.user?.role_id);
    if (!ids.includes(roleId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
