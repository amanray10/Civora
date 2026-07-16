const prisma = require('../config/prisma');
let pretty = (s) => s.replaceAll('_', ' ');

// GET /api/admin/analytics — powers the Recharts dashboard
exports.analytics = async (_req,res) => {
  try{
    let p1 = prisma.complaint.groupBy({ by: ['status'], _count: true });
    let p2 = prisma.complaint.groupBy({ by: ['priority'], _count: true });
    let p3 = prisma.complaint.groupBy({ by: ['category'], _count: true });
    let p4 = prisma.complaint.groupBy({ by: ['departmentId'], _count: true });
    let p5 = prisma.complaint.count();
    let p6 = prisma.complaint.count({ where: { status: { in: ['Resolved', 'Closed'] } } });
    let [byStatus, byPriority, byCategory, byDept, total, resolvedAgg] = await Promise.all([p1, p2, p3, p4, p5, p6]);

    let departments = await prisma.department.findMany();
    let deptName = (id) => departments.find(d => d.id === id)?.departmentName || 'Unassigned';

    // last 14 days trend
    let since = new Date(Date.now() - 13 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    let recent = await prisma.complaint.findMany({
      where: { createdAt: { gte: since } }, select: { createdAt: true }
    });
    let trend = [...Array(14)].map((_, i) => {
      let day = new Date(since.getTime() + i * 24 * 3600 * 1000);
      let key = day.toISOString().slice(0, 10);
      return { date: key, count: recent.filter(r => r.createdAt.toISOString().slice(0, 10) === key).length };
    });

    console.log("analytics computed, total:", total);
    res.json({
      total: total,
      resolved: resolvedAgg,
      resolutionRate: total ? Math.round((resolvedAgg / total) * 100) : 0,
      byStatus: byStatus.map(s => ({ name: pretty(s.status), value: s._count })),
      byPriority: byPriority.map(p => ({ name: p.priority || 'Pending', value: p._count })),
      byCategory: byCategory.map(c => ({ name: c.category || 'Pending', value: c._count })),
      byDepartment: byDept.map(d => ({ name: deptName(d.departmentId), value: d._count })),
      trend: trend
    });

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching analytics."});
  }
};

// GET /api/admin/users
exports.users = async (_req,res) => {
  try{
    let users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, deletedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log("users fetched:", users.length);
    res.json({users: users});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching users."});
  }
};

// PUT /api/admin/users/:id/role  { role, departmentId }
exports.setRole = async (req,res) => {
  let {role, departmentId} = req.body;
  if (!['citizen', 'department', 'admin', 'superadmin'].includes(role)){
    return res.status(400).json({error: "Invalid role."});
  }

  try{
    let user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { role: role, departmentId: ['department', 'admin'].includes(role) ? Number(departmentId) || null : null }
    });

    console.log("role updated:", user.id, role);
    res.json({user: { id: user.id, role: user.role, departmentId: user.departmentId }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while updating role."});
  }
};

// PUT /api/admin/users/:id/deactivate
exports.deactivate = async (req,res) => {
  let id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({error: "You cannot deactivate your own account."});

  try{
    let user = await prisma.user.update({
      where: { id: id },
      data: { isActive: false, deletedAt: new Date() }
    });

    console.log("deactivated:", user.id);
    res.json({user: { id: user.id, isActive: user.isActive, deletedAt: user.deletedAt }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while deactivating user."});
  }
};

// PUT /api/admin/users/:id/reactivate
exports.reactivate = async (req,res) => {
  let id = Number(req.params.id);

  try{
    let user = await prisma.user.update({
      where: { id: id },
      data: { isActive: true, deletedAt: null }
    });

    console.log("reactivated:", user.id);
    res.json({user: { id: user.id, isActive: user.isActive, deletedAt: user.deletedAt }});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while reactivating user."});
  }
};
