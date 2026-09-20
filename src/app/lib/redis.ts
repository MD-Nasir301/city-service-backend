import { createClient } from "redis";
import config from "../config";

export const redisCLient = createClient({
	username: config.redis_user,
	password: config.redis_password,
	socket: {
		connectTimeout: 10000,
		host: config.redis_host,
		port: Number(config.redis_port),
	},
});
