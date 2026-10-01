import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) throw new Error("ADMIN_USERNAME / ADMIN_PASSWORD belum diisi di .env");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { username },
    update: { passwordHash, role: "ADMIN" },
    create: { username, passwordHash, role: "ADMIN" },
  });
  console.log("Akun admin siap:", username);
}
main().finally(() => db.$disconnect());
