import crypto from "node:crypto";

export const generateRandomPassword = (length = 10): string => {
	const charset =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!";
	let password = "";
	for (let i = 0; i < length; i++) {
		const randomIndex = crypto.randomInt(0, charset.length);
		password += charset[randomIndex];
	}
	return password;
};
