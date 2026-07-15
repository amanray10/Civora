// Seeds default departments. Run: npm run seed
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const departments = [
  { departmentName: 'Electricity Department', email: 'electricity@city.gov.in' },
  { departmentName: 'Water Supply Department', email: 'water@city.gov.in' },
  { departmentName: 'Sanitation Department', email: 'sanitation@city.gov.in' },
  { departmentName: 'Roads & Infrastructure', email: 'roads@city.gov.in' },
  { departmentName: 'Public Health Department', email: 'health@city.gov.in' },
  { departmentName: 'Gas & Fire Safety', email: 'firesafety@city.gov.in' },
  { departmentName: 'Parks & Environment', email: 'parks@city.gov.in' },
  { departmentName: 'General Administration', email: 'admin@city.gov.in' }
];

async function main() {
  for (const d of departments) {
    await prisma.department.upsert({
      where: { departmentName: d.departmentName },
      update: {},
      create: d
    });
  }
  console.log('Seeded', departments.length, 'departments.');
  // Tip: after your first Google login, promote yourself:
  //   UPDATE User SET role='admin' WHERE email='you@gmail.com';
}

main().finally(() => prisma.$disconnect());
