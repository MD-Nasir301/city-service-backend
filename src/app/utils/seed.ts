import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
  try {
    // 1. Check if Super Admin already exists
    const isSuperAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (isSuperAdminExist) {
      console.log("Super admin already exists!");
      return;
    }

    // 2. Validate environment variables
    const name = config.super_admin_name;
    const email = config.super_admin_email;
    const password = config.super_admin_password;

    if (!email || !password || !name) {
      console.log("Super admin credentials missing in config!");
      return;
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds) || 10,
    );

    // 4. Create Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Super admin created successfully:", superAdmin.id);
  } catch (error) {
    console.error("Error Seeding Super Admin:", error);
  }
};

//create tester admin

export const seedTesterAdmin = async () => {
  try {
    const isTesterAdminExist = await prisma.user.findUnique({
      where: {
        email: config.tester_admin_email,
      },
    });

    if (isTesterAdminExist) {
      console.log("Tester Admin Already Exists!");
      return;
    }

    const name = config.tester_admin_name;
    const email = config.tester_admin_email;
    const password = config.tester_admin_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Admin Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const testerAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Tester Admin Created : ", testerAdmin);
  } catch (error) {
    console.log("Error Seeding Tester Admin : ", error);
  }
};
