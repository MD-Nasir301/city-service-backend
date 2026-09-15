import bcrypt from "bcryptjs";
import { Role, CategoryType } from "../../generated/prisma/enums"; // আপনার Prisma Enum Import এর সঠিক পাথ
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

// Create tester admin
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

// Create tester staff
export const seedTesterStaff = async () => {
  try {
    const isTesterStaffExist = await prisma.user.findUnique({
      where: {
        email: config.tester_staff_email,
      },
    });

    if (isTesterStaffExist) {
      console.log("Tester Staff Already Exists!");
      return;
    }

    const name = config.tester_staff_name;
    const email = config.tester_staff_email;
    const password = config.tester_staff_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Staff Name, Email, Password Missing In Env File!!!"
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds)
    );

    const testerStaff = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.STAFF,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Tester Staff Created : ", testerStaff);
  } catch (error) {
    console.log("Error Seeding Tester Staff : ", error);
  }
};


export const seedCategories = async () => {
  try {
    const categories = [
      // FREE SERVICES
      {
        name: "Waste Management",
        description: "Report uncollected garbage, overflowed dustbins, or illegal dumping.",
        type: CategoryType.FREE,
        basePrice: 0,
        unitName: null,
      },
      {
        name: "Street Lighting",
        description: "Report broken, damaged, or unfunctional street lights.",
        type: CategoryType.FREE,
        basePrice: 0,
        unitName: null,
      },
      {
        name: "Road Repair & Footpaths",
        description: "Report potholes, broken pavements, or hazardous road damage.",
        type: CategoryType.FREE,
        basePrice: 0,
        unitName: null,
      },
      {
        name: "Drainage & Sewerage",
        description: "Report blocked drains, waterlogging, or overflowing manholes.",
        type: CategoryType.FREE,
        basePrice: 0,
        unitName: null,
      },
      {
        name: "Public Park & Tree Trimming",
        description: "Report hazardous tree branches on public roads or park maintenance needs.",
        type: CategoryType.FREE,
        basePrice: 0,
        unitName: null,
      },

      // PAID SERVICES
      {
        name: "Private Waste Removal",
        description: "Hire dedicated city staff for bulk construction waste or private debris removal.",
        type: CategoryType.PAID,
        basePrice: 1200.0,
        unitName: "Per Truck",
      },
      {
        name: "Private Drain Unblocking",
        description: "Request specialized staff and equipment for private property drainage cleanout.",
        type: CategoryType.PAID,
        basePrice: 800.0,
        unitName: "Per Service",
      },
      {
        name: "Private Tree Pruning",
        description: "Hire municipal staff for safe cutting or pruning of private garden trees.",
        type: CategoryType.PAID,
        basePrice: 500.0,
        unitName: "Per Tree",
      },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    console.log("Categories seeded successfully!");
  } catch (error) {
    console.error("Error Seeding Categories:", error);
  }
};