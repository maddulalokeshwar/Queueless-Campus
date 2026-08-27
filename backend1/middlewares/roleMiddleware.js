//restricts a route to the given roles, must run after authMiddleware
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    //check the role from req.user is in the allowed list
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ message: "You are not authorized" });
    }
    next();
  };
};
