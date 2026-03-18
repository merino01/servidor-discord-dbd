import { createClient } from "redis"
import { getConfig } from "@org/config"

const config = getConfig()

export const connectRedis = async () => {
	const redisConfig = config.databases.redis
	const redis = createClient({
		url: `redis://${redisConfig.username ? `${redisConfig.username}:${redisConfig.password}@` : ""}${redisConfig.host}:${redisConfig.port}`
	})
	await redis.connect()
	return redis
}
