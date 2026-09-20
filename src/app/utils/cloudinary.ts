import { cloudinary } from "../lib/cloudinary";
import type { ICloudinaryResponse } from "../modules/user/users.interface";

export const uploadToCloudinary = (
	file: Express.Multer.File,
	folderName: string = "city_complaint_users",
): Promise<ICloudinaryResponse> => {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{ folder: folderName },
			(error, result) => {
				if (error) return reject(error);
				resolve(result as ICloudinaryResponse);
			},
		);
		uploadStream.end(file.buffer);
	});
};

export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader.destroy(publicId, (error, result) => {
			if (error) return reject(error);
			resolve(result);
		});
	});
};
