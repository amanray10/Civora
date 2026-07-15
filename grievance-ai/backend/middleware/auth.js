// JWT authentication + role guards
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next){
  let header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({error: "Sign in to continue."});

  try{
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role, departmentId }
    next();
  } catch (err){
    console.log(err);
    return res.status(401).json({error: "Session expired. Sign in again."});
  }
}

let requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)){
    return res.status(403).json({error: "You do not have permission to do this."});
  }
  next();
};

module.exports = { requireAuth, requireRole };
