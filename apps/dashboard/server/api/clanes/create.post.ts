import { RedisQueue } from "@org/redis"

export default defineEventHandler(async (event) => {
	const { name, guildId } = await readBody(event)

	const redis = useRedis()

	redis.enqueue(RedisQueue.BOT_TASKS, {
		type: "create_clan",
		guildId,
		name,
		leaderId: "328872376638898176",
		icon: "🍷",
		createdBy: "328872376638898176"
	})
})
