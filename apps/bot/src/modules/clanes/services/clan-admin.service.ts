import { EmbedBuilder } from "discord.js"
import { CommandReply } from "@/core/types"
import { ClanRepository } from "../repositories/clan.repository"
import { Injectable } from "@/core/container"
import { botLogger } from "@/core/logger"
import { buildErrorEmbed, buildSuccessEmbed } from "@/util/embeds"

interface MigrateClanParams {
	guildId: string
	name: string
	icon: string
	leaderId: string
	createdBy: string
	roleId: string
	textChannelIds: string
	voiceChannelIds: string
	maxMembers: number
	migracion?: boolean
}

const clanLogger = botLogger.child("clanes")

@Injectable(ClanRepository)
export class ClanAdminService {
	constructor (private readonly repository: ClanRepository) {}
	// protected service = ClanRepository.getInstance()

	private buildMigrationSuccessEmbed (params: {
			icono: string
			nombre: string
			liderId: string
			rolId: string
			canalTextoId: string
			canalVozId: string
			limite: number
		}): EmbedBuilder {
		return buildSuccessEmbed(
			"Clan migrado",
			`Se ha migrado el clan **${params.icono} ${params.nombre}**\n\n` +
				`**Líder:** <@${params.liderId}>\n` +
				`**Rol:** <@&${params.rolId}>\n` +
				`**Canal de texto:** <#${params.canalTextoId}>\n` +
				`**Canal de voz:** <#${params.canalVozId}>\n` +
				`**Límite de miembros:** ${params.limite}`
		)
	}

	// Función directa al comando
	async migrate (params: MigrateClanParams): Promise<CommandReply> {
		const result = await this.repository.createClan({
			guildId: params.guildId,
			name: params.name,
			icon: params.icon,
			leaderId: params.leaderId,
			createdBy: params.createdBy,
			roleId: params.roleId,
			textChannelIds: [params.textChannelIds],
			voiceChannelIds: [params.voiceChannelIds],
			maxMembers: params.maxMembers,
			migracion: params.migracion
		})

		if (!result.success || !result.clan) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido al migrar el clan.")] }
		}

		const embed = this.buildMigrationSuccessEmbed({
			icono: params.icon,
			nombre: params.name,
			liderId: params.leaderId,
			rolId: params.roleId,
			canalTextoId: params.textChannelIds,
			canalVozId: params.voiceChannelIds,
			limite: params.maxMembers
		})

		clanLogger.info(`Clan migrado: ${params.name} (${result.clan._id}) en guild ${params.guildId}`)
		return { embeds: [embed] }
	}
}
