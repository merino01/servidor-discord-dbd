/**
 * Registro centralizado de claves de Redis.
 * Usar siempre estas funciones en lugar de strings literales.
 *
 * @example
 *   redis.set(RedisKeys.user(userId), data, { EX: 300 })
 *   redis.del(RedisKeys.guild(guildId))
 */
export const RedisKeys = {
	// --- Usuarios ---
	user: (userId: string) => `user:${userId}`,
	userStats: (userId: string) => `user:${userId}:stats`,

	// --- Guilds ---
	guild: (guildId: string) => `guild:${guildId}`,
	guildStats: (guildId: string) => `guild:${guildId}:stats`,

	// --- Clanes ---
	clan: (clanId: string) => `clan:${clanId}`,
	clanMembers: (clanId: string) => `clan:${clanId}:members`,

	// --- Sesiones de dashboard ---
	session: (sessionId: string) => `session:${sessionId}`,

	// --- Cache de API de Discord ---
	discordUserGuilds: (userId: string) => `discord:user:${userId}:guilds`,
	discordBotGuilds: () => "discord:bot:guilds"
} as const

/**
 * Nombre de las colas de Redis.
 * Usar como primer argumento de enqueue/dequeue.
 */
export enum RedisQueue {
	/** Tareas que el dashboard envía al bot para ejecutar */
	BOT_TASKS = "queue:bot:tasks",
}

/**
 * Tipado de los mensajes de cada cola.
 */
export type QueueMessage = {
	[RedisQueue.BOT_TASKS]:
		| { type: "send_message"; channelId: string; content: string }
		| { type: "create_clan"; guildId: string; name: string; leaderId: string; icon: string; createdBy: string }
		| { type: "send_dm"; userId: string; content: string }
}
