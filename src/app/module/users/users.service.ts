
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";


// Get Own Profile Details
const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User profile not found.");
  }

  return user;
};


export const UserService = {
  getMe,
};