import { Injectable } from "@/core/container"
import { CommandContext, CommandReply } from "@/core/types"
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	Message,
	MessageFlags,
	User
} from "discord.js"
import { ClanRepository } from "../repositories/clan.repository"
import { buildErrorEmbed } from "@/modules/echo/utils/embed"
import { buildMemberEmbed, buildSuccessEmbed } from "../utils/embeds"
import { botLogger } from "@/core/logger"
import { IClan, IClanInvitation } from "@org/mongo"
import { chunkArray, MembersExtraData } from "../utils/members"

const clanLogger = botLogger.child("clanes")

@Injectable(ClanRepository)
export class ClanService {
	constructor (private readonly repository: ClanRepository) {}

	// Función directa al comando
	async leave (user: User, guildId: string): Promise<CommandReply> {
		const clan = await this.repository.getClanByMember(guildId, user.id)

		if (!clan) {
			return{ embeds: [buildErrorEmbed("No perteneces a ningún clan.")] }
		}

		const result = await this.repository.removeMember(
			clan._id.toString(),
			user.id,
			user.id,
			false
		)

		if (result.success) {
			const embed = buildSuccessEmbed(
				"Has salido del clan",
				`Has abandonado el clan **${clan.name}**.`
			)
			return { embeds: [embed] }
		} else {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}
	}

	private async sendInvitationDM (
		targetUser: User,
		clan: IClan,
		userId: string,
		invitation: IClanInvitation
	): Promise<void> {
		try {
			const dmEmbed = new EmbedBuilder()
				.setColor(0x5865f2)
				.setTitle("📨 Invitación a clan")
				.setDescription(
					`Has sido invitado a unirte al clan **${clan.name}** ${clan.icon}\n\n` +
						`Invitado por: <@${userId}>\n` +
						`Expira: <t:${Math.floor(invitation.expiresAt.getTime() / 1000)}:R>\n\n` +
						"Usa los botones de abajo para responder a la invitación."
				)
				.setTimestamp()

			const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`clan_invitation_accept_${invitation._id.toString()}`)
					.setLabel("Aceptar")
					.setStyle(ButtonStyle.Success)
					.setEmoji("✅"),
				new ButtonBuilder()
					.setCustomId(`clan_invitation_reject_${invitation._id.toString()}`)
					.setLabel("Rechazar")
					.setStyle(ButtonStyle.Danger)
					.setEmoji("❌")
			)

