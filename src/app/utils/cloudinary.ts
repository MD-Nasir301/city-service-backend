
// src/app/utils/cloudinary.ts
import { cloudinary } from "../lib/cloudinary";
import { ICloudinaryResponse } from "../modules/user/users.interface";

export const uploadToCloudinary = (
  file: Express.Multer.File,
  folderName: string = "city_complaint_users"
): Promise<ICloudinaryResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as ICloudinaryResponse);
      }
    );
    uploadStream.end(file.buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
};