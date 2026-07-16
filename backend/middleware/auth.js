// JWT authentication + role guards
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function requireAuth(req, res, next){
  let header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({error: "Sign in to continue."});

  try{
    let payload = jwt.verify(token, process.env.JWT_SECRET); // { id, role, departmentId }

    let account = await prisma.user.findUnique({ where: { id: payload.id }, select: { isActive: true } });
    if (!account || !account.isActive){
      return res.status(401).json({error: "This account has been deactivated."});
    }

    req.user = payload;
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

// Shared department-scoping check for the `department`/`admin` roles.
let sameDepartment = (req, departmentId) => req.user.departmentId === departmentId;

module.exports = { requireAuth, requireRole, sameDepartment };