			await targetUser.send({ embeds: [dmEmbed], components: [buttons] })
		} catch (error) {
			clanLogger.error(
				`Error enviando DM a ${targetUser.id}: `, error instanceof Error ? error.message : String(error)
			)
			throw new Error(
				"No se pudo enviar la invitación por DM. " +
					"El usuario podría tener los DMs desactivados."
			)
		}
	}

	private async handleInvitationResult (params: {
			result: { success: boolean; invitation?: IClanInvitation; error?: string }
			targetUser: User
			clan: IClan
			userId: string
		}): Promise<CommandReply> {
		const { result, targetUser, clan, userId } = params
		if (result.success && result.invitation) {
			try {
				await this.sendInvitationDM(targetUser, clan, userId, result.invitation)
			} catch (error) {
				await this.repository.cancelInvitation(result.invitation._id.toString())
				return { embeds: [buildErrorEmbed((error as Error).message)] }
			}
			const embed = buildSuccessEmbed(
				"Invitación enviada",
				`Se ha enviado una invitación a **${targetUser.username}** para unirse al clan **${clan.name}**.`
			)
			return { embeds: [embed] }
		} else {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}
	}

	// Función directa al comando
	async inviteUser (targetUser: User, user: User, guildId: string): Promise<CommandReply> {
		 if (targetUser.bot) {
			const errorMsg = "No puedes invitar a un bot."
			return { embeds: [buildErrorEmbed(errorMsg)] }
		}

		const clan = await this.repository.getClanByMember(guildId, user.id)

		if (!clan || !clan.leaderIds.includes(user.id)) {
			const errorMsg = !clan
				? "No perteneces a ningún clan."
				: "Solo los líderes pueden invitar miembros."
			return { embeds: [buildErrorEmbed(errorMsg)] }
		}

		const result = await this.repository.createInvitation({
			clanId: clan._id.toString(),
			userId: targetUser.id,
			invitedBy: user.id
		})

		const reply = await this.handleInvitationResult({ result,  targetUser, clan, userId: user.id })
		return reply
	}

	private async validateKickPermissions (
		clan: IClan | null,
		userId: string,
		targetUser: User
	): Promise<string | null> {
		if (!clan || !clan.leaderIds.includes(userId)) {
			return !clan ? "No perteneces a ningún clan." : "Solo los líderes pueden expulsar miembros."
		}

		if (clan.leaderIds.includes(targetUser.id)) {
			return "No puedes expulsar a un líder del clan."
		}

		if (!clan.members.includes(targetUser.id)) {
			return "Ese usuario no es miembro del clan."
		}

		return null
	}

	// Función directa al comando
	async kickUser (targetUser: User, user: User, guildId: string): Promise<CommandReply> {
		const clan = await this.repository.getClanByMember(guildId, user.id)
		const validationError = await this.validateKickPermissions(clan, user.id, targetUser)

		if (validationError || !clan) {
			return {
				embeds: [buildErrorEmbed(validationError || "Error validando permisos")] }
		}

		const result = await this.repository.removeMember(
			clan._id.toString(),
			targetUser.id,
			user.id,
			true
		)

		if (result.success) {
			const embed = buildSuccessEmbed(
				"Miembro expulsado",
				`**${targetUser.username}** ha sido expulsado del clan **${clan.name}**.`
			)
			return { embeds: [embed] }
		} else {
			return { embeds: [buildErrorEmbed(result.error || "Error desconocido")] }
		}
	}

	// Funación directa al comando
	async getClanInfo (guildId: string, userId: string): Promise<CommandReply> {
		const clan = await this.repository.getClanByMember(guildId, userId)

		if (!clan) {
			return {
				embeds: [buildErrorEmbed("No perteneces a ningún clan.")]
			}
		}

		if (!clan.leaderIds.includes(userId)) {
			return {
				embeds: [buildErrorEmbed("Solo los líderes pueden ver la información detallada.")]
			}
		}

		const leadersText = clan.leaderIds.map((id) => `<@${id}>`).join(", ")
		const membersCount = clan.members.length
		const textChannels = clan.textChannelIds.map((id) => `<#${id}>`).join(", ") || "Ninguno"
		const voiceChannels = clan.voiceChannelIds.map((id) => `<#${id}>`).join(", ") || "Ninguno"
		const createdAt = `<t:${Math.floor(clan.createdAt.getTime() / 1000)}:F>`

		const embed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle(`${clan.icon} Información de ${clan.name}`)
			.addFields(
				{ name: "👑 Líderes", value: leadersText, inline: false },
				{ name: "👥 Miembros", value: `${membersCount} miembros`, inline: true },
				{ name: "📅 Creado", value: createdAt, inline: true },
				{ name: "💬 Canales de texto", value: textChannels, inline: false },
				{ name: "🔊 Canales de voz", value: voiceChannels, inline: false }
			)
			.setTimestamp()

		return { embeds: [embed] }
	}

	private buildMemberList (clan: IClan): string[] {
		return clan.members.map((memberId: string) => {
			const isLeader = clan.leaderIds.includes(memberId)
			const badge = isLeader ? "👑" : "👤"
			return `${badge} <@${memberId}>`
		})
	}

	private buildPaginationButtons (page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("prev_page")
				.setLabel("◀ Anterior")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === 0),
			new ButtonBuilder()
				.setCustomId("next_page")
				.setLabel("Siguiente ▶")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(page === totalPages - 1)
		)
	}

	// Función directa al comando
	async getClanMembersByUserId (userId: string, guildId: string): Promise<CommandReply<MembersExtraData>> {
		const clan = await this.repository.getClanByMember(guildId, userId)

		if (!clan || !clan.leaderIds.includes(userId)) {
			const errorMsg = !clan
				? "No perteneces a ningún clan."
				: "Solo los líderes pueden ver la lista de miembros."
			return { embeds: [buildErrorEmbed(errorMsg)] }
		}

		const memberList = this.buildMemberList(clan)
		const chunks = chunkArray(memberList, 20)

		if (chunks.length === 0) {
			return { embeds: [buildErrorEmbed("El clan no tiene miembros.")] }
		}

		const embed = buildMemberEmbed(clan, chunks, 0)
		const buttons = this.buildPaginationButtons(0, chunks.length)

		return {
			embeds: [embed],
			components: chunks.length > 1 ? [buttons] : [], clan,
			chunks
		}
	}

	async handlePaginationCollector (params: {
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
					content: "Solo el líder que ejecutó el comando puede navegar por las páginas.",
					flags: MessageFlags.Ephemeral
				})
				return
			}

			if (buttonInteraction.customId === "prev_page") {
				currentPage = Math.max(0, currentPage - 1)
			} else if (buttonInteraction.customId === "next_page") {
				currentPage = Math.min(chunks.length - 1, currentPage + 1)
			}

			await buttonInteraction.update({
				embeds: [buildMemberEmbed(clan, chunks, currentPage)],
				components: [this.buildPaginationButtons(currentPage, chunks.length)]
			})
		})

		collector.on("end", () => {
			interaction.editReply({ components: [] }).catch(() => {
				// Ignorar errores si el mensaje ya fue eliminado
			})
		})
	}
}

