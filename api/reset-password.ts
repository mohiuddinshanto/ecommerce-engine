import { prisma } from "./lib/prisma.js";
import bcrypt from "bcryptjs";
import readline from "node:readline";

const args = process.argv.slice(2);
const email = (args[0] && !args[0].startsWith("--") ? args[0] : "").trim().toLowerCase();
const nameIndex = args.indexOf("--name");
const name = (nameIndex !== -1 && args[nameIndex + 1] ? args[nameIndex + 1] : "Store Admin").trim();

function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Suppress the echoed characters while keeping the prompt itself visible.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    process.stdout.write(query);
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function resolvePassword(): Promise<string> {
  if (process.env.ADMIN_RESET_PASSWORD) return process.env.ADMIN_RESET_PASSWORD;
  if (!process.stdin.isTTY) return "";
  return promptHidden("New password (hidden): ");
}

function usage() {
  console.log("Usage: reset-password <email> [--name \"Full Name\"]");
  console.log("  Password is read from the ADMIN_RESET_PASSWORD env var or a hidden prompt.");
  console.log("  It is intentionally NOT accepted as a command argument (shell history / process list leaks).");
  console.log("  Example:  $env:ADMIN_RESET_PASSWORD='MyPass123'; tsx api/reset-password.ts admin@shop.com --name \"Muhiuddin\"");
}

async function main() {
  if (!email) {
    usage();
    process.exitCode = 1;
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    console.error(`Invalid email: ${email}`);
    process.exitCode = 1;
    return;
  }
  const password = await resolvePassword();
  if (!password) {
    console.error("No password provided. Set ADMIN_RESET_PASSWORD or run interactively.");
    usage();
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, role: "ADMIN", name },
        select: { id: true, email: true, role: true },
      })
    : await prisma.user.create({
        data: { email, passwordHash, role: "ADMIN", name },
        select: { id: true, email: true, role: true },
      });

  if (existing) {
    console.log(`Password reset for existing user (${existing.role} -> ADMIN): ${user.email}`);
  } else {
    console.log(`Admin created: ${user.email}  role=${user.role}`);
  }
  console.log(`  name:     ${name}`);
  console.log("Log in at /admin with this password.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
