import { ClanStatsRepository } from "../repositories/clan-stats.repository"
import { botEvents } from "@/core/events/bot-events"
import { Injectable } from "@/core/container"
import { ClanRepository } from "../repositories/clan.repository"

@Injectable(ClanRepository, ClanStatsRepository)
export class ClanMessageListener {
	constructor (
		private readonly repository: ClanRepository,
		private readonly statsRepository: ClanStatsRepository
	) {}

	register () {
		/**
	 	* Listener para registrar mensajes en canales de clanes
		*/
		botEvents.on("message:created", async (message) => {
			// Ignorar bots y mensajes sin build
			if (message.author.bot || !message.guild) {
				return
			}

			try {
				// Buscar si el canal pertenece a algún clan
				const clan = await this.repository.getClanByChannelId(message.guild.id, message.channel.id)

				if (!clan) {
					return
				}

				// Verificar que el usuario sea miembro del clan
				if (!clan.members.includes(message.author.id)) {
					return
				}

				// Registrar el mensaje en las estadísticas
				await this.statsRepository.registerMessage(clan._id, message.author.id)
			} catch (error) {
				console.error("Error registering clan message:", error)
			}
		})
	}
}
