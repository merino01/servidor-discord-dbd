import { createClient } from "redis"
import { getConfig } from "@org/config"

export const connectRedis = async () => {
	const config = getConfig()
	const redisConfig = config.databases.redis
	const auth = redisConfig.username ? `${redisConfig.username}:${redisConfig.password}@` : ""
	const redis = createClient({
		url: `redis://${auth}${redisConfig.host}:${redisConfig.port}`,
		socket: {
			reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
		}
	})
	await redis.connect()
	return redis
}
