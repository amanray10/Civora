const prisma = require('../config/prisma');

// GET /api/departments
exports.list = async (_req,res) => {
  try{
    let departments = await prisma.department.findMany({ orderBy: { departmentName: 'asc' } });
    res.json({departments: departments});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching departments."});
  }
};
