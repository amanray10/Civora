const prisma = require('../config/prisma');

// Fetches the target user and confirms they belong to req.user's department scope:
// either a citizen who has filed a complaint routed to this department, or a
// department officer of this same department. Returns null if out of scope.
async function findScopedUser(req, targetId){
  let departmentId = req.user.departmentId;
  let user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) return null;

  if (user.role === 'department' && user.departmentId === departmentId) return user;
  if (user.role === 'citizen'){
    let hasComplaint = await prisma.complaint.findFirst({ where: { userId: user.id, departmentId: departmentId } });
    if (hasComplaint) return user;
  }
  return null;
}

// GET /api/dept-admin/users — citizens who filed a request here + this department's officers
exports.listUsers = async (req,res) => {
  let departmentId = req.user.departmentId;

  try{
    let users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'citizen', complaints: { some: { departmentId: departmentId } } },
          { role: 'department', departmentId: departmentId }
        ]
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log("dept-admin users fetched:", users.length);
    res.json({users: users});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching users."});
  }
};

// POST /api/dept-admin/officers  { email } — promote a citizen to department officer, scoped to own department
exports.addOfficer = async (req,res) => {
  let {email} = req.body;
  if (!email?.trim()) return res.status(400).json({error: "Email is required."});

  try{
    let target = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (!target) return res.status(404).json({error: "No account found with that email."});
    if (target.role === 'department' && target.departmentId === req.user.departmentId){
      return res.status(200).json({user: { id: target.id, role: target.role, departmentId: target.departmentId }});
    }
    if (target.role !== 'citizen'){
      return res.status(403).json({error: "This account is outside your department's scope."});
    }

    let updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: 'department', departmentId: req.user.departmentId }
    });

    console.log("officer added:", updated.id);
    res.json({user: { id: updated.id, role: updated.role, departmentId: updated.departmentId }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while adding officer."});
  }
};

// PUT /api/dept-admin/officers/:id/demote
exports.demoteOfficer = async (req,res) => {
  let id = Number(req.params.id);

  try{
    let target = await prisma.user.findUnique({ where: { id: id } });
    if (!target || target.role !== 'department' || target.departmentId !== req.user.departmentId){
      return res.status(403).json({error: "This user is outside your department's scope."});
    }

    let updated = await prisma.user.update({ where: { id: id }, data: { role: 'citizen', departmentId: null } });

    console.log("officer demoted:", updated.id);
    res.json({user: { id: updated.id, role: updated.role, departmentId: updated.departmentId }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while demoting officer."});
  }
};

// PUT /api/dept-admin/users/:id/deactivate
exports.deactivate = async (req,res) => {
  let id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({error: "You cannot deactivate your own account."});

  try{
    let target = await findScopedUser(req, id);
    if (!target) return res.status(403).json({error: "This user is outside your department's scope."});

    let updated = await prisma.user.update({ where: { id: id }, data: { isActive: false, deletedAt: new Date() } });

    console.log("dept-admin deactivated:", updated.id);
    res.json({user: { id: updated.id, isActive: updated.isActive, deletedAt: updated.deletedAt }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while deactivating user."});
  }
};

// PUT /api/dept-admin/users/:id/reactivate
exports.reactivate = async (req,res) => {
  let id = Number(req.params.id);

  try{
    let target = await findScopedUser(req, id);
    if (!target) return res.status(403).json({error: "This user is outside your department's scope."});

    let updated = await prisma.user.update({ where: { id: id }, data: { isActive: true, deletedAt: null } });

    console.log("dept-admin reactivated:", updated.id);
    res.json({user: { id: updated.id, isActive: updated.isActive, deletedAt: updated.deletedAt }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while reactivating user."});
  }
};
