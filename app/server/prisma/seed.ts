// [041025FREEMAN] Add file seed

import { PrismaClient, Role } from "@prisma/client";
import dotenv from "dotenv";

const prisma = new PrismaClient();
dotenv.config();

async function main() {
  const enterprise = await prisma.enterprise.create({
    data: {
      name: "Freeman Inc",
    },
  });

  await prisma.user.createMany({
    data: [
      {
        name: "Admin User",
        email: "admin@example.com",
        password: "securepassword",
        role: Role.ADMIN,
        enterpriseId: enterprise.id,
      },
      {
        name: "Staff User",
        email: "staff@example.com",
        password: "123456",
        role: Role.STAFF,
        enterpriseId: enterprise.id,
      },
    ],
  });

  console.log("✅ Seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
