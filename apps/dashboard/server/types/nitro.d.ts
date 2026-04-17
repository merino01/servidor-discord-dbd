import type { RedisClient } from "@org/redis"

declare module "nitropack" {
	interface NitroApp {
		redis: RedisClient
	}
}
