import { BaseCommand } from "@/core/base/base-command"
import { registerCommand } from "@/core/command-register"
import { EmbedBuilder, MessageFlags, User, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js"
import { ClanService } from "../services/clan.service"
import { CommandContext } from "@/core/types"
import { IClan, IClanInvitation } from "@org/mongo"

export class ClanCommand extends BaseCommand {
	protected service = ClanService.getInstance()
	private buildSuccessEmbed (title: string, description: string): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0x00ff00)
			.setTitle(`✅ ${title}`)
			.setDescription(description)
			.setTimestamp()
	}

	private buildErrorEmbed (error: string): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("❌ Error")
			.setDescription(error)
			.setTimestamp()
	}

	async salir (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const userId = interaction.user.id
		const guildId = interaction.guild.id
		const clan = await this.service.getClanByMember(guildId, userId)

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No perteneces a ningún clan.")]
			})
			return
		}

		const result = await this.service.removeMember(
			clan._id.toString(),
			userId,
			userId,
			false
		)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Has salido del clan",
				`Has abandonado el clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
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
				.setTitle("📨 Invitación a Clan")
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
			console.error("Error enviando DM:", error)
		}
	}

	private async handleInvitationResult (params: {
		interaction: CommandContext["interaction"]
		result: { success: boolean; invitation?: IClanInvitation; error?: string }
		targetUser: User
		clan: IClan
		userId: string
	}): Promise<void> {
		const { interaction, result, targetUser, clan, userId } = params
		if (result.success && result.invitation) {
			await this.sendInvitationDM(targetUser, clan, userId, result.invitation)
			const embed = this.buildSuccessEmbed(
				"Invitación enviada",
				`Se ha enviado una invitación a **${targetUser.username}** para unirse al clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async invitar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const userId = interaction.user.id
		const guildId = interaction.guild.id
		const targetUser = interaction.options.getUser("usuario")

		if (!targetUser || targetUser.bot) {
			const errorMsg = !targetUser ? "Debes especificar un usuario." : "No puedes invitar a un bot."
			await interaction.editReply({ embeds: [this.buildErrorEmbed(errorMsg)] })
			return
		}

		const clan = await this.service.getClanByMember(guildId, userId)

		if (!clan || !clan.leaderIds.includes(userId)) {
			const errorMsg = !clan
				? "No perteneces a ningún clan."
				: "Solo los líderes pueden invitar miembros."
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(errorMsg)]
			})
			return
		}

		const result = await this.service.createInvitation({
			clanId: clan._id.toString(),
			userId: targetUser.id,
			invitedBy: userId
		})

		await this.handleInvitationResult({ interaction, result, targetUser, clan, userId })
	}

	private async validateKickPermissions (
		interaction: CommandContext["interaction"],
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

	async expulsar (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral })

		const userId = interaction.user.id
		const guildId = interaction.guild.id
		const targetUser = interaction.options.getUser("usuario")

		if (!targetUser) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Debes especificar un usuario.")]
			})
			return
		}

		const clan = await this.service.getClanByMember(guildId, userId)
		const validationError = await this.validateKickPermissions(interaction, clan, userId, targetUser)

		if (validationError || !clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(validationError || "Error validando permisos")]
			})
			return
		}

		const result = await this.service.removeMember(
			clan._id.toString(),
			targetUser.id,
			userId,
			true
		)

		if (result.success) {
			const embed = this.buildSuccessEmbed(
				"Miembro expulsado",
				`**${targetUser.username}** ha sido expulsado del clan **${clan.name}**.`
			)
			await interaction.editReply({ embeds: [embed] })
		} else {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(result.error || "Error desconocido")]
			})
		}
	}

	async info (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply()

		const userId = interaction.user.id
		const guildId = interaction.guild.id

		const clan = await this.service.getClanByMember(guildId, userId)

		if (!clan) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("No perteneces a ningún clan.")]
			})
			return
		}

		if (!clan.leaderIds.includes(userId)) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("Solo los líderes pueden ver la información detallada.")]
			})
			return
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

		await interaction.editReply({ embeds: [embed] })
	}

	private buildMemberList (clan: IClan): string[] {
		return clan.members.map((memberId: string) => {
			const isLeader = clan.leaderIds.includes(memberId)
			const badge = isLeader ? "👑" : "👤"
			return `${badge} <@${memberId}>`
		})
	}

	private chunkArray<T> (array: T[], size: number): T[][] {
		const chunks: T[][] = []
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size))
		}
		return chunks
	}

	async miembros (context: CommandContext): Promise<void> {
		const { interaction } = context

		if (!interaction.guild) {
			await interaction.reply({
				embeds: [this.buildErrorEmbed("Este comando solo puede usarse en un servidor.")],
				flags: MessageFlags.Ephemeral
			})
			return
		}

		await interaction.deferReply()

		const userId = interaction.user.id
		const guildId = interaction.guild.id
		const clan = await this.service.getClanByMember(guildId, userId)

		if (!clan || !clan.leaderIds.includes(userId)) {
			const errorMsg = !clan
				? "No perteneces a ningún clan."
				: "Solo los líderes pueden ver la lista de miembros."
			await interaction.editReply({
				embeds: [this.buildErrorEmbed(errorMsg)]
			})
			return
		}

		const memberList = this.buildMemberList(clan)
		const chunks = this.chunkArray(memberList, 20)

		if (chunks.length === 0) {
			await interaction.editReply({
				embeds: [this.buildErrorEmbed("El clan no tiene miembros.")]
			})
			return
		}

		const embed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle(`${clan.icon} Miembros de ${clan.name}`)
			.setDescription(chunks[0].join("\n"))
			.setFooter({ text: `Total: ${clan.members.length} miembros` })
			.setTimestamp()

		await interaction.editReply({ embeds: [embed] })

		for (let i = 1; i < chunks.length; i++) {
			const followUpEmbed = new EmbedBuilder()
				.setColor(0x5865f2)
				.setDescription(chunks[i].join("\n"))

			await interaction.followUp({ embeds: [followUpEmbed], flags: MessageFlags.Ephemeral })
		}
	}
}

registerCommand(ClanCommand, {
	name: "clan",
	description: "Gestión de clanes"
})
