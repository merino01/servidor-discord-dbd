import { Injectable } from "@/core/container"
import { botLogger } from "@/core/logger"
import { CommandContext, CommandReply } from "@/core/types"
import { buildErrorEmbed } from "../utils/embeds"
import { IClan } from "@org/mongo"
import {
	ActionRowBuilder,
	APIRole,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	Guild,
	Message,
	MessageFlags,
	Role,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	User
} from "discord.js"
import { ClanRepository } from "../repositories/clan.repository"
import { buildSuccessEmbed } from "../utils/embeds"
import { chunkArray, MembersExtraData } from "../utils/members"

interface ICreateClanData {
	guildId: string
	name: string
	icon: string
	leader: User
	user: User
}

const clanLogger = botLogger.child("clanes")

@Injectable(ClanRepository)
export class ClanModService {
	constructor (private readonly repository: ClanRepository) {}

	private validateClanName (nombre: string): string | null {
		if (nombre.length < 2 || nombre.length > 32) {
			return "El nombre del clan debe tener entre 2 y 32 caracteres."
		}
		return null
	}

	private validateClanIcon (icono: string): string | null {
		const emojiRegex = /\p{Emoji}/u
		const isEmoji = emojiRegex.test(icono)

		if (!isEmoji && icono.length > 4) {
			return "El icono del clan debe ser un emoji o tener máximo 4 caracteres."
		}

		if (icono.length === 0) {
			return "Debes proporcionar un icono para el clan."
		}

		return null
	}

	// Función directa al comando
	async create ({ name, icon, leader, user, guildId }: ICreateClanData): Promise<CommandReply> {
		const nameError = this.validateClanName(name)
		if (nameError) {
			return { embeds: [buildErrorEmbed(nameError)] }
		}

		const iconError = this.validateClanIcon(icon)
		if (iconError) {
			return { embeds: [buildErrorEmbed(iconError)] }
		}

		const result = await this.repository.createClan({
			guildId,
			name,
			icon,
			leaderId: leader.id,
			createdBy: user.id
		})

		if (!result.success || !result.clan) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido al crear el clan.")] }
		}

		const embed = buildSuccessEmbed(
			"Clan creado",
			`Se ha creado el clan **${icon} ${name}**\n\n` +
			`**Líder:** <@${leader.id}>\n` +
			`**Canal de texto:** <#${result.clan.textChannelIds[0]}>\n` +
			`**Canal de voz:** <#${result.clan.voiceChannelIds[0]}>`
		)

