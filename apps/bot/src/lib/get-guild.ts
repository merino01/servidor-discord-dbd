import { BotClient } from "@/core/bot-client"
import { getConfig } from "@/core/config"

const config = getConfig()

/**
 * Obtiene la guild configurada en el bot
 */
export const getGuild = (client: BotClient) => client.guilds.cache.get(config.discord.guildId)
