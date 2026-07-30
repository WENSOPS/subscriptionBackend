const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'package_backend'
    AND table_name LIKE '%Referral%'
  `;
  console.log(rows);
}

main().finally(() => prisma.$disconnect());