		return { embeds: [embed] }
	}

	// Función directa al comando
	async deleteClan (guildId: string, role: Role | APIRole): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId,role.id)

		if (!clan) {
			return { embeds: [buildErrorEmbed(`No se encontró ningún clan asociado al rol ${role.name}.`)] }
		}

		const result = await this.repository.deleteClan(guildId, clan._id.toString())
		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido al eliminar el clan.")] }
		}

		const embed = buildSuccessEmbed(
			"Clan eliminado",
			`El clan **${clan.icon} ${clan.name}** ha sido eliminado correctamente.\n\n` +
			"Se han eliminado los canales y roles asociados al clan."
		)
		return { embeds: [embed] }
	}

	// Función directa al comando
	async addLeader (
		guildId: string,
		role: Role | APIRole,
		targetUser: User,
		executorId: string
	): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId, role.id)
		if (!clan) {
			return { embeds: [buildErrorEmbed(`No se encontró ningún clan asociado al rol ${role.name}.`)] }
		}

		const result = await this.repository.addLeader(clan._id.toString(), targetUser.id, executorId)
		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}
		const embed = buildSuccessEmbed(
			"Lider añadido",
			`${targetUser.tag} ahora es líder del clan **${clan.name}**.`
		)
		return { embeds: [embed] }
	}

	// Función directa al comando
	async removeLeader (
		guildId: string,
		role: Role | APIRole,
		targetUser: User,
		executorId: string
	): Promise<CommandReply>{
		const clan = await this.repository.getClanByRole(guildId, role.id)
		if (!clan) {
			return { embeds: [ buildErrorEmbed("No se encontró un clan con ese rol.")] }
		}

		const result = await this.repository.removeLeader(
			clan._id.toString(),
			targetUser.id,
			executorId
		)

		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Líder removido",
			`${targetUser.tag} ya no es líder del clan **${clan.name}**.`
		)
		return { embeds: [embed] }
	}

	// Función directa al comando
	async addMember (
		guildId: string,
		role: Role | APIRole,
		targetUser: User,
		executorId: string
	): Promise<CommandReply>{
		const clan = await this.repository.getClanByRole(guildId, role.id)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró un clan con ese rol")] }
		}

		const result = await this.repository.addMember(clan._id.toString(), targetUser.id, executorId)
		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Miembro añadido",
			`${targetUser.tag} se ha unido al clan **${clan.name}**.`
		)
		return { embeds:[embed] }
	}

	// Función directa al comando
	async kickUser (
		guildId: string,
		role: Role | APIRole,
		targetUser: User,
		executorId: string
	): Promise<CommandReply>{
		const clan = await this.repository.getClanByRole(guildId, role.id)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró un clan con ese rol")] }
		}

		const result = await this.repository.removeMember(
			clan._id.toString(),
			targetUser.id,
			executorId,
			true
		)
		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Miembro expulsado",
			`${targetUser.tag} ha sido expulsado del clan **${clan.name}**.`
		)
		return { embeds:[embed] }
	}

	// Función directa al comando
	async addChannel (guildId: string, role: Role | APIRole, executorId: string): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId, role.id)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró un clan con ese rol")] }
		}

		const result = await this.repository.addExtraVoiceChannel(
			clan._id.toString(),
			executorId
		)
		if (!result.success || !result.channelId) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const channelNumber = clan.voiceChannelIds.length + 1
		const embed = buildSuccessEmbed(
			"Canal añadido",
			`Canal de voz **${clan.icon} ${clan.name} #${channelNumber}** creado exitosamente.`
		)
		return { embeds: [embed] }
	}

	// Función directa al comando
	async removeChannel (guildId: string, role: Role | APIRole, executorId: string): Promise<CommandReply> {
		const clan = await this.repository.getClanByRole(guildId, role.id)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró un clan con ese rol")] }
		}

		const result = await this.repository.removeLastExtraVoiceChannel(
			clan._id.toString(),
			executorId
		)
		if (!result.success) {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}

		const embed = buildSuccessEmbed(
			"Canal eliminado",
			`El canal ha sido eliminado del clan **${clan.name}**.`
		)
		return { embeds:[embed] }
	}

	private buildListEmbed (clans: IClan[], verEliminados: boolean): EmbedBuilder {
		const titulo = verEliminados
			? `🗁️ Clanes eliminados (${clans.length})`
			: `📋 Clanes del servidor (${clans.length})`

		const embed = new EmbedBuilder()
			.setColor(verEliminados ? 0xff0000 : 0x0099ff)
			.setTitle(titulo)
			.setDescription("Selecciona un clan del menú para ver sus detalles")

		if (clans.length > 25) {
			embed.setFooter({ text: `Mostrando 25 de ${clans.length}` })
		}

		return embed
	}
	private buildSelectMenuOptions (clans: IClan[]): StringSelectMenuOptionBuilder[] {
		return clans.slice(0, 25).map((c) => new StringSelectMenuOptionBuilder()
			.setLabel(`${c.icon} ${c.name}`)
			.setDescription(`${c.icon} ${c.name}`)
			.setValue(c._id.toString()))
	}

	private buildSelectMenuRow (clans: IClan[]): ActionRowBuilder<StringSelectMenuBuilder> {
		const options = this.buildSelectMenuOptions(clans)
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("clan_select")
			.setPlaceholder("Selecciona un clan...")
			.addOptions(options)

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
	}

	// Función directa al comando
	async getClanInfo (guildId: string, showDeleted: boolean): Promise<CommandReply> {
		try {
			const clans = await this.repository.getAllClans(guildId, showDeleted)
			if (clans.length === 0) {
				const mensaje = showDeleted
					? "🗁️ No hay clanes eliminados en este servidor."
					: "📋 No hay clanes configurados en este servidor."
				return { content: mensaje }
			}

			const embed = this.buildListEmbed(clans, showDeleted)
			const row = this.buildSelectMenuRow(clans)

			return {
				embeds: [embed],
				components: [row]
			}
		} catch (error) {
			clanLogger.error("Error al listar clanes:", error)
			return { content: "❌ Error al listar los clanes." }
		}
	}

	private async buildMemberList (members: string[], leaders: string[], guild: Guild): Promise<string[]> {
		const memberList: string[] = []
		for (const userId of members) {
			const member = await guild.members.fetch(userId)
			if (!member) {
				continue
			}

			const badge = leaders.includes(userId) ? "👑" : "👤"
			memberList.push(`${badge} <@${member.user.id}> (${member.user.tag})`)
		}
		return memberList
	}

	private buildModMemberEmbed (clan: IClan, chunks: string[][], page: number): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle(`Miembros del clan ${clan.icon} ${clan.name}`)
			.setDescription(chunks[page].join("\n"))
			.setFooter({
				text: `Página ${page + 1}/${chunks.length} • Total: ${clan.members.length} miembros`
			})
			.setTimestamp()
	}

	private buildModPaginationButtons (page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("prev_page_mod")
				.setLabel("◀ Anterior")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === 0),
			new ButtonBuilder()
				.setCustomId("next_page_mod")
				.setLabel("Siguiente ▶")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === totalPages - 1)
		)
	}

	 async handleModPaginationCollector (params: {
			response: Message
			userId: string
			chunks: string[][]
			clan: IClan
			interaction: CommandContext["interaction"]
		}): Promise<void> {
		const { response, userId, chunks, clan, interaction } = params
		let currentPage = 0
		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 300000
		})

		collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
			if (buttonInteraction.user.id !== userId) {
				await buttonInteraction.reply({
					content: "Solo el moderador que ejecutó el comando puede navegar por las páginas.",
					flags: MessageFlags.Ephemeral
				})
				return
			}

			if (buttonInteraction.customId === "prev_page_mod") {
				currentPage = Math.max(0, currentPage - 1)
			} else if (buttonInteraction.customId === "next_page_mod") {
				currentPage = Math.min(chunks.length - 1, currentPage + 1)
			}

			await buttonInteraction.update({
				embeds: [this.buildModMemberEmbed(clan, chunks, currentPage)],
				components: [this.buildModPaginationButtons(currentPage, chunks.length)]
			})
		})

		collector.on("end", () => {
			interaction.editReply({ components: [] }).catch(() => {
				// Ignorar errores si el mensaje ya fue eliminado
			})
		})
	}

	// Función directa al comando
	async getClanMembers (guild: Guild, role: Role | APIRole): Promise<CommandReply<MembersExtraData>> {
		const clan = await this.repository.getClanByRole(guild.id, role.id)
		if (!clan) {
			return { embeds: [buildErrorEmbed("No se encontró un clan con ese rol")] }
		}

		const memberList = await this.buildMemberList(clan.members, clan.leaderIds, guild)

		const chunks = chunkArray(memberList, 20)

		if (chunks.length === 0) {
			return { embeds: [buildErrorEmbed("El clan no tiene miembros.")] }
		}

		const embed = this.buildModMemberEmbed(clan, chunks, 0)
		const buttons = this.buildModPaginationButtons(0, chunks.length)

		return {
			embeds: [embed],
			components: chunks.length > 1 ? [buttons] : [],
			chunks,
			clan
		}

	}

}
