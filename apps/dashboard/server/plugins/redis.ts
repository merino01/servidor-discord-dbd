import { RedisClient } from "@org/redis"

export default defineNitroPlugin(async (nitroApp) => {
	nitroApp.redis = await RedisClient.create()
})
