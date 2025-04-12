// [041025FREEMAN] Add file seed

import { PrismaClient, Role } from "@prisma/client";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import prisma from "../api/v1/prisma/prisma";

dotenv.config();

async function main() {
  await prisma.verificationToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.enterprise.deleteMany();
  const enterprise = await prisma.enterprise.create({
    data: {
      name: "Freeman Inc",
    },
  });

  const hashedAdminPassword = await bcrypt.hash("123456", 10);
  const hashedStaffPassword = await bcrypt.hash("123456", 10);

  await prisma.user.createMany({
    data: [
      {
        name: "Admin User",
        email: "admin@example.com",
        password: hashedAdminPassword,
        role: Role.ADMIN,
        enterpriseId: enterprise.id,
      },
      {
        name: "Staff User",
        email: "staff@example.com",
        password: hashedStaffPassword,
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
