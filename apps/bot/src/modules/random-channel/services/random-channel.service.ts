import { Injectable } from "@/core/container"
import { botLogger } from "@/core/logger"
import { CommandReply } from "@/core/types"
import { RandomChannelRepository } from "../repositories/random-channel.repository"
import { CategoryChannel, ChannelType, Guild, VoiceBasedChannel } from "discord.js"

interface IConfigureInputs {
	channelIds: string | null,
	category: CategoryChannel | null,
	excludeChannels: boolean
}

const randomChannelLogger = botLogger.child("random-channel")

@Injectable(RandomChannelRepository)
export class RandomChannelService {
	constructor (private readonly repository: RandomChannelRepository) {}

	// Funciones que van directas al comando
	async configure ({
		category,
		channelIds,
		excludeChannels,
		guild }: IConfigureInputs & { guild: Guild } ): Promise<CommandReply> {
		try {
			if (!channelIds && !category) {
				return { content: "Debes proporcionar una lista de canales o una categoría." }
			}

			const channel = await guild.channels.create({
				name: "⇩ Unirse aleatoriamente",
				type: ChannelType.GuildVoice,
				parent: category ? category.id : undefined
			})
			if (!channel) {
				return { content: "No se pudo crear el canal aleatorio." }
			}
			await channel.setPosition(0)

			this.repository.saveChannel(
				{ guildId: guild.id,
					mainChannelId: channel.id,
					channelIds: channelIds ? channelIds.split(",").map((id) => id.trim()) : [],
					categoryId: category ? category.id : null,
					excludeChannels
				}
			)
			randomChannelLogger.info(`Se ha creado el canal ${channel.id}`)
			return { content: `Canales aleatorios configurados correctamente: <#${channel.id}>` }
		} catch (error) {
			randomChannelLogger.error(
				"Ha habido un error creando el canal:", error instanceof Error ? error.message : String(error)
			)
			return { content: "Ha ocurrido un error" }
		}
	}

	async remove (channel: VoiceBasedChannel, guild: Guild): Promise<CommandReply> {
		try {
			const channelDb = this.repository.findByMainChannelId(channel.id, guild.id)

			if (!channelDb) {
				return { content: "El canal no es un canal aleatorio" }
			}

			await channel.delete()
			await this.repository.deleteByMainChannelId(channel.id, guild.id)

			randomChannelLogger.info(`Se ha eliminado el canal ${channel.id}`)
			return { content: "Canal eliminado." }
		} catch (error) {
			randomChannelLogger.error(error instanceof Error ? error?.message : "Error al borrar el canal")
			return { content: "Error al intentar eliminar el canal" }
		}
	}
}

