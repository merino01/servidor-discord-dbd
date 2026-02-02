import { Events, Message } from "discord.js"
import { registerEvent } from "@/core/event-registry"
import { ClanModel } from "@org/mongo"
import { clanStatsService } from "../services/clan-stats.service"

/**
 * Listener para registrar mensajes en canales de clanes
 */
registerEvent(Events.MessageCreate, async (message: Message) => {
	// Ignorar bots y mensajes sin guild
	if (message.author.bot || !message.guild) {
		return
	}

	try {
		// Buscar si el canal pertenece a algún clan
		const clan = await ClanModel.findOne({
			guildId: message.guild.id,
			textChannelIds: message.channel.id,
			isActive: true
		})

		if (!clan) {
			return
		}

		// Verificar que el usuario sea miembro del clan
		if (!clan.members.includes(message.author.id)) {
			return
		}

		// Registrar el mensaje en las estadísticas
		await clanStatsService.registerMessage(clan._id, message.author.id)
	} catch (error) {
		console.error("Error registering clan message:", error)
	}
})
